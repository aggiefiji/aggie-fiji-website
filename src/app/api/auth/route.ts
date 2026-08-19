import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * DECAP CMS — OAuth step 1 of 2: send the officer to GitHub.
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS. Decap's usual login is Netlify Identity + Git Gateway. Both
 * are deprecated, and both are Netlify-only — this site deploys to Vercel, so
 * that route was never available anyway. Decap's own guidance for hosts other
 * than Netlify is to run a small OAuth handler yourself. This is it: two routes,
 * no vendor account, living in the same deployment as the site.
 *
 * The alternative was DecapBridge, whose free tier caps at under ten users —
 * the chapter has eight officers, so it would have launched a hair under a
 * ceiling someone else controls, plus an account to hand over every year.
 *
 * WHAT AN OFFICER SEES. They click "Login with GitHub" at /admin, approve once,
 * and land back in the CMS. Only brothers with write access to the site repo
 * can get in — GitHub does the permission check, and removing someone at
 * handover is removing them as a collaborator. There is no password for this
 * site to store, lose, or leak.
 *
 * SETUP (once, at launch — see README):
 *   1. GitHub → Settings → Developer settings → OAuth Apps → New.
 *      Authorization callback URL: https://aggiefiji.com/api/callback
 *   2. Put the client ID and secret in Vercel's environment variables as
 *      GITHUB_OAUTH_ID and GITHUB_OAUTH_SECRET. Not in .env.local — that file
 *      is gitignored and never deployed.
 *   3. Set `repo` in public/admin/config.yml to the chapter's repo.
 *
 * If the variables are missing the route answers 503 with an explanation
 * rather than redirecting into a broken GitHub screen. Nothing else on the
 * site depends on this working; /admin failing never touches the public pages.
 */

// Reads a cookie and a query string, so it can never be prerendered.
export const dynamic = "force-dynamic";

/**
 * CSRF guard. A random value goes out with the redirect and comes back on the
 * callback; the copy kept here is httpOnly so page scripts cannot read it.
 * Without this an attacker can hand an officer a pre-baked callback URL and
 * complete a login as themselves. Plenty of copy-paste OAuth handlers skip it.
 */
export const STATE_COOKIE = "decap_oauth_state";

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_OAUTH_ID;

  if (!clientId) {
    return new NextResponse(
      "GitHub sign-in is not configured for this deployment. Set GITHUB_OAUTH_ID " +
        "and GITHUB_OAUTH_SECRET in the hosting environment. The public site is unaffected.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const { origin } = new URL(request.url);
  const state = randomBytes(32).toString("hex");

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", `${origin}/api/callback`);
  /*
   * `repo` is what Decap needs to commit content back. It is broad — it covers
   * private repositories too — but GitHub has no narrower scope that still
   * allows writes to a private repo. If the chapter repo is public, narrow this
   * to `public_repo` by setting GITHUB_OAUTH_SCOPE, and the token an officer
   * carries can no longer touch anything private they own.
   */
  authorize.searchParams.set("scope", process.env.GITHUB_OAUTH_SCOPE || "repo");
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize.toString());
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the redirect back from github.com
    path: "/",
    maxAge: 600, // ten minutes is far longer than a login takes
  });

  return response;
}
