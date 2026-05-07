// LayoffContext.tsx
// State management for the Layoff Calculator — v2.1 (+ oracleKey)
import React, { createContext, useContext, useReducer, ReactNode } from "react";
import {
  ScoreResult,
  UserFactors,
} from "../services/layoffScoreEngine";
import { ScoreHistoryEntry } from "../services/scoreStorageService";
import { CompanyData } from "../data/companyDatabase";
import type { HybridResult } from "../types/hybridResult";

export interface LayoffState {
  companyName: string | null;
  companyData: CompanyData | null; // ← replaces window.__lastSelectedCompany
  roleTitle: string | null;
  department: string | null;
  /** Resolved oracle key from MASTER_CAREER_INTELLIGENCE, e.g. "sw_backend" */
  oracleKey: string | null;
  userFactors: UserFactors | null;
  scoreResult: ScoreResult | HybridResult | null;
  scoreHistory: ScoreHistoryEntry[];
  alertDrift: {
    drift: number;
    direction: string;
    from: number;
    to: number;
    fromDate: string;
    daysSince: number;
  } | null;
  isCalculating: boolean;
  hasCompletedAssessment: boolean;
  historySaveCounter: number; // ← triggers history refresh
  skillIntents: Record<string, "protect" | "pivot">;
  quizAnswers: Record<number, number>;
  initialWorkTypeKey: string | null;
  initialIndustryKey: string | null;
  showToast: {
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null;
}

type LayoffAction =
  | { type: "SET_INPUTS"; payload: Partial<LayoffState> }
  | { type: "SET_COMPANY_DATA"; payload: CompanyData | null }
  | { type: "SET_ORACLE_KEY"; payload: string }
  | { type: "SET_CALCULATING"; payload: boolean }
  | { type: "SET_SCORE_RESULT"; payload: ScoreResult | HybridResult }
  | { type: "SET_HISTORY"; payload: ScoreHistoryEntry[] }
  | { type: "SET_ALERT_DRIFT"; payload: LayoffState["alertDrift"] }
  | { type: "INCREMENT_SAVE_COUNTER" }
  | { type: "SHOW_TOAST"; payload: LayoffState["showToast"] }
  | { type: "HIDE_TOAST" }
  | { type: "RESET" };

const initialState: LayoffState = {
  companyName: null,
  companyData: null,
  roleTitle: null,
  department: null,
  oracleKey: null,
  userFactors: null,
  scoreResult: null,
  scoreHistory: [],
  alertDrift: null,
  isCalculating: false,
  hasCompletedAssessment: false,
  historySaveCounter: 0,
  skillIntents: {},
  quizAnswers: {},
  initialWorkTypeKey: null,
  initialIndustryKey: null,
  showToast: null,
};

const LayoffContext = createContext<{
  state: LayoffState;
  dispatch: React.Dispatch<LayoffAction>;
} | null>(null);

const layoffReducer = (
  state: LayoffState,
  action: LayoffAction,
): LayoffState => {
  switch (action.type) {
    case "SET_INPUTS":
      return { ...state, ...action.payload };
    case "SET_COMPANY_DATA":
      return {
        ...state,
        companyData: action.payload,
        companyName: action.payload?.name || "",
      };
    case "SET_ORACLE_KEY":
      return { ...state, oracleKey: action.payload };
    case "SET_CALCULATING":
      return { ...state, isCalculating: action.payload };
    case "SET_SCORE_RESULT":
      return {
        ...state,
        scoreResult: action.payload,
        isCalculating: false,
        hasCompletedAssessment: true,
      };
    case "SET_HISTORY":
      return { ...state, scoreHistory: action.payload };
    case "SET_ALERT_DRIFT":
      return { ...state, alertDrift: action.payload };
    case "INCREMENT_SAVE_COUNTER":
      return { ...state, historySaveCounter: state.historySaveCounter + 1 };
    case "SHOW_TOAST":
      return { ...state, showToast: action.payload };
    case "HIDE_TOAST":
      return { ...state, showToast: null };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
};

export const LayoffProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(layoffReducer, initialState);
  return (
    <LayoffContext.Provider value={{ state, dispatch }}>
      {children}
    </LayoffContext.Provider>
  );
};

export const useLayoff = () => {
  const context = useContext(LayoffContext);
  if (!context) throw new Error("useLayoff must be used within LayoffProvider");
  return context;
};
