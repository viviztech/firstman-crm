"""Manual local smoke check for the HR workspace.

Run against a local `next dev` server on port 3000. Reads the development admin
password from `.env` without printing it.
"""

from pathlib import Path
import os

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("HR_SMOKE_BASE_URL", "http://localhost:3000")


def admin_password() -> str:
    for line in Path(".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("ADMIN_DEFAULT_PASSWORD="):
            return line.split("=", 1)[1].strip().strip('"\'')
    raise RuntimeError("ADMIN_DEFAULT_PASSWORD is not configured")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    page.goto(f"{BASE_URL}/hr", wait_until="networkidle", timeout=120_000)
    assert "/login" in page.url, f"Expected login redirect, got {page.url}"
    print("PASS: unauthenticated HR route redirects to login")

    page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=120_000)
    page.get_by_label("Email").fill("admin@firstman.in")
    page.get_by_label("Password", exact=True).fill(admin_password())
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/hr", timeout=120_000)
    print("PASS: local administrator signed in")

    for route, heading in [
        ("/hr", "Human resources"),
        ("/hr/me", "My HR profile"),
        ("/hr/directory", "Employee directory"),
        ("/hr/employees", "Employees"),
        ("/hr/organization", "Organization setup"),
        ("/hr/leave", "My leave"),
        ("/hr/leave/team", "Team leave approvals"),
        ("/hr/leave/settings", "Leave settings"),
        ("/hr/attendance", "My attendance"),
        ("/hr/attendance/team", "Team attendance"),
        ("/hr/attendance/settings", "Attendance settings"),
        ("/hr/attendance/import", "Import attendance"),
        ("/hr/payroll", "Payroll"),
        ("/hr/payroll/settings", "Salary settings"),
        ("/hr/payslips", "My payslips"),
    ]:
        response = page.goto(
            f"{BASE_URL}{route}",
            wait_until="networkidle",
            timeout=120_000,
        )
        assert response is not None and response.status == 200, (
            f"{route} returned {response.status if response else 'no response'}"
        )
        assert page.get_by_role("heading", name=heading, exact=True).is_visible(), (
            f"{route} did not render {heading!r}; URL={page.url}"
        )
        print(f"PASS: {route} rendered")

    page.goto(f"{BASE_URL}/hr/leave/settings", wait_until="networkidle")
    assert page.get_by_text("Leave types", exact=True).is_visible()
    assert page.get_by_text("Balance adjustment", exact=True).is_visible()
    assert page.get_by_text("Entitlement policy", exact=True).is_visible()
    assert page.get_by_text("Automated provisioning", exact=True).is_visible()
    assert page.get_by_text("Location holidays", exact=True).is_visible()
    print("PASS: leave administration controls rendered")

    page.goto(f"{BASE_URL}/hr/leave/team", wait_until="networkidle")
    assert page.get_by_text(
        "Approved and pending leave for the team you are allowed to manage.", exact=True
    ).is_visible()
    assert page.locator('a[href^="/hr/leave/team?month="]').count() == 2
    print("PASS: team leave calendar rendered")

    page.goto(f"{BASE_URL}/hr/attendance/settings", wait_until="networkidle")
    assert page.get_by_text("Shifts", exact=True).is_visible()
    assert page.get_by_text("Shift assignment", exact=True).is_visible()
    assert page.get_by_text("Payroll attendance lock", exact=True).is_visible()
    print("PASS: attendance administration controls rendered")

    page.goto(f"{BASE_URL}/hr/payroll", wait_until="networkidle")
    assert page.get_by_text("New payroll run", exact=True).is_visible()
    assert page.get_by_label("Payroll month").is_visible()
    print("PASS: payroll period workspace rendered")

    page.goto(f"{BASE_URL}/hr/payroll/settings", wait_until="networkidle")
    assert page.get_by_text("Salary component", exact=True).is_visible()
    assert page.get_by_text("Salary structure", exact=True).is_visible()
    assert page.get_by_text("Structure components", exact=True).is_visible()
    assert page.get_by_text("Employee assignments", exact=True).is_visible()
    print("PASS: salary setup and assignment controls rendered")

    page.goto(f"{BASE_URL}/hr/payslips", wait_until="networkidle")
    assert page.get_by_text("Published payslips", exact=True).is_visible()
    print("PASS: employee payslip workspace rendered")

    page.goto(f"{BASE_URL}/hr/attendance/import", wait_until="networkidle")
    assert page.get_by_role("link", name="Download CSV template").is_visible()
    attendance_csv = (
        "employee_code,work_date,first_in,last_out,status,note\n"
        "UNKNOWN-EMP,2026-09-23,2026-09-23T09:00,2026-09-23T18:00,present,Test\n"
    )
    page.locator('input[type="file"]').set_input_files(
        {"name": "attendance.csv", "mimeType": "text/csv", "buffer": attendance_csv.encode("utf-8")}
    )
    page.get_by_role("button", name="Validate and preview").click()
    page.get_by_text("Employee code does not belong to an active employee.").wait_for(
        state="visible", timeout=30_000
    )
    print("PASS: attendance CSV preview shows row-level validation error")

    page.goto(f"{BASE_URL}/hr/employees/import", wait_until="networkidle")
    assert page.get_by_role("heading", name="Import employee profiles").is_visible()
    assert page.get_by_role("link", name="Download CSV template").is_visible()
    csv_text = (
        "email,employee_code,legal_name,phone,personal_email,department_code,"
        "designation_code,manager_email,location_code,employment_category,join_date,payroll_eligible\n"
        "nonexistent-import@test.local,IMP-TEST,Test Person,,,,,,,permanent,2026-01-01,false\n"
    )
    page.locator('input[type="file"]').set_input_files(
        {"name": "employees.csv", "mimeType": "text/csv", "buffer": csv_text.encode("utf-8")}
    )
    page.get_by_role("button", name="Validate and preview").click()
    page.get_by_text("No existing CRM account has this email.").wait_for(
        state="visible", timeout=30_000
    )
    print("PASS: CSV preview shows row-level validation error")

    page.goto(f"{BASE_URL}/hr/statutory", wait_until="networkidle")
    assert page.get_by_role("heading", name="Employee statutory details").is_visible()
    statutory_href = page.locator('main a[href^="/hr/statutory/"]').first.get_attribute("href")
    assert statutory_href is not None
    page.goto(f"{BASE_URL}{statutory_href}", wait_until="networkidle")
    assert page.get_by_text("Statutory record", exact=True).is_visible()
    assert page.get_by_label("PF eligible").is_visible()
    print("PASS: payroll statutory administration rendered")

    page.goto(f"{BASE_URL}/hr/security", wait_until="networkidle")
    assert page.get_by_role("heading", name="HR data recovery and rotation").is_visible()
    assert page.get_by_label("Type ROTATE HR DATA").is_visible()
    print("PASS: super-admin HR rotation controls rendered")

    page.goto(f"{BASE_URL}/hr/employees", wait_until="networkidle")
    edit_href = page.get_by_role("link", name="Edit").first.get_attribute("href")
    assert edit_href is not None
    page.get_by_role("link", name="Edit").first.click()
    page.wait_for_url(f"**{edit_href}", timeout=120_000)
    page.wait_for_load_state("networkidle")
    assert "/hr/employees/" in page.url
    assert page.get_by_text("Employment profile", exact=True).is_visible()
    assert page.get_by_label("Employee code").is_visible()
    print("PASS: employee detail form rendered")
    assert page.get_by_text("Employment lifecycle", exact=True).is_visible()
    assert page.get_by_label("New status").is_visible()
    print("PASS: employment lifecycle controls rendered")
    assert page.get_by_text("Private employee details", exact=True).is_visible()
    assert page.get_by_label("Date of birth").is_visible()
    print("PASS: private details available without a separate encryption key")
    assert page.get_by_text("Employee documents", exact=True).is_visible()
    assert page.get_by_label("Document type").is_visible()
    assert page.get_by_label("File").is_visible()
    print("PASS: HR document upload controls rendered")

    page.goto(f"{BASE_URL}/hr/me", wait_until="networkidle")
    assert page.get_by_text("My documents", exact=True).is_visible()
    print("PASS: employee document list rendered")

    assert not errors, f"Browser errors: {errors}"
    print("PASS: no uncaught browser errors")
    browser.close()
