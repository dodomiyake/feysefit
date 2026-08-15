#!/usr/bin/env bash
# Fail CI on CodeQL high/critical security results. Medium/low are printed, not ignored.
# Usage: codeql-sarif-gate.sh <sarif-directory>
set -euo pipefail

DIR="${1:-}"
if [[ -z "$DIR" || ! -d "$DIR" ]]; then
  echo "codeql-sarif-gate: missing SARIF directory: ${DIR:-<(empty)>}" >&2
  exit 1
fi

shopt -s nullglob
files=("$DIR"/*.sarif)
if (( ${#files[@]} == 0 )); then
  echo "codeql-sarif-gate: no .sarif files in $DIR" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "codeql-sarif-gate: jq is required" >&2
  exit 1
fi

# High/critical: SARIF error, or CodeQL security-severity >= 7.0 (GitHub high).
# Unknown security findings fail closed.
filter='
def num:
  if . == null then null
  elif type == "number" then .
  else (tostring | try tonumber catch null)
  end;

def rules($run):
  ($run.tool.driver.rules // []);

def rule_for($run; $result):
  (rules($run) | map(select(.id == ($result.ruleId // ""))) | .[0] // null)
  // (if $result.ruleIndex != null then (rules($run)[$result.ruleIndex] // null) else null end)
  // {};

def tags($rule):
  [($rule.properties.tags // [])[] | ascii_downcase];

def is_security($result; $rule):
  (tags($rule) | index("security") != null)
  or (($result.properties["security-severity"] // $rule.properties["security-severity"] // "") != "");

def severity($result; $rule):
  ($result.properties["security-severity"] // $rule.properties["security-severity"]) | num;

def level($result; $rule):
  $result.level // $rule.defaultConfiguration.level // "warning";

def loc($result):
  $result.locations[0].physicalLocation.artifactLocation.uri // "unknown";

def findings:
  . as $doc
  | if ($doc.runs | type) != "array" or ($doc.runs | length) == 0 then
      error("SARIF has no runs")
    else
      $doc.runs[] as $run
      | ($run.results // [])[]? as $result
      | rule_for($run; $result) as $rule
      | {
          ruleId: ($result.ruleId // "unknown"),
          level: level($result; $rule),
          security: is_security($result; $rule),
          securitySeverity: severity($result; $rule),
          file: loc($result),
          message: ($result.message.text // "")
        }
    end;

def failing:
  (.securitySeverity != null and .securitySeverity >= 7)
  or (.level == "error")
  or (.security == true and .securitySeverity == null and .level != "note");

[findings]
| {
    total: length,
    failing: [.[] | select(failing)],
    reported: [.[] | select(.security == true or .level == "error" or .level == "warning")]
  }
'

failing_count=0
for file in "${files[@]}"; do
  echo "codeql-sarif-gate: reviewing $(basename "$file")"
  if ! summary="$(jq -e "$filter" "$file")"; then
    echo "codeql-sarif-gate: invalid or empty SARIF: $file" >&2
    exit 1
  fi
  echo "$summary" | jq -r '
    "  results: \(.total)",
    "  high/critical (gate): \(.failing | length)",
    "  security/warning reported: \(.reported | length)",
    (.reported[] | "  - [\(.level)] \(.ruleId) severity=\(.securitySeverity // "n/a") \(.file): \(.message)")
  '
  file_failing="$(echo "$summary" | jq -r '.failing | length')"
  failing_count=$((failing_count + file_failing))
done

if (( failing_count > 0 )); then
  echo "codeql-sarif-gate: failing ${failing_count} high/critical CodeQL finding(s)" >&2
  exit 1
fi

echo "codeql-sarif-gate: no high/critical findings"
