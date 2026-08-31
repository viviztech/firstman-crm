import { expect, test } from "@playwright/test";

test("unauthenticated visitor sees the public marketing homepage", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle(/FirstMan Corporate Services/);
});

test("unauthenticated visitor to a protected route is redirected to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("admin can log in and reach the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@firstman.in");
  await page.getByLabel("Password").fill(process.env.ADMIN_DEFAULT_PASSWORD ?? "ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Welcome back")).toBeVisible();
});
