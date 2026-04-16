# Git Copy Helper

Chrome MV3 extension: small GitHub UX tweaks for this workflow.

## Install

`chrome://extensions` → Developer mode → **Load unpacked** → this folder.

## What it does

- **Copy** — Scissors control next to GitHub mono links; copies link text, brief checkmark feedback.
- **My PRs** — Extra repo tab (eel icon) → filtered open PRs for `roth-j` on `OdenTech/platform`.
- **PR previews** — On `owner/repo/pull/N` pages, floating buttons open QA / prod preview URLs keyed by PR number (`api.oden-qa.app` / `api.oden.app`).

Needs **clipboard** permission for copy. Scripts run on all URLs but targets are GitHub-specific.

Repo: [github.com/roth-j/git-helper](https://github.com/roth-j/git-helper)
