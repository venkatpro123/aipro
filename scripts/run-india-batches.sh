#!/usr/bin/env bash
# run-india-batches.sh — Run all 10 Indian company insert batches sequentially
# Usage: DATABASE_URL="postgres://..." bash scripts/run-india-batches.sh
# Each batch is small (~18-22 companies) so it won't hit any rate limits.

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is required"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================================"
echo " HumanProofs — Indian Giants Database Expansion"
echo " 10 batches × ~20 companies = 200+ new Indian entries"
echo "======================================================"
echo ""

batches=(
  "insert-india-b1-it.mjs"
  "insert-india-b2-banking.mjs"
  "insert-india-b3-finance.mjs"
  "insert-india-b4-pharma-health.mjs"
  "insert-india-b5-auto-fmcg.mjs"
  "insert-india-b6-energy.mjs"
  "insert-india-b7-telecom-retail.mjs"
  "insert-india-b8-metals-cement-infra.mjs"
  "insert-india-b9-industrial-defense.mjs"
  "insert-india-b10-startups.mjs"
)

total=${#batches[@]}
current=0

for script in "${batches[@]}"; do
  current=$((current + 1))
  echo "------------------------------------------------------"
  echo "[$current/$total] Running $script ..."
  echo "------------------------------------------------------"
  node "$SCRIPT_DIR/$script"
  echo ""
  # Small pause between batches to avoid connection churn
  sleep 2
done

echo "======================================================"
echo " ALL BATCHES COMPLETE"
echo " Run: DATABASE_URL=... node scripts/check-companies.mjs"
echo " to audit the final state."
echo "======================================================"
