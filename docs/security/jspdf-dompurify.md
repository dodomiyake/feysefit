# jspdf / DOMPurify advisory

## Advisory

`dompurify` ≤3.4.12 (moderate):

- [GHSA-c2j3-45gr-mqc4](https://github.com/advisories/GHSA-c2j3-45gr-mqc4) — `CUSTOM_ELEMENT_HANDLING` bypasses `afterSanitizeElements`
- [GHSA-55q2-fjhq-7xh7](https://github.com/advisories/GHSA-55q2-fjhq-7xh7) — IN_PLACE hook removal leaves a detached subtree executable

Path: production dependency `jspdf@4.2.1` → `dompurify@3.4.11`.

## Reachability

`src/lib/appointment-day-pdf.ts` is the only jsPDF consumer. It uses `doc.text()` and `jspdf-autotable` with string cells. It does **not** call `doc.html()` or pass HTML into DOMPurify.

Appointment notes / client names are rendered as PDF text, not sanitized HTML.

## Decision

Accepted temporarily. Do not add `doc.html()` or other HTML-to-PDF helpers until `dompurify` is patched or the HTML path is reviewed.

`npm audit --audit-level=high` does not fail on this moderate finding.
