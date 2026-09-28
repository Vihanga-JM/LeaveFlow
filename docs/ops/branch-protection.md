# Branch protection for `main`

The pipeline *reports*; branch protection *enforces*. Set this up once the CI
workflow has run on at least one PR (checks only appear in the picker after
they have run).

GitHub → **Settings → Rules → Rulesets → New branch ruleset**

- Target: `main` (Include default branch)
- **Require a pull request before merging** — 1 approval
- **Require status checks to pass** — add `lint`, `test-api`, `test-client`
  (optionally `audit` and `e2e`)
- **Require branches to be up to date before merging**
- Block force pushes

Solo-repo caveat: GitHub does not let you approve your own PR. With "1 approval"
required, your mentor must be a collaborator who reviews, or you add yourself to
the ruleset's bypass list for emergencies only.

## Fire drill (Phase 8, step 6)

1. `git checkout -b feat/ci-fire-drill`
2. Break one assertion, e.g. `toBe(201)` → `toBe(999)` in `server/tests/leaveRequests.test.js`
3. Commit, push, open a PR → `test-api` goes red, merge is blocked
4. Click **Details** on the red check, read the Jest failure in the log
5. Revert, push → checks rerun and turn green → merge unlocks
