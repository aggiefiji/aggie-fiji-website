import Link from "next/link";
import { baseNav } from "@/lib/nav";
import { ButtonLink, Section } from "@/components/ui";

export default function NotFound() {
  return (
    <Section>
      <p className="eyebrow text-salmon-600">404</p>
      <h1 className="mt-3 max-w-2xl text-4xl text-purple-900 sm:text-5xl">
        That page doesn&apos;t exist
      </h1>
      <p className="mt-4 max-w-xl text-lg text-ink/75">
        The old chapter site had links that went nowhere. This one tells you when something is
        missing and points you somewhere useful instead.
      </p>

      <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
        {baseNav
          .filter((item) => item.href !== "/")
          .map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="font-semibold text-salmon-600 underline underline-offset-4"
              >
                {item.label}
              </Link>
            </li>
          ))}
      </ul>

      <ButtonLink href="/" className="mt-10">
        Back home
      </ButtonLink>
    </Section>
  );
}
