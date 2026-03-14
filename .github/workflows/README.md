# Backlog Sync Workflow

This folder contains the GitHub Action that synchronizes backlog Markdown files to GitHub Issues and keeps issue metadata in sync.

## What The Action Does

Workflow file: `backlog-to-project.yml`

On each run, the action:

1. Reads backlog Markdown files from:
   - `backlog/epics/**/*.md`
   - `backlog/stories/**/*.md`
2. Parses hierarchy using heading levels:
   - `# Epic: ...`
   - `## Feature: ...`
   - `### User Story: ...`
3. Processes in order: epics -> features -> stories.
4. Creates or updates GitHub issues:
   - If `<!-- github-issue: N -->` exists, update issue `N`.
   - If missing, create a new issue.
5. Maintains parent-child links:
   - Epic -> Feature
   - Feature -> User Story
   - Attempts native GitHub sub-issue relationship (GraphQL mutation).
   - Also writes parent metadata into issue body as fallback/reference.
6. Writes metadata back to backlog files:
   - `github-issue`
   - `github-updated-at`
   - `parent-feature-title` (for stories)
7. Prevents duplicate user stories on first sync:
   - If a story has no issue number, it searches existing issues for matching title + parent feature marker and reuses that issue.
8. Applies conflict protection:
   - If a GitHub issue was manually updated after last synced timestamp, overwrite is skipped and conflict is logged.

## Triggers

The workflow runs on:

- Manual run: `workflow_dispatch`
- Push to `master` when matching backlog files change

Fixture/sample paths are excluded from trigger rules.

## Required Repository Setup

1. Add repository secret:
   - Name: `GH_TOKEN`
   - Value: Personal access token with issue write permissions (and permissions needed for GraphQL sub-issue linking).
2. Repository owner and name are auto-detected by the sync script using this priority:
   - `GH_OWNER` + `GH_REPO` (optional manual override)
   - `GH_REPOSITORY` in `owner/repo` format
   - `GITHUB_REPOSITORY` (available in GitHub Actions)
   - `git remote.origin.url` (local fallback)

## Backlog File Contract

### Epic file example

```md
# Epic: Customer Portal Login
<!-- github-issue: 123 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->

Epic description.

## Feature: Login with email, user ID, and phone number
<!-- github-issue: 124 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->

Feature description.
```

### User story file example

```md
### User Story: US-1 Login With Email, User ID, and Phone Number
<!-- github-issue: 125 -->
<!-- github-updated-at: 2026-03-14T00:00:00.000Z -->
<!-- parent-feature-title: #Login with email, user ID, and phone number -->

As a customer
I want to login using email, user ID and phone number
So that I can access my account
```

Notes:

- `parent-feature-title` is required for stories.
- `parent-feature-link` is optional.
- Issue number is stored only in the file that owns the backlog item.

## Local Testing

From repo root:

```bash
npm install
npm run sync:backlog
```

If repository detection is unavailable in your local shell, set one of:

```bash
GH_REPOSITORY=owner/repo
```

or

```bash
GH_OWNER=owner
GH_REPO=repo
```

To generate sample fixtures:

```bash
npm run generate:backlog-samples
```

Fixture output is under `backlog/fixtures/hierarchical/` and is ignored by workflow triggers.

## Troubleshooting

### Workflow does not trigger

- Confirm changed files are under `backlog/**/*.md`.
- Confirm changes are not only inside excluded fixture/sample paths.

### Action fails with missing parent feature

- Ensure each story file has `parent-feature-title` matching a `## Feature: ...` title exactly (case-insensitive compare in script).

### Duplicate issue ID error

- Ensure a `github-issue` number is not reused across different backlog items.

### Native sub-issue relationship not linked

- Check token permissions and repository support for sub-issue GraphQL mutation.
- Sync still proceeds using body metadata fallback.
