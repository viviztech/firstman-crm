import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = "admin@firstman.in";
const ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD ?? "ChangeMe123!";

test("admin dashboard is responsive and exposes its primary workspaces", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Good (morning|afternoon|evening)/,
  );
  await expect(page.getByRole("heading", { name: "Business operations" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Monthly business pulse" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Add enquiry/ })).toBeVisible();
  await page.screenshot({ path: "test-results/admin-dashboard-desktop.png", fullPage: true });
});

test("admin dashboard has no horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
  await page.screenshot({ path: "test-results/admin-dashboard-mobile.png", fullPage: true });
});
