# CodeQL in CI

This repository is **private** and owned by a personal GitHub account. GitHub
Code Scanning / GitHub Code Security is **not available** here (`security_and_analysis`
is unset; the Code Scanning API returns 403). Do not expect GitHub Security
alerts from these runs.

CI still runs CodeQL (`javascript-typescript`). SARIF is **not** uploaded to
GitHub Code Scanning (`upload: never`, `upload-database: false`). The SARIF
files are stored as the **`codeql-sarif` workflow artifact**.

`.github/scripts/codeql-sarif-gate.sh` then fails the job on high/critical
results:

- SARIF `level` `error`, or
- CodeQL `security-severity` ≥ 7.0 (GitHub high/critical), or
- a security-tagged finding with unknown severity that is not `note`

Medium and low findings are printed in the job log and kept in the artifact.
They do not fail CI. Missing or invalid SARIF fails the gate. The analysis and
gate steps do not use `continue-on-error`.
