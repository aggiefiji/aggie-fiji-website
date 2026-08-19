import React, { type ReactNode } from "react";
import { Todo } from "@/components/ui";

/**
 * A deliberately small, dependency-free markdown renderer for the long-form
 * fields officers write in the CMS.
 *
 * Supports: ## / ### headings, - bullet lists, paragraphs, **bold**, *italic*,
 * and [links](https://…). It renders React elements — never raw HTML — so a
 * content editor cannot accidentally (or deliberately) inject script tags.
 *
 * It is also the site's TODO checkpoint for long-form text, and it cuts at the
 * marker rather than testing the whole field. `isTodo()` anchors at the start
 * of a string, which is right for a one-line field and wrong for body copy —
 * the way officers actually leave notes is mid-field:
 *
 *     - **Mentor an active brother.** TODO: describe the program.
 *
 * A start-anchored test reads that as finished content and ships the note. So
 * every block is truncated at its first TODO: the real half renders, the note
 * is dropped, and development gets a marker saying something was cut. A bullet
 * that is nothing but a TODO disappears entirely.
 *
 * The tradeoff: a sentence using the literal word "TODO" would be truncated.
 * In chapter copy that is a price worth paying, and the dev marker makes it
 * obvious rather than silent.
 */

/** What survives before the first TODO marker, and whether any was cut. */
function splitTodo(text: string): { kept: string; hadTodo: boolean } {
  const at = text.search(/\bTODO\b/i);
  if (at === -1) return { kept: text.trim(), hadTodo: false };
  return { kept: text.slice(0, at).trim(), hadTodo: true };
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-i${i++}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const external = /^https?:\/\//.test(href);
        nodes.push(
          <a
            key={key}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {label}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({ children, className }: { children?: string; className?: string }) {
  if (!children?.trim()) return null;

  const blocks = children.replace(/\r\n/g, "\n").split(/\n{2,}/);

  /*
   * A heading whose whole section is unwritten is dropped with it.
   *
   * Cutting the paragraphs but keeping the heading left a bare "## The Texas
   * A&M chapter" sitting on the page with nothing beneath it, which reads as a
   * broken page rather than a thin one. A heading only survives if at least one
   * block before the next heading of the same-or-higher level has content left
   * after the TODO cut.
   */
  const headingLevel = (text: string) => /^(#{2,3})\s+/.exec(text)?.[1].length ?? 0;

  const survives = blocks.map((block, i) => {
    const trimmed = block.trim();
    const level = headingLevel(trimmed);
    if (level === 0) return true;

    for (let j = i + 1; j < blocks.length; j++) {
      const next = blocks[j].trim();
      if (!next) continue;
      const nextLevel = headingLevel(next);
      // Reached the next section at the same or higher level — nothing under
      // this heading survived.
      if (nextLevel > 0 && nextLevel <= level) return false;
      const body = nextLevel > 0 ? next.replace(/^#{2,3}\s+/, "") : next;
      if (splitTodo(body.replace(/^[-*]\s/, "")).kept) return true;
    }
    return false;
  });

  return (
    <div className={className ? `prose-fiji ${className}` : "prose-fiji"}>
      {blocks.map((block, b) => {
        const trimmed = block.trim();
        if (!trimmed) return null;
        if (!survives[b]) return null;

        // Headings: check the text after the #s, or "## TODO: history" passes.
        const heading = /^(#{2,3})\s+([\s\S]*)$/.exec(trimmed);
        if (heading) {
          const { kept, hadTodo } = splitTodo(heading[2]);
          const Tag = heading[1] === "###" ? "h3" : "h2";
          return (
            <React.Fragment key={b}>
              {kept ? <Tag>{renderInline(kept, `b${b}`)}</Tag> : null}
              {hadTodo ? <Todo label="Unfinished heading">{heading[2]}</Todo> : null}
            </React.Fragment>
          );
        }

        // Lists finish one item at a time, so filter inside the list too.
        if (/^[-*]\s/.test(trimmed)) {
          const items = trimmed
            .split("\n")
            .filter((line) => /^[-*]\s/.test(line.trim()))
            .map((line) => splitTodo(line.trim().replace(/^[-*]\s/, "")));
          const kept = items.filter((item) => item.kept);
          const cut = items.filter((item) => item.hadTodo).length;

          return (
            <React.Fragment key={b}>
              {kept.length > 0 ? (
                <ul>
                  {kept.map((item, i) => (
                    <li key={i}>{renderInline(item.kept, `b${b}l${i}`)}</li>
                  ))}
                </ul>
              ) : null}
              {cut > 0 ? (
                <Todo label={`${cut} unfinished list ${cut === 1 ? "item" : "items"}`} />
              ) : null}
            </React.Fragment>
          );
        }

        const { kept, hadTodo } = splitTodo(trimmed.replace(/\n/g, " "));
        return (
          <React.Fragment key={b}>
            {kept ? <p>{renderInline(kept, `b${b}`)}</p> : null}
            {hadTodo ? <Todo>{trimmed}</Todo> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
