---
description: Pick the next unchecked task from docs/ROADMAP.md, implement it, test it, tick it.
agent: build
---
Work on the next unfinished ROADMAP task. Extra instructions from the user (optional): $ARGUMENTS

Steps:
1. Read `AGENTS.md` and `docs/ROADMAP.md`. Find the first line matching `- [ ] **P` in file order (Phases 1-3 only; Phase 4 is DITUNDA — never start it). If `$ARGUMENTS` names a task ID (e.g. P1-03), use that task instead.
2. Read only the docs that task needs (see "Which docs to read" in AGENTS.md).
3. Implement the task. Delegate to `@sim-engineer` for backend/simulator work (Phase 1) or `@frontend-engineer` for UI work (Phase 2/3). Stay strictly inside the task's "File" list and acceptance criteria; do not expand scope.
4. Run the task's "Uji" commands plus the Definition of Done checks from AGENTS.md. Fix failures; do not tick the box while anything fails.
5. If the contract or a canonical number had to change, update the docs first and say so.
6. Tick only this task's checkbox in `docs/ROADMAP.md` (`- [ ]` -> `- [x]`). Do not rewrite anything else in that file.
7. Finish with: task ID, files changed, test results, and the next unchecked task ID. Do not commit unless the user asked.