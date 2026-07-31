/** Renders a single JSON-LD <script> tag. JSON.stringify avoids manual-escaping pitfalls. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires an inline script tag; data is server-constructed from typed fields, never raw user input.
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
