import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = "admin@firstman.in";
const ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD ?? "ChangeMe123!";

/**
 * next dev (Turbopack) compiles each route on first hit. A click that lands before that
 * compile finishes hits a DOM node with no React handler attached yet, so it silently no-ops
 * instead of erroring. Settling on networkidle plus a short buffer avoids that race — the
 * same pattern needed repeatedly when driving this app's dev server via Playwright.
 */
async function settle(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

/**
 * Full critical path per spec §5 Phase 8: login → create enquiry → Sales (client + order) →
 * invoice → payment. One continuous flow (not independent tests) since each step depends on
 * the record the previous step created.
 */
test("critical path: login, create enquiry, close sale, invoice, payment", async ({ page }) => {
  const uniqueSuffix = `7${String(Date.now()).slice(-9)}`;
  const enquiryName = `E2E Test Enquiry ${uniqueSuffix.slice(-6)}`;

  await test.step("login", async () => {
    await page.goto("/login");
    await settle(page);
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await settle(page);
  });

  await test.step("create enquiry", async () => {
    await page.goto("/enquiries/new");
    await settle(page);
    await page.getByLabel("Name").fill(enquiryName);
    await page.getByLabel("Phone").fill(uniqueSuffix);
    await page.getByRole("button", { name: "Create enquiry" }).click();
    await expect(page).toHaveURL(/\/enquiries\/[0-9a-f-]+$/);
    await settle(page);
    await expect(page.getByRole("heading", { name: enquiryName })).toBeVisible();
  });

  await test.step("close the enquiry as a sale (creates client + order)", async () => {
    await expect(page.getByRole("button", { name: "Sales" })).toBeVisible();
    await page.getByRole("button", { name: "Sales" }).click();
    const dialog = page.getByRole("dialog");
    // The Sales dialog's service picker is a repeatable row editor (ADR 0002) — the first row's
    // select has no fixed id (since-removed #sales-service), and the State select earlier in the
    // form also matches a bare select-trigger locator, so disambiguate by placeholder text.
    await dialog.locator('[data-slot="select-trigger"]', { hasText: "Choose a service" }).click();
    await page.getByRole("option", { name: "Private Limited Company Registration" }).click();
    await dialog.getByRole("button", { name: "Close sale" }).click();
    await expect(page).toHaveURL(/\/clients\/[0-9a-f-]+$/);
    await settle(page);
    await expect(page.getByRole("heading", { name: enquiryName })).toBeVisible();
  });

  await test.step("open the job card created by the sale", async () => {
    await page.getByRole("tab", { name: "Job Cards" }).click();
    await page.waitForTimeout(300);
    await page.getByRole("link", { name: /^FMJC/ }).first().click();
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/);
    await settle(page);
  });

  await test.step("create an invoice from the job card", async () => {
    // The Job Card page is a single scrollable page (ADR 0002) — Invoices is a section, not a
    // tab; Playwright's click auto-scrolls it into view, so no tab navigation is needed here.
    await expect(page.getByRole("button", { name: "New invoice" })).toBeVisible();
    await page.getByRole("button", { name: "New invoice" }).click();
    await expect(page).toHaveURL(/\/invoices\/new/);
    await settle(page);

    await page.getByPlaceholder("Description").fill("E2E consultation fee");
    await page.getByPlaceholder("Qty").fill("1");
    await page.getByPlaceholder("Rate (₹)").fill("1000");
    await page.locator("#dueDate").fill("2026-12-31");
    await page.getByRole("button", { name: "Create invoice" }).click();
    await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]+$/);
    await settle(page);
    await expect(page.getByText("₹1,180.00")).toBeVisible();
  });

  await test.step("send the invoice and record full payment", async () => {
    await expect(page.getByRole("button", { name: "Send invoice" })).toBeVisible();
    await page.getByRole("button", { name: "Send invoice" }).click();
    const sendDialog = page.getByRole("dialog");
    await expect(
      sendDialog.getByRole("button", { name: "Send invoice", exact: true }),
    ).toBeVisible();
    await sendDialog.getByRole("button", { name: "Send invoice", exact: true }).click();
    await expect(page.getByText("Sent", { exact: true })).toBeVisible();
    await settle(page);

    await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();
    await page.getByRole("button", { name: "Record payment" }).click();
    const paymentDialog = page.getByRole("dialog");
    await expect(
      paymentDialog.getByRole("button", { name: "Record payment", exact: true }),
    ).toBeVisible();
    await paymentDialog.getByRole("button", { name: "Record payment", exact: true }).click();
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
  });
});
