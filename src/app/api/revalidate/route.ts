import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

/**
 * ON-DEMAND REVALIDATION — the sheet tells the site it changed.
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS. Sheet figures are cached for five minutes. That is the right
 * default — it caps Google calls at roughly one per five minutes no matter how
 * much traffic arrives — but it is a long time when a treasurer has just logged
 * a gift and wants to show the page at a chapter meeting.
 *
 * A Google Apps Script trigger on the giving sheet POSTs here after an edit.
 * This clears the caches; the next visitor gets real figures. See
 * SHEET-SETUP.md for the Apps Script half, which lives outside this repo.
 *
 * ── THE FIVE-MINUTE REVALIDATE STAYS ────────────────────────────────────────
 * Deliberately belt and braces. If the Apps Script trigger is deleted at a
 * handover, hits its quota, or the script's owner loses access, the site falls
 * back to the ordinary five-minute cycle rather than freezing. Nothing here is
 * load-bearing for correctness — it only makes updates faster.
 *
 * ── WHY revalidateTag AND NOT JUST revalidatePath ───────────────────────────
 * Two caches sit between Google and a visitor: the rendered page, and the fetch
 * response in Next's Data Cache. `revalidatePath` clears only the page, so on
 * its own this route would re-render all four paths and hand each one a sheet
 * response up to five minutes old — returning `revalidated: true` while
 * changing nothing visible. The tag is the half that does the work; the paths
 * are the belt.
 *
 * ── NEXT 16 CHANGED revalidateTag's SIGNATURE ───────────────────────────────
 * It now takes a second argument, and the wrong value silently defeats this
 * whole route. See the note beside the call below before touching it.
 */

export const dynamic = "force-dynamic";

/**
 * Every route that renders sheet data.
 *
 * `/donations/give` is on this list for a non-obvious reason: it reads the
 * Wishlist tab to check that a memo detail arriving in the URL is real. Drop it
 * and a newly added wishlist row cannot be given to for five minutes.
 *
 * `/events` is NOT here — it reads the calendar, not the sheet, and a sheet
 * edit is no reason to rebuild it.
 */
const SHEET_PATHS = ["/", "/donations", "/donations/give", "/donations/donors"];

/**
 * Constant-time comparison.
 *
 * Hashed first so both sides are always 32 bytes: `timingSafeEqual` throws on
 * length mismatch, and catching that throw would itself leak the secret's
 * length. A plain `===` returns early on the first wrong byte, which leaks it
 * one character at a time to anyone patient enough to measure.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;

  // Unset is a configuration state, not an auth failure, and it must never be
  // treated as "no secret required".
  if (!expected) {
    return NextResponse.json(
      { error: "REVALIDATE_SECRET is not set on this deployment." },
      { status: 503 },
    );
  }

  /*
   * A HEADER, NOT A QUERY PARAMETER.
   *
   * A secret in a query string is written to server access logs, CDN logs and
   * browser history, and leaks through the Referer header. None of that is
   * true of a request header. Apps Script sends headers happily, so there is
   * no reason to accept the weaker form.
   */
  const provided = request.headers.get("x-revalidate-secret") ?? "";
  if (!secretMatches(provided, expected)) {
    // No detail. A 401 that explains itself is a 401 that helps guessers.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /*
   * `{ expire: 0 }` IS THE WHOLE POINT — DO NOT CHANGE IT TO "max".
   *
   * The second argument says how long stale content may still be served after
   * the tag is marked. Next's recommended `"max"` gives a one-year window, so
   * the next request is handed the OLD figures while the refresh runs behind
   * it. That is stale-while-revalidate — which is precisely the behaviour this
   * endpoint exists to escape. Shipping `"max"` here would reproduce the
   * original complaint: edit the sheet, load the page, still see yesterday's
   * total, refresh again to see the truth.
   *
   * `{ expire: 0 }` refuses to serve stale, so the next request blocks until
   * Google answers. That request pays for it — well under a second normally,
   * and bounded at ten by FETCH_TIMEOUT_MS in sheets.ts — and it is the right
   * trade when a treasurer has just logged a gift and is about to show the
   * page to a room.
   *
   * `updateTag` would be the more direct tool, but it is Server-Actions-only;
   * Next's own docs send webhooks calling a Route Handler here instead.
   */
  revalidateTag("sheets", { expire: 0 });

  // The tag clears the Google responses; these clear the rendered pages.
  // Both are needed — see the header comment.
  for (const path of SHEET_PATHS) revalidatePath(path);

  return NextResponse.json({ revalidated: true, paths: SHEET_PATHS });
}

/**
 * Anything other than POST.
 *
 * Answering GET would mean a secret could travel in a URL that someone pastes
 * into a browser, a chat, or a bug report. Refusing the method outright is the
 * only way to keep that from being possible by accident.
 */
export function GET() {
  return NextResponse.json(
    { error: "POST only, with an x-revalidate-secret header." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
