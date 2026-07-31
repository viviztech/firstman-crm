import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Renders nothing until a real WhatsApp number is set in company profile settings — never fabricated. */
export function WhatsAppCta({
  whatsappNumber,
  className,
  message = "Hi, I'd like to know more about your services.",
}: {
  whatsappNumber: string;
  className?: string;
  message?: string;
}) {
  if (!whatsappNumber) return null;

  const href = `https://wa.me/${whatsappNumber.replace(/^\+/, "")}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted",
        className,
      )}
    >
      <MessageCircle className="size-4" />
      WhatsApp us
    </a>
  );
}
