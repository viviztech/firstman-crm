import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.string().url(),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  ADMIN_DEFAULT_PASSWORD: z.string().min(8),

  // Optional legacy/override key. New private HR records derive a separate key from
  // BETTER_AUTH_SECRET when this is blank; v1 records still need their original key.
  HR_DATA_ENCRYPTION_KEY: z
    .string()
    .default("")
    .refine((value) => value === "" || /^[A-Za-z0-9+/]{43}=$/.test(value), {
      message: "Provide a base64-encoded 32-byte HR encryption key",
    }),
  // Temporary during BETTER_AUTH_SECRET rotation. Remove after HR ciphertext rotation succeeds.
  HR_DATA_PREVIOUS_AUTH_SECRET: z.string().min(32).default(""),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  // "Display Name <email@domain>" or a bare email — both are valid SMTP From headers.
  MAIL_FROM: z.string().min(3),

  WHATSAPP_TOKEN: z.string().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
  WHATSAPP_BUSINESS_ID: z.string().default(""),

  ENQUIRIES_API_TOKEN: z.string().min(16),

  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  TZ_DISPLAY: z.string().default("Asia/Kolkata"),

  SENTRY_DSN: z.string().default(""),
  NEXT_PUBLIC_SENTRY_DSN: z.string().default(""),

  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().default(""),
  NEXT_PUBLIC_GTM_ID: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // Thrown at boot, before any request is served — never surfaced to a client.
    console.error(
      "Invalid environment variables:",
      JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
    );
    throw new Error("Invalid environment variables — see startup log for details");
  }
  return parsed.data;
}

export const env = loadEnv();
