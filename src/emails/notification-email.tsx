import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

/** One reusable template for every transactional notification — heading + body lines + optional CTA. */
export function NotificationEmail({
  preview,
  heading,
  lines,
  ctaLabel,
  ctaUrl,
}: {
  preview: string;
  heading: string;
  lines: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "32px",
            borderRadius: "8px",
            maxWidth: "480px",
            margin: "32px auto",
          }}
        >
          <Heading style={{ fontSize: "18px", marginBottom: "16px" }}>{heading}</Heading>
          {lines.map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static, server-rendered list of body lines
            <Text key={index} style={{ fontSize: "14px", color: "#333333", lineHeight: "22px" }}>
              {line}
            </Text>
          ))}
          {ctaUrl && ctaLabel ? (
            <Button
              href={ctaUrl}
              style={{
                backgroundColor: "#111827",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "6px",
                fontSize: "14px",
                marginTop: "16px",
              }}
            >
              {ctaLabel}
            </Button>
          ) : null}
          <Hr style={{ marginTop: "24px", borderColor: "#e5e5e5" }} />
          <Text style={{ fontSize: "12px", color: "#888888" }}>FirstMan Corporate Services</Text>
        </Container>
      </Body>
    </Html>
  );
}
