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
 */
function handshakePage(message: string, origin: string): NextResponse {
  const html = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Signing in…</title></head>
  <body>
    <p>Completing sign-in — this window closes itself.</p>
    <script>
      (function () {
        var message = ${toScriptLiteral(message)};
        var target = ${toScriptLiteral(origin)};
        function relay(event) {
          if (event.origin !== target) return;
          window.opener.postMessage(message, target);
          window.removeEventListener("message", relay, false);
        }
        if (!window.opener) {
          document.body.textContent =
            "Open the admin screen and use the Login button there.";
          return;
        }
        window.addEventListener("message", relay, false);
        window.opener.postMessage("authorizing:github", target);
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
