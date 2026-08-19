import { CrestRule } from "@/components/ui";

/** Standard page masthead. Mobile-first: type scales, nothing is fixed-width. */
export function PageHero({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-purple-800 text-cream">
      {/* Monogram watermark — the chapter's own mark, not stock decoration. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-10 hidden h-[130%] w-[45%] bg-contain bg-right bg-no-repeat opacity-[0.07] sm:block"
        style={{ backgroundImage: "url(/brand/fiji-monogram.png)" }}
      />
      <div className="container-page relative py-12 sm:py-20">
        {eyebrow ? <p className="eyebrow text-salmon-400">{eyebrow}</p> : null}
        <h1 className="mt-3 max-w-3xl text-4xl leading-[1.08] sm:text-5xl lg:text-6xl">{title}</h1>
        <CrestRule className="mt-6 max-w-24 text-cream" />
        {intro ? <p className="mt-6 max-w-2xl text-lg text-cream/85 sm:text-xl">{intro}</p> : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </div>
  );
}
