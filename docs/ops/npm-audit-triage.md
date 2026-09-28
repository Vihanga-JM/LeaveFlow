# npm audit triage (Phase 10, lab 3)

**2026-09-28:** `npm audit` in `server/`, `client/` and the repo root reports
**0 vulnerabilities at every level** (info through critical), so there is no live
finding to triage this week. CI's `audit` job fails the build on any new
critical finding.

When a finding appears, file an issue in this shape:

```text
Package: <name>@<version> (direct | via <parent>)   Advisory: <GHSA id>
Class: <e.g. ReDoS, prototype pollution, path traversal>   Severity: <npm's rating>
Decision: upgrade | accept | mitigate
Why it's safe: <e.g. "dev-only (vite dev server), never shipped in the nginx image";
               "we never pass user input to the vulnerable function">
```

Worked example of the reasoning, for the class of finding this repo is most
likely to see: a moderate ReDoS in a **dev-only** client dependency (the Vite dev
server or a test tool). The production client image contains only static files
served by nginx; no Node process from `client/` runs in production. Decision:
**accept** until an upstream patch lands, then upgrade — the attack surface is a
developer's laptop, not Nadeesha's staff.
