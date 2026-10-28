---
description: Ask the read-only reviewer to check the latest changes against docs/.
agent: reviewer
subtask: true
---
Review the most recent changes in this repository (`git status`, then `git diff HEAD`; if the working tree is clean, `git show HEAD`). Focus (optional): $ARGUMENTS

Apply your full checklist: API contract, simulation spec, frontend spec, scope, tests. Return findings in your standard format and end with the verdict line.