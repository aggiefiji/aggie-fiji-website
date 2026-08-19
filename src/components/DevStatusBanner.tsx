import { pendingIntegrations } from "@/integrations.config";
import { getSiteSettings } from "@/lib/content";

/**
 * Development-only banner listing everything still stubbed. Renders nothing in
 * production, so it can never ship — but while the site is being built nobody
 * can forget that the contact info is fake or that giving is not wired up.
 */
export function DevStatusBanner() {
  if (process.env.NODE_ENV === "production") return null;

  const site = getSiteSettings();
  const placeholderContact = site.contact.isPlaceholder;

  return (
    <details className="border-b border-amber-300 bg-amber-50 text-amber-950">
      <summary className="container-page cursor-pointer py-2 text-xs font-semibold uppercase tracking-wide">
        Dev only · {pendingIntegrations.length} integration
        {pendingIntegrations.length === 1 ? "" : "s"} stubbed
        {placeholderContact ? " · contact info is still placeholder" : ""}
      </summary>
      <div className="container-page pb-3 text-xs">
        <ul className="space-y-1">
          {pendingIntegrations.map((i) => (
            <li key={i.name}>
              <strong>{i.name}:</strong> {i.note}
            </li>
          ))}
        </ul>
        <p className="mt-2 opacity-80">
          Everything above is controlled from <code>src/integrations.config.ts</code>. Nothing here
          points at a live service.
        </p>
      </div>
    </details>
  );
}
