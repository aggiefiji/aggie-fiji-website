"use client";

import Link from "next/link";
import { useState } from "react";
import type { ResolvedMemo } from "@/lib/memo";
import { Tooltip } from "@/components/Tooltip";

/**
 * The memo instruction on the Give page.
 *
 * Carries across whatever the donor pressed Give on, so the line is already
 * correct before they read it. See src/lib/memo.ts for why the memo matters
 * more here than on a site with a payment processor: it is the only thing that
 * tells the treasurer where the money goes.
 *
 * ── NO FUND PICKER ──────────────────────────────────────────────────────────
 * There was briefly a "giving to something else?" disclosure here for donors
 * who arrived from the top nav rather than a Give button. It was removed: the
 * Giving page already puts a Give button beside every item, tier and fund, so
 * a second way to choose meant two places to keep in step and a control that
 * looked like it submitted something when it only rewrote text. The step
 * heading tells a direct visitor where the default goes and where to pick
 * something specific instead.
 *
 * Client-side only for the copy button. The memo itself is server-rendered, so
 * it is on the page with JavaScript off — copying just becomes manual.
 */
export function GiveMemo({ resolved }: { resolved: ResolvedMemo }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(resolved.memo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, permissions). The memo is on
      // screen and selectable, so there is nothing to recover — just don't
      // claim it copied.
      setCopied(false);
    }
  }

  return (
    <div className="rounded-sm bg-purple-900 p-6 text-cream sm:p-8">
      <p className="text-lg leading-relaxed">
        <strong className="font-semibold">Your memo:</strong>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {/* Underlined — the one thing on this page that has to be copied
            exactly. Serif and oversized so it reads as a quotation of what to
            type rather than as more instruction. */}
        <p className="font-serif text-2xl underline decoration-salmon-400 decoration-2 underline-offset-8 sm:text-3xl">
          {resolved.memo}
        </p>
        <Tooltip label="Copies the memo so you can paste it into Venmo, Zelle, or a cheque">
          <button
            type="button"
            onClick={copy}
            className="rounded-sm border-2 border-cream/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-cream hover:text-purple-900"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </Tooltip>
      </div>

      {/*
        The way out, for a donor who realises this is not what they meant.

        Shown to everyone rather than only to those who chose something
        specific: a visitor who arrived on the default has the same question,
        and the wording answers it either way.

        Nothing needs resetting when they follow it. The memo is derived from
        the URL on the server, not held in state here, so leaving this page
        discards it — and pressing a different Give button arrives with a fresh
        one. A visitor who comes back without pressing anything gets the
        General default, which is the behaviour this link promises.
      */}
      <p className="mt-4 text-sm text-cream/75">
        Selected the wrong option?{" "}
        <Link href="/donations" className="underline underline-offset-4 hover:text-cream">
          Go back to the giving page
        </Link>
      </p>
    </div>
  );
}
