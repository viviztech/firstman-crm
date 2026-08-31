/** Strips everything but digits (keeping a leading "+") so tel: hrefs stay valid regardless of the display format. */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return `tel:${plus}${trimmed.replace(/\D/g, "")}`;
}
