import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // A cold `next dev` compiles each route the first time it's hit, serially, on the server
  // process. Running specs in parallel makes two tests contend for that same cold-compile
  // window and race each other's navigations — serial execution is what actually makes this
  // small smoke suite reliable against a fresh dev server.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  // The critical-path spec walks through ~6 previously-uncompiled routes in one test — the
  // default 30s per-test budget doesn't leave room for that many cold Turbopack compiles.
  timeout: 120_000,
  // next dev compiles each route on first hit — give that cold-start latency room. The very
  // first test in the run can hit a route (e.g. /login) that's never been compiled in this
  // server process at all, on top of instrumentation/middleware still warming up, which is
  // slower than any later hit of the same route — hence the generous timeout.
  expect: { timeout: 45_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Runs against the dev server (not the standalone Docker build) — see
    // README "Assumptions" for why local/CI e2e and the Docker image diverge here.
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      BETTER_AUTH_URL: baseURL,
      PORT: String(PORT),
    },
  },
});
