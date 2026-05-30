// ═══════════════════════════════════════════════════════════
// riskEngine.ts — Re-exports from riskData + riskFormula
// Maintained for backward compatibility with existing imports
// ═══════════════════════════════════════════════════════════

// Legacy re-exports maintained for backward compatibility with existing imports
export { 
  calculateD1 as getD1,
  calculateD2 as getD2,
  calculateD3 as getD3,
  calculateD5 as getCountryRisk,
  calculateD4 as getExpRisk_v2,
  calculateScore,
  getScoreColor
} from "./riskFormula";
import { calculateScore } from "./riskFormula";

// getVerdict / getTimeline / getUrgency re-exported from riskFormula so that
// ALL consumers use the same <25/<50/<70 bands — previously these legacy stubs
// used INVERTED >=80/60/40 thresholds that made score 45 print "Moderate risk"
// instead of "Resilient", contradicting the score ring colour.
export { getVerdict, getTimeline, getUrgency } from "./riskFormula";

export { calculateScore as default, calculateScore as calculateScoreDefault };



