# Architecture Decision Records

An ADR captures **one significant architectural decision** — what was
chosen, what was rejected, and why — at the moment it was made. ADRs are
append-only: when a decision is reversed, a new ADR supersedes the old
one rather than editing it.

## Why we keep them

Six months from now, no one remembers why we run a DAG instead of a
sequential pipeline. The ADR is the receipt. It saves a new engineer
from re-litigating a decision, and saves the team from accidentally
re-introducing a pattern that was deliberately rejected.

## When to write one

Write an ADR when the decision:

- Changes how a major subsystem is structured (pipeline shape, data
  model, auth boundary, deployment topology).
- Picks one of several plausible options where the trade-off matters.
- Will be hard to reverse later (cost > 1 week of work).
- Introduces a constraint that future code must honour (e.g. "every
  layer must declare a sourceClass").

Do NOT write one for:

- Routine bug fixes — the commit message is enough.
- Library upgrades — Dependabot does these.
- Code style — eslint/prettier handle it.
- One-off scripts.

## Format

Each ADR is a single Markdown file named `NNNN-kebab-case-title.md` where
`NNNN` is a zero-padded sequence number. The template lives in
[TEMPLATE.md](./TEMPLATE.md). Keep them short — 1 page is the target.

## Status lifecycle

| Status      | Meaning |
|---|---|
| `proposed`  | Drafted, not yet approved. Open for discussion in the PR. |
| `accepted`  | Approved and in force. The default state once merged. |
| `deprecated` | No longer the preferred approach but not yet replaced. |
| `superseded` | Replaced by a newer ADR. The superseding ADR's number is named in the header. |

A superseded ADR is NEVER deleted — it is the historical record of what
was tried.

## Index

| # | Title | Status |
|---|---|---|
| [0001](./0001-dag-pipeline-registry.md)        | DAG-based pipeline replaces sequential god-file        | accepted |
| [0002](./0002-audit-context-typed-channel.md)  | Typed AuditContext replaces `companyData as any._x`    | accepted |
| [0003](./0003-shadow-mode-promotion-gate.md)   | Strict shadow mode gates every engine change           | accepted |
| [0004](./0004-tenant-rls-pattern.md)           | Tenant-scoped RLS for every user-data table            | accepted |
| [0005](./0005-conformal-ci-over-bayesian.md)   | Conformal prediction replaces heuristic Bayesian CI    | accepted |
| [0006](./0006-server-authoritative-scrape-dedup.md) | Server-side `INSERT ... ON CONFLICT` dedup        | accepted |
| [0007](./0007-empirical-truth-loop.md)         | Outcomes (implicit + reported) drive calibration       | accepted |
| [0008](./0008-no-new-layers-until-validated.md)| Freeze new intelligence layers until WS2/WS4 ship      | accepted |
| [0009](./0009-no-bare-confidence-arithmetic.md)| Confidence-affecting constants live in DB, not in code | accepted |

When adding a new ADR, bump the index and link it from this README.
