import { NextResponse, type NextRequest } from "next/server";

/**
 * DECAP CMS — OAuth step 2 of 2: trade GitHub's code for a token.
 * ---------------------------------------------------------------------------
 * GitHub sends the officer back here after they approve. This exchanges the
 * one-time code for an access token and hands it to the CMS window that opened
 * the popup, using the message format Decap listens for.
 *
 * THE TOKEN NEVER TOUCHES THIS SERVER'S STORAGE. It is passed straight to the
 * browser tab that asked for it and lives in that tab's session. Nothing is
 * written to disk, so there is no store of chapter credentials to leak, and no
 * secret for a future officer to rotate beyond the OAuth app itself.
 *
 * See ../auth/route.ts for why this handler exists at all.
 */

export const dynamic = "force-dynamic";

const STATE_COOKIE = "decap_oauth_state";

/**
 * Embeds a value in an inline <script> safely.
 *
 * JSON.stringify alone is not enough: the sequence `</script>` inside a string
 * still closes the tag and everything after it becomes markup. Escaping `<`
 * (and the line separators older parsers choke on) closes that hole. The token
 * passes through here, so this is the one piece of escaping that matters.
 */
function toScriptLiteral(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/[\u2028\u2029]/g, (c) =>
      c === "\u2028" ? "\\u2028" : "\\u2029",
    );
}

/**
 * The handshake Decap expects.
 *
 * The CMS opens this route in a popup and waits. The popup announces itself,
 * the opener replies, and only then is the token posted across.
 *
 * The common templates for this post to "*" — any origin — which means any page
 * that managed to open this popup could read the token. /admin is served from
 * this same deployment, so the opener is always same-origin and the target can
 * be pinned to this exact origin instead. Deliberately stricter than the
 * reference implementations.
 *
 * ── THE FAILURE THIS PINNING CAUSES, AND WHY THE TIMEOUT IS HERE ────────────
 * A postMessage to the wrong origin is DROPPED SILENTLY. No error, no
 * rejection, nothing in the console — the popup simply waits forever. So when
 * the opener is not on this origin, the officer sees "Completing sign-in"
 * and nothing else, which reads as a hung server rather than a misconfiguration.
 *
 * That happens whenever `base_url` in public/admin/config.yml and the origin
 * actually being browsed disagree. Two ways to get there, and the second is
 * scheduled:
 *   1. Opening /admin on localhost while base_url points at the deployment.
 *      Expected — local editing is meant to use `local_backend` and
 *      `npx decap-server`, which does not involve GitHub at all.
 *   2. AT DNS CUTOVER, if base_url moves to the new domain without the matching
 *      Redirect URI being added to the GitHub OAuth app, or the reverse. That
 *      breaks publishing for every officer at once, silently.
 *
 * Hence the timeout below. It cannot fix either case, but it names them, which
 * is the difference between a five-minute fix and a lost afternoon.
 */
const STALLED_MESSAGE =
  "Sign-in did not complete. The admin screen that opened this window is on a " +
  "different address than this one, so the browser blocked the reply. Check that " +
  "base_url in public/admin/config.yml is the address you are actually browsing, " +
  "and that the same address is registered as the Redirect URI on the GitHub " +
  "OAuth app. To edit the site on your own machine, run npx decap-server instead " +
  "— local editing does not use GitHub sign-in.";

function handshakePage(message: string, origin: string): NextResponse {
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Signing in…</title></head>
  <body>
    <p id="status">Completing sign-in — this window closes itself.</p>
    <script>
      (function () {
        var message = ${toScriptLiteral(message)};
        var target = ${toScriptLiteral(origin)};
        var stalled = ${toScriptLiteral(STALLED_MESSAGE)};
        var answered = false;
        function relay(event) {
          if (event.origin !== target) return;
          answered = true;
          window.opener.postMessage(message, target);
          window.removeEventListener("message", relay, false);
        }
        if (!window.opener) {
          document.getElementById("status").textContent =
            "Open the admin screen and use the Login button there.";
          return;
        }
        window.addEventListener("message", relay, false);
        window.opener.postMessage("authorizing:github", target);
        // The admin replies in milliseconds when the origins agree. Ten seconds
        // is long enough that a slow network never trips this, and short enough
        // that nobody sits staring at a sentence that will never change.
        window.setTimeout(function () {
          if (answered) return;
          document.getElementById("status").textContent = stalled;
        }, 10000);
      })();
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // This page carries a credential — never let it sit in a shared cache.
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);

  const fail = (reason: string) => {
    const response = handshakePage(
      `authorization:github:error:${JSON.stringify({ message: reason })}`,
      origin,
    );
    response.cookies.delete(STATE_COOKIE);
    return response;
  };

  const clientId = process.env.GITHUB_OAUTH_ID;
  const clientSecret = process.env.GITHUB_OAUTH_SECRET;
  if (!clientId || !clientSecret) return fail("GitHub sign-in is not configured.");

  // The officer clicked Cancel on GitHub's approval screen.
  if (searchParams.get("error")) {
    return fail(searchParams.get("error_description") || "Sign-in was cancelled.");
  }

  const code = searchParams.get("code");
  if (!code) return fail("GitHub did not return an authorization code.");

  /*
   * Both halves of the CSRF check must be present AND equal. A missing cookie
   * is treated as a failure rather than skipped — otherwise stripping the
   * cookie is enough to bypass the check entirely.
   */
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  const received = searchParams.get("state");
  if (!expected || !received || expected !== received) {
    return fail("Sign-in could not be verified. Start again from the admin screen.");
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${origin}/api/callback`,
      }),
      cache: "no-store",
    });

    const data = (await tokenResponse.json()) as {
      access_token?: string;
      error_description?: string;
      error?: string;
    };

    if (!data.access_token) {
      // GitHub's own wording is more useful than anything invented here.
      return fail(data.error_description || data.error || "GitHub did not issue a token.");
    }

    const response = handshakePage(
      `authorization:github:success:${JSON.stringify({
        token: data.access_token,
        provider: "github",
      })}`,
      origin,
    );
    // One login, one state value. Spent immediately.
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch {
    // Never surface the raw error — it can carry the request, secret included.
    return fail("Could not reach GitHub to complete sign-in. Try again in a moment.");
  }
}
