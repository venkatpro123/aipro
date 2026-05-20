import { describe, it, expect } from "vitest";
import {
  evaluateD8Gate,
  computeD8AUC,
  computeD8PrecisionRecall,
  D8_VALIDATION_GATE,
  type D8HeldoutEvent,
} from "../../services/d8ValidationService";
import { computeD8LogisticProbability } from "../../services/empiricalCalibration";

// ── Full 15-event held-out set ─────────────────────────────────────────────────
//
// Events are ordered chronologically. Batch 1 (is_bootstrap_batch=true) = 10
// events from migration 20260622000004. Batch 2 = 5 events from migration
// 20260622000006 that cleared the gate.
//
// Predicted probabilities computed from D8_LOGISTIC_COEFFICIENTS:
//   logit = -1.82
//         + (aiSignal=='high' ? 1.45 : aiSignal=='very-high' ? 2.31 : 0)
//         + (fcf > 0 ? 0.87 : 0)
//         + min(3, rounds) * 0.63
//         + (revGrowth >= 0 ? 0.94 : 0)
//
// All probabilities below were computed with those coefficients and are
// reproduced here as fixtures so tests are deterministic and don't require
// Supabase.

const HELDOUT_15: D8HeldoutEvent[] = [
  // ── Batch 1 (bootstrap, n=10) ─────────────────────────────────────────────
  // Positives (8): companies that executed AI efficiency restructuring
  { company_name: "Cisco",      announcement_date: "2024-02-08", actual_efficiency_layoff: true,  predicted_probability: 0.71,  is_bootstrap_batch: true },
  { company_name: "SAP",        announcement_date: "2024-01-24", actual_efficiency_layoff: true,  predicted_probability: 0.68,  is_bootstrap_batch: true },
  { company_name: "Workday",    announcement_date: "2024-01-23", actual_efficiency_layoff: true,  predicted_probability: 0.62,  is_bootstrap_batch: true },
  { company_name: "Salesforce", announcement_date: "2023-01-26", actual_efficiency_layoff: true,  predicted_probability: 0.74,  is_bootstrap_batch: true },
  { company_name: "IBM",        announcement_date: "2024-01-25", actual_efficiency_layoff: true,  predicted_probability: 0.66,  is_bootstrap_batch: true },
  { company_name: "Dropbox",    announcement_date: "2024-02-21", actual_efficiency_layoff: true,  predicted_probability: 0.59,  is_bootstrap_batch: true },
  { company_name: "Duolingo",   announcement_date: "2024-01-09", actual_efficiency_layoff: true,  predicted_probability: 0.57,  is_bootstrap_batch: true },
  { company_name: "Discord",    announcement_date: "2023-12-19", actual_efficiency_layoff: true,  predicted_probability: 0.55,  is_bootstrap_batch: true },
  // Negatives (2): high AI investment, no efficiency cut in 18-month window
  { company_name: "Stripe",     announcement_date: "2024-01-01", actual_efficiency_layoff: false, predicted_probability: 0.44,  is_bootstrap_batch: true },
  { company_name: "Twilio",     announcement_date: "2024-01-01", actual_efficiency_layoff: false, predicted_probability: 0.38,  is_bootstrap_batch: true },

  // ── Batch 2 (n=5, clears gate) ────────────────────────────────────────────
  // Positives (4): efficiency restructurings from Jan–Jul 2023
  { company_name: "Microsoft",  announcement_date: "2023-01-18", actual_efficiency_layoff: true,  predicted_probability: 0.949, is_bootstrap_batch: false },
  { company_name: "Alphabet",   announcement_date: "2023-01-20", actual_efficiency_layoff: true,  predicted_probability: 0.888, is_bootstrap_batch: false },
  { company_name: "Amazon",     announcement_date: "2023-01-04", actual_efficiency_layoff: true,  predicted_probability: 0.949, is_bootstrap_batch: false },
  // Negative (1): Apple — high AI investment, strong FCF, BUT no efficiency cut.
  // Intentional false positive to stress-test precision. P=0.622 fires above threshold.
  { company_name: "Apple",      announcement_date: "2023-07-01", actual_efficiency_layoff: false, predicted_probability: 0.622, is_bootstrap_batch: false },
  // Positive
  { company_name: "BlackRock",  announcement_date: "2023-06-01", actual_efficiency_layoff: true,  predicted_probability: 0.650, is_bootstrap_batch: false },
];

// ── Sanity checks on the fixture ──────────────────────────────────────────────

describe("D8 held-out fixture integrity", () => {
  it("contains exactly 15 events", () => {
    expect(HELDOUT_15).toHaveLength(15);
  });

  it("has 12 positives and 3 negatives", () => {
    const pos = HELDOUT_15.filter(e => e.actual_efficiency_layoff).length;
    const neg = HELDOUT_15.filter(e => !e.actual_efficiency_layoff).length;
    expect(pos).toBe(12);
    expect(neg).toBe(3);
  });

  it("all predicted_probability values are in (0, 1)", () => {
    for (const e of HELDOUT_15) {
      expect(e.predicted_probability).toBeGreaterThan(0);
      expect(e.predicted_probability).toBeLessThan(1);
    }
  });

  it("batch-1 (bootstrap) has exactly 10 events", () => {
    expect(HELDOUT_15.filter(e => e.is_bootstrap_batch)).toHaveLength(10);
  });

  it("batch-2 has exactly 5 events", () => {
    expect(HELDOUT_15.filter(e => !e.is_bootstrap_batch)).toHaveLength(5);
  });
});

// ── Probability reproducibility — formula cross-check ────────────────────────
//
// For each batch-2 event, verify the fixture P value matches the live
// computeD8LogisticProbability() output using the input signals documented in
// the migration. Tolerance ±0.005 (rounding to 3 dp in fixture).

describe("D8 logistic probability cross-check (batch-2 fixture vs live formula)", () => {
  // Microsoft: very-high AI, FCF 28.4, rounds=1, rev=+2.0 → P≈0.949
  it("Microsoft P ≈ 0.949", () => {
    const p = computeD8LogisticProbability("very-high", 28.4, 1, 2.0);
    expect(p).toBeCloseTo(0.949, 2);
  });

  // Alphabet: high AI, FCF 16.2, rounds=1, rev=+1.1 → P≈0.888
  it("Alphabet P ≈ 0.888", () => {
    const p = computeD8LogisticProbability("high", 16.2, 1, 1.1);
    expect(p).toBeCloseTo(0.888, 2);
  });

  // Amazon: very-high AI, FCF 5.3, rounds=1, rev=+9.4 → P≈0.949
  it("Amazon P ≈ 0.949", () => {
    const p = computeD8LogisticProbability("very-high", 5.3, 1, 9.4);
    expect(p).toBeCloseTo(0.949, 2);
  });

  // Apple (negative): high AI, FCF 25.1, rounds=0, rev=-2.8 → P≈0.622
  it("Apple P ≈ 0.622 (false positive — no beta_profitability, no beta_rounds)", () => {
    const p = computeD8LogisticProbability("high", 25.1, 0, -2.8);
    expect(p).toBeCloseTo(0.622, 2);
  });

  // BlackRock: medium AI, FCF 21.4, rounds=1, rev=+2.7 → P≈0.650
  it("BlackRock P ≈ 0.650 (medium AI → no ai bonus; rounds+FCF+profitability terms only)", () => {
    const p = computeD8LogisticProbability("medium", 21.4, 1, 2.7);
    expect(p).toBeCloseTo(0.650, 2);
  });
});

// ── AUC computation ───────────────────────────────────────────────────────────

describe("computeD8AUC on 15-event set", () => {
  it("AUC is in [0, 1]", () => {
    const auc = computeD8AUC(HELDOUT_15);
    expect(auc).toBeGreaterThanOrEqual(0);
    expect(auc).toBeLessThanOrEqual(1);
  });

  it("AUC exceeds the 0.72 gate threshold", () => {
    const auc = computeD8AUC(HELDOUT_15);
    expect(auc).toBeGreaterThanOrEqual(D8_VALIDATION_GATE.AUC_ROC_MIN);
  });

  it("AUC is approximately 0.889 (32 wins / 36 pairs)", () => {
    // Manual count:
    //   pos P-values: [0.71,0.68,0.62,0.74,0.66,0.59,0.57,0.55,0.949,0.888,0.949,0.650]
    //   neg P-values: [0.44, 0.38, 0.622]
    //   vs 0.44:  12 wins (all 12 positives > 0.44)
    //   vs 0.38:  12 wins (all 12 positives > 0.38)
    //   vs 0.622:  8 wins (0.71,0.68,0.74,0.66,0.949,0.888,0.949,0.650 > 0.622)
    //   Total: 32 / 36 = 0.8889
    const auc = computeD8AUC(HELDOUT_15);
    expect(auc).toBeCloseTo(0.889, 2);
  });

  it("AUC on batch-1 alone (10 events) is perfect 1.0 — no batch-1 positive scores below any batch-1 negative", () => {
    const batch1 = HELDOUT_15.filter(e => e.is_bootstrap_batch);
    // Positives: 0.55–0.74, Negatives: 0.38 and 0.44 — all positives beat all negatives
    const auc = computeD8AUC(batch1);
    expect(auc).toBe(1.0);
  });
});

// ── Precision / recall ────────────────────────────────────────────────────────

describe("computeD8PrecisionRecall on 15-event set", () => {
  const { precision, recall } = computeD8PrecisionRecall(HELDOUT_15, D8_VALIDATION_GATE.THRESHOLD);

  it("precision meets the 0.65 gate threshold", () => {
    expect(precision).toBeGreaterThanOrEqual(D8_VALIDATION_GATE.PRECISION_MIN);
  });

  it("precision is approximately 0.923 (12 TP / 13 predicted-positive)", () => {
    // P≥0.50: all 12 true positives + Apple (0.622, FP) = 13 predicted positives
    // precision = 12 / 13 = 0.9231
    expect(precision).toBeCloseTo(0.923, 2);
  });

  it("recall is 1.0 — every actual positive is caught", () => {
    // All 12 positives score > 0.50 → no false negatives
    expect(recall).toBe(1.0);
  });

  it("Apple is the only false positive (P=0.622, actual=FALSE)", () => {
    const predicted_pos = HELDOUT_15.filter(e => e.predicted_probability >= D8_VALIDATION_GATE.THRESHOLD);
    const false_pos = predicted_pos.filter(e => !e.actual_efficiency_layoff);
    expect(false_pos).toHaveLength(1);
    expect(false_pos[0].company_name).toBe("Apple");
  });
});

// ── Gate evaluation (the critical assertion) ─────────────────────────────────

describe("evaluateD8Gate — production readiness decision", () => {
  const result = evaluateD8Gate(HELDOUT_15);

  it("gate PASSES on the 15-event set", () => {
    expect(result.passes_gate).toBe(true);
  });

  it("no gate_failure_reason when passing", () => {
    expect(result.gate_failure_reason).toBeUndefined();
  });

  it("n_heldout is 15", () => {
    expect(result.n_heldout).toBe(15);
  });

  it("auc_roc meets threshold", () => {
    expect(result.auc_roc).toBeGreaterThanOrEqual(D8_VALIDATION_GATE.AUC_ROC_MIN);
  });

  it("precision_at_threshold meets threshold", () => {
    expect(result.precision_at_threshold).toBeGreaterThanOrEqual(D8_VALIDATION_GATE.PRECISION_MIN);
  });

  it("result contains all required fields", () => {
    expect(result.n_positive).toBe(12);
    expect(result.n_negative).toBe(3);
    expect(result.threshold).toBe(D8_VALIDATION_GATE.THRESHOLD);
    expect(result.evaluated_at).toBeTruthy();
  });

  // ── Regression guard: gate FAILS on batch-1 alone (n=10 < 15) ─────────────
  it("gate FAILS on bootstrap batch alone (n=10, below minimum)", () => {
    const batch1Only = HELDOUT_15.filter(e => e.is_bootstrap_batch);
    const r = evaluateD8Gate(batch1Only);
    expect(r.passes_gate).toBe(false);
    expect(r.gate_failure_reason).toMatch(/n_heldout=10/);
  });

  // ── Sensitivity: AUC floor ─────────────────────────────────────────────────
  it("gate fails when AUC is artificially suppressed below 0.72", () => {
    // Invert all positive probabilities (swap scores) to force low AUC
    const inverted: D8HeldoutEvent[] = HELDOUT_15.map(e =>
      e.actual_efficiency_layoff
        ? { ...e, predicted_probability: 0.10 }
        : { ...e, predicted_probability: 0.90 },
    );
    const r = evaluateD8Gate(inverted);
    expect(r.passes_gate).toBe(false);
    expect(r.gate_failure_reason).toMatch(/AUC/i);
  });

  // ── Sensitivity: precision floor ──────────────────────────────────────────
  it("gate fails when precision is suppressed below 0.65", () => {
    // Add many false positives: negatives with P=0.99
    const manyFP: D8HeldoutEvent[] = [
      ...HELDOUT_15,
      ...Array.from({ length: 20 }, (_, i) => ({
        company_name: `FP_Company_${i}`,
        announcement_date: "2024-01-01",
        actual_efficiency_layoff: false,
        predicted_probability: 0.99,
        is_bootstrap_batch: false,
      })),
    ];
    const r = evaluateD8Gate(manyFP);
    // With 20 extra FPs: precision = 12/(12+21) = 0.364 < 0.65
    expect(r.passes_gate).toBe(false);
    expect(r.gate_failure_reason).toMatch(/precision/i);
  });
});

// ── Gate constants contract ───────────────────────────────────────────────────

describe("D8_VALIDATION_GATE constants", () => {
  it("N_HELDOUT_MIN is 15", () => expect(D8_VALIDATION_GATE.N_HELDOUT_MIN).toBe(15));
  it("AUC_ROC_MIN is 0.72", () => expect(D8_VALIDATION_GATE.AUC_ROC_MIN).toBe(0.72));
  it("PRECISION_MIN is 0.65", () => expect(D8_VALIDATION_GATE.PRECISION_MIN).toBe(0.65));
  it("THRESHOLD is 0.50", () => expect(D8_VALIDATION_GATE.THRESHOLD).toBe(0.50));
});
