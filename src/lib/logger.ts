import pino from "pino";
import { env } from "@/lib/env";

// No `transport` option here: pino-pretty's worker-thread transport doesn't
// survive Next.js/Turbopack bundling. Pipe `npm run dev | npx pino-pretty`
// locally if you want colorized output; production stays structured JSON.
export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  base: { service: "firstman-crm" },
});
