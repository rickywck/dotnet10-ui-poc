import fs from "fs";
import path from "path";

const ROOT = path.resolve("./backlog/fixtures/hierarchical");
const EPICS_DIR = path.join(ROOT, "epics");
const STORIES_DIR = path.join(ROOT, "stories");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(relativePath, content) {
  const fullPath = path.join(ROOT, relativePath);
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, content.trim() + "\n", "utf-8");
  console.log(`Wrote ${fullPath}`);
}

function main() {
  ensureDir(EPICS_DIR);
  ensureDir(STORIES_DIR);

  writeFile(
    "epics/customer-portal-login.md",
    `# Epic: Customer Portal Login
<!-- github-issue: 63 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->

Allow customers to securely access their portal account.

## Feature: Login with email, user ID, and phone number
<!-- github-issue: 64 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->

Support multiple identifiers for customer login to reduce login friction.

## Feature: Password reset
<!-- github-issue: 65 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->

Allow customers to reset forgotten passwords and regain access quickly.`
  );

  writeFile(
    "stories/us-login-email-userid-phone.md",
    `### User Story: US-1 Login With Multiple Identifiers
<!-- github-issue: 66 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->
<!-- parent-feature-title: #Login with email, user ID, and phone number -->
<!-- parent-feature-link: ../epics/customer-portal-login.md#feature-login-with-email-user-id-and-phone-number -->

As a customer
I want to login using email, user ID, and phone number
So that I can access my account using my preferred identifier.`
  );

  writeFile(
    "stories/us-reset-password.md",
    `### User Story: US-2 Reset Password
<!-- github-issue: 67 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->
<!-- parent-feature-title: #Password reset -->
<!-- parent-feature-link: ../epics/customer-portal-login.md#feature-password-reset -->

As a customer
I want to reset my password
So that I can regain access to my account.`
  );

  writeFile(
    "stories/us-login-mfa.md",
    `### User Story: US-3 Login MFA Setup
<!-- github-issue: 68 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->
<!-- parent-feature-title: #Login with email, user ID, and phone number -->
<!-- parent-feature-link: ../epics/customer-portal-login.md#feature-login-with-email-user-id-and-phone-number -->

As a customer
I want to configure MFA after login
So that my account is more secure.`
  );

  writeFile(
    "stories/_invalid-missing-parent.md",
    `### User Story: Invalid Missing Parent
<!-- github-issue: 9991 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->

This fixture intentionally omits parent metadata for parser validation.`
  );

  writeFile(
    "stories/_invalid-duplicate-issue-id.md",
    `### User Story: Invalid Duplicate Issue
<!-- github-issue: 66 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->
<!-- parent-feature-title: #Password reset -->
<!-- parent-feature-link: ../epics/customer-portal-login.md#feature-password-reset -->

This fixture intentionally duplicates issue ID 66 for validator testing.`
  );
}

main();
