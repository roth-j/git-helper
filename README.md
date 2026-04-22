# Git Copy Helper

Chrome extension (Manifest V3) for GitHub and Oden platform preview workflows.

## Install

`chrome://extensions` → Developer mode → **Load unpacked** → this folder.

## Features

### Copy shortcut on GitHub

On pages that show small monospace primary links (commit SHAs, file paths, etc.), a **✂️** control appears after the link. Click copies the link text; brief **✓** feedback.

### “My PRs” tab

On GitHub repo tabs (where Pull requests appears), an extra **My PRs** tab (eel icon) opens a search of **open PRs you authored** on [`OdenTech/platform`](https://github.com/OdenTech/platform/pulls). Default author filter is `roth-j`; override in the popup **Settings (⚙️)** → **My PRs — GitHub username**.

### PR page: previews and approve++

On any `https://github.com/<owner>/<repo>/pull/<n>` page, a fixed stack on the right includes:

- **QA preview** — `https://api.oden-qa.app/platform/file-storage/platform-preview/<n>/`
- **Production preview** — `https://api.oden.app/platform/file-storage/platform-preview/<n>/`
- **++** — submits an **APPROVE** review with body `/approve++` via the GitHub API (requires a saved token; same as popup **approve++**).

### Extension popup (platform preview tabs)

When the **active tab URL** contains `/platform-preview/<PR number>/` (typical QA or prod preview paths), opening the popup:

- Resolves **`<PR number>`** to [`OdenTech/platform`](https://github.com/OdenTech/platform) and loads **title + description** (Markdown) if a GitHub token is saved.
- **Notes** — local draft per PR; **Copy** / **Post** (posts an **issue comment** on that PR). **Add images** uploads to branch `git-copy-note-media` under `note-media/pr-<n>/…` and embeds them in the comment (token must allow that).
- **approve++** — same API approve as on the PR page.

If the tab is not a matching preview URL, the popup explains the expected URL pattern.

## Settings (⚙️ in the popup)

| Field | Purpose |
|--------|--------|
| **My PRs — GitHub username** | Author filter for the My PRs tab search. |
| **GitHub token** | Stored only in this browser (`chrome.storage.local`). Used for: PR body in popup, posting notes/comments (and images), **approve++** from popup or PR page. |

If you use the [GitHub CLI](https://cli.github.com/) and are logged in (`gh auth login`), you can copy a token from the terminal with `gh auth token` and paste it into the extension.

Use a token with access to `OdenTech/platform` for reads, issue comments, pull request reviews, and repository contents (for image uploads on the note-media branch).

## Permissions

- **clipboardWrite** — copy from GitHub and from Notes.
- **activeTab** — read the active tab URL for the popup.
- **storage** — settings, drafts, token.
- **Host** `https://api.github.com/*` — GitHub REST API from the popup and content scripts.

Content scripts are registered for **all URLs** but only attach UI on matching GitHub pages or when APIs run in the extension context.

## Repo

[github.com/roth-j/git-helper](https://github.com/roth-j/git-helper)
