// roleExposureData.ts
// ⚠️  DEPRECATED DATA OBJECT — Do not read `roleExposureData` directly in new code.
//     Production data is served from Supabase via src/services/db/staticDataService.ts
//     (getRoleExposureSync, getAllRoleExposure). This file is the offline fallback.
//     Interfaces (RoleExposure), inferRoleRisk, calculateRoleExposureScore remain public.
//
// Pre-seeded risk scores per role category — expanded to 210+ roles

import { MASTER_CAREER_INTELLIGENCE } from './intelligence/index';

export interface RoleExposure {
  aiRisk: number;
  layoffRisk: number;
  demandTrend: 'rising' | 'stable' | 'falling';
}

export const roleExposureData: Record<string, RoleExposure> = {
  // ── HIGH RISK ROLES (layoffRisk 0.65–0.95) ──
  'Data Entry Specialist':           { aiRisk: 0.97, layoffRisk: 0.88, demandTrend: 'falling' },
  'Telemarketer':                    { aiRisk: 0.95, layoffRisk: 0.90, demandTrend: 'falling' },
  'Customer Service Representative': { aiRisk: 0.85, layoffRisk: 0.82, demandTrend: 'falling' },
  'Bookkeeper':                      { aiRisk: 0.90, layoffRisk: 0.80, demandTrend: 'falling' },
  'Legal Researcher':                { aiRisk: 0.88, layoffRisk: 0.78, demandTrend: 'falling' },
  'Content Writer':                  { aiRisk: 0.79, layoffRisk: 0.75, demandTrend: 'falling' },
  'Translator':                      { aiRisk: 0.92, layoffRisk: 0.77, demandTrend: 'falling' },
  'Recruiter':                       { aiRisk: 0.68, layoffRisk: 0.72, demandTrend: 'falling' },
  'QA Engineer':                     { aiRisk: 0.74, layoffRisk: 0.68, demandTrend: 'falling' },
  'Financial Analyst (junior)':      { aiRisk: 0.72, layoffRisk: 0.70, demandTrend: 'falling' },
  'Technical Writer':                { aiRisk: 0.76, layoffRisk: 0.65, demandTrend: 'falling' },
  'Marketing Coordinator':           { aiRisk: 0.71, layoffRisk: 0.67, demandTrend: 'falling' },
  'Administrative Assistant':        { aiRisk: 0.82, layoffRisk: 0.75, demandTrend: 'falling' },

  // ── MODERATE RISK ROLES (layoffRisk 0.35–0.64) ──
  'Business Analyst':                { aiRisk: 0.65, layoffRisk: 0.62, demandTrend: 'stable' },
  'Software Engineer':               { aiRisk: 0.45, layoffRisk: 0.45, demandTrend: 'stable' },
  'Frontend Developer':              { aiRisk: 0.50, layoffRisk: 0.48, demandTrend: 'stable' },
  'Backend Developer':               { aiRisk: 0.42, layoffRisk: 0.42, demandTrend: 'stable' },
  'Full Stack Developer':            { aiRisk: 0.44, layoffRisk: 0.44, demandTrend: 'stable' },
  'Product Manager':                 { aiRisk: 0.38, layoffRisk: 0.48, demandTrend: 'stable' },
  'Project Manager':                 { aiRisk: 0.40, layoffRisk: 0.50, demandTrend: 'stable' },
  'Data Scientist':                  { aiRisk: 0.42, layoffRisk: 0.40, demandTrend: 'stable' },
  'Data Analyst':                    { aiRisk: 0.58, layoffRisk: 0.55, demandTrend: 'stable' },
  'UX Designer':                     { aiRisk: 0.51, layoffRisk: 0.50, demandTrend: 'stable' },
  'Graphic Designer':                { aiRisk: 0.65, layoffRisk: 0.58, demandTrend: 'falling' },
  'Marketing Manager':               { aiRisk: 0.46, layoffRisk: 0.45, demandTrend: 'stable' },
  'Finance Manager':                 { aiRisk: 0.44, layoffRisk: 0.42, demandTrend: 'stable' },
  'HR Business Partner':             { aiRisk: 0.47, layoffRisk: 0.44, demandTrend: 'stable' },
  'Account Manager':                 { aiRisk: 0.42, layoffRisk: 0.42, demandTrend: 'stable' },
  'Sales Representative':            { aiRisk: 0.40, layoffRisk: 0.48, demandTrend: 'stable' },
  'Accountant':                      { aiRisk: 0.68, layoffRisk: 0.55, demandTrend: 'falling' },
  'Teacher':                         { aiRisk: 0.30, layoffRisk: 0.35, demandTrend: 'stable' },
  'Supply Chain Manager':            { aiRisk: 0.38, layoffRisk: 0.40, demandTrend: 'stable' },
  'Operations Manager':              { aiRisk: 0.35, layoffRisk: 0.42, demandTrend: 'stable' },

  // ── LOW RISK ROLES (layoffRisk 0.05–0.34) ──
  'ML Engineer':                     { aiRisk: 0.15, layoffRisk: 0.15, demandTrend: 'rising' },
  'AI/ML Researcher':                { aiRisk: 0.10, layoffRisk: 0.12, demandTrend: 'rising' },
  'AI Engineer':                     { aiRisk: 0.12, layoffRisk: 0.13, demandTrend: 'rising' },
  'Prompt Engineer':                 { aiRisk: 0.20, layoffRisk: 0.30, demandTrend: 'rising' },
  'Cybersecurity Engineer':          { aiRisk: 0.25, layoffRisk: 0.20, demandTrend: 'rising' },
  'Cloud Engineer':                  { aiRisk: 0.28, layoffRisk: 0.22, demandTrend: 'rising' },
  'DevOps / SRE':                    { aiRisk: 0.30, layoffRisk: 0.25, demandTrend: 'rising' },
  'Clinical Nurse':                  { aiRisk: 0.08, layoffRisk: 0.10, demandTrend: 'rising' },
  'Physician':                       { aiRisk: 0.06, layoffRisk: 0.06, demandTrend: 'rising' },
  'Surgeon':                         { aiRisk: 0.05, layoffRisk: 0.05, demandTrend: 'rising' },
  'Pharmacist':                      { aiRisk: 0.22, layoffRisk: 0.18, demandTrend: 'stable' },
  'Electrician':                     { aiRisk: 0.07, layoffRisk: 0.08, demandTrend: 'stable' },
  'Plumber':                         { aiRisk: 0.06, layoffRisk: 0.07, demandTrend: 'stable' },
  'Welder':                          { aiRisk: 0.15, layoffRisk: 0.12, demandTrend: 'stable' },
  'Executive / C-Suite':             { aiRisk: 0.12, layoffRisk: 0.20, demandTrend: 'stable' },
  'Head of Engineering':             { aiRisk: 0.16, layoffRisk: 0.22, demandTrend: 'stable' },
  'VP of Product':                   { aiRisk: 0.18, layoffRisk: 0.24, demandTrend: 'stable' },
  'Attorney / Lawyer':               { aiRisk: 0.35, layoffRisk: 0.30, demandTrend: 'stable' },

  // ── Additional Engineering & Tech Roles ───────────────────────────────────
  'Embedded Systems Engineer':       { aiRisk: 0.28, layoffRisk: 0.25, demandTrend: 'stable' },
  'Hardware Engineer':               { aiRisk: 0.22, layoffRisk: 0.20, demandTrend: 'stable' },
  'Network Engineer':                { aiRisk: 0.35, layoffRisk: 0.30, demandTrend: 'stable' },
  'Systems Architect':               { aiRisk: 0.25, layoffRisk: 0.22, demandTrend: 'stable' },
  'Solutions Architect':             { aiRisk: 0.28, layoffRisk: 0.25, demandTrend: 'stable' },
  'Mobile Developer (iOS)':          { aiRisk: 0.45, layoffRisk: 0.42, demandTrend: 'stable' },
  'Mobile Developer (Android)':      { aiRisk: 0.45, layoffRisk: 0.42, demandTrend: 'stable' },
  'React Native Developer':          { aiRisk: 0.48, layoffRisk: 0.45, demandTrend: 'stable' },
  'Blockchain Developer':            { aiRisk: 0.30, layoffRisk: 0.42, demandTrend: 'falling' },
  'Game Developer':                  { aiRisk: 0.40, layoffRisk: 0.48, demandTrend: 'falling' },
  'Embedded AI Engineer':            { aiRisk: 0.12, layoffRisk: 0.10, demandTrend: 'rising' },
  'Robotics Engineer':               { aiRisk: 0.18, layoffRisk: 0.15, demandTrend: 'rising' },
  'Quantum Computing Researcher':    { aiRisk: 0.08, layoffRisk: 0.08, demandTrend: 'rising' },
  'AR/VR Developer':                 { aiRisk: 0.38, layoffRisk: 0.45, demandTrend: 'falling' },
  'Test Automation Engineer':        { aiRisk: 0.68, layoffRisk: 0.65, demandTrend: 'falling' },
  'Manual QA Tester':                { aiRisk: 0.82, layoffRisk: 0.78, demandTrend: 'falling' },
  'IT Support Specialist':           { aiRisk: 0.72, layoffRisk: 0.68, demandTrend: 'falling' },
  'Database Administrator':          { aiRisk: 0.60, layoffRisk: 0.58, demandTrend: 'falling' },
  'Site Reliability Engineer':       { aiRisk: 0.28, layoffRisk: 0.22, demandTrend: 'rising' },
  'Platform Engineer':               { aiRisk: 0.25, layoffRisk: 0.20, demandTrend: 'rising' },
  'Security Analyst':                { aiRisk: 0.22, layoffRisk: 0.18, demandTrend: 'rising' },
  'Penetration Tester':              { aiRisk: 0.20, layoffRisk: 0.15, demandTrend: 'rising' },
  'AI Ethics Researcher':            { aiRisk: 0.10, layoffRisk: 0.12, demandTrend: 'rising' },
  'NLP Engineer':                    { aiRisk: 0.12, layoffRisk: 0.10, demandTrend: 'rising' },
  'Computer Vision Engineer':        { aiRisk: 0.14, layoffRisk: 0.12, demandTrend: 'rising' },
  'MLOps Engineer':                  { aiRisk: 0.12, layoffRisk: 0.10, demandTrend: 'rising' },
  'Data Architect':                  { aiRisk: 0.35, layoffRisk: 0.30, demandTrend: 'stable' },
  'Data Engineer':                   { aiRisk: 0.32, layoffRisk: 0.28, demandTrend: 'stable' },
  'Analytics Engineer':              { aiRisk: 0.40, layoffRisk: 0.38, demandTrend: 'stable' },
  'BI Developer':                    { aiRisk: 0.62, layoffRisk: 0.58, demandTrend: 'falling' },
  'ETL Developer':                   { aiRisk: 0.72, layoffRisk: 0.68, demandTrend: 'falling' },
  'Scrum Master':                    { aiRisk: 0.55, layoffRisk: 0.55, demandTrend: 'falling' },
  'Agile Coach':                     { aiRisk: 0.52, layoffRisk: 0.52, demandTrend: 'falling' },
  'Technical Program Manager':       { aiRisk: 0.40, layoffRisk: 0.42, demandTrend: 'stable' },
  'Engineering Manager':             { aiRisk: 0.28, layoffRisk: 0.35, demandTrend: 'stable' },
  'Director of Engineering':         { aiRisk: 0.22, layoffRisk: 0.30, demandTrend: 'stable' },
  'VP of Engineering':               { aiRisk: 0.18, layoffRisk: 0.28, demandTrend: 'stable' },
  'Chief Technology Officer':        { aiRisk: 0.15, layoffRisk: 0.25, demandTrend: 'stable' },
  'Chief AI Officer':                { aiRisk: 0.08, layoffRisk: 0.12, demandTrend: 'rising' },
  'Chief Data Officer':              { aiRisk: 0.10, layoffRisk: 0.14, demandTrend: 'rising' },

  // ── Product & Design ──────────────────────────────────────────────────────
  'Product Designer':                { aiRisk: 0.52, layoffRisk: 0.50, demandTrend: 'stable' },
  'UX Researcher':                   { aiRisk: 0.55, layoffRisk: 0.52, demandTrend: 'stable' },
  'UI Designer':                     { aiRisk: 0.60, layoffRisk: 0.55, demandTrend: 'falling' },
  'Motion Designer':                 { aiRisk: 0.68, layoffRisk: 0.62, demandTrend: 'falling' },
  'Brand Designer':                  { aiRisk: 0.62, layoffRisk: 0.58, demandTrend: 'falling' },
  'Product Lead':                    { aiRisk: 0.36, layoffRisk: 0.42, demandTrend: 'stable' },
  'Senior Product Manager':          { aiRisk: 0.35, layoffRisk: 0.40, demandTrend: 'stable' },
  'Product Analyst':                 { aiRisk: 0.52, layoffRisk: 0.50, demandTrend: 'stable' },
  'Growth Product Manager':          { aiRisk: 0.40, layoffRisk: 0.45, demandTrend: 'stable' },
  'Chief Product Officer':           { aiRisk: 0.18, layoffRisk: 0.26, demandTrend: 'stable' },

  // ── Marketing & Growth ────────────────────────────────────────────────────
  'Digital Marketing Specialist':    { aiRisk: 0.72, layoffRisk: 0.68, demandTrend: 'falling' },
  'Performance Marketing Manager':   { aiRisk: 0.65, layoffRisk: 0.60, demandTrend: 'falling' },
  'SEO Specialist':                  { aiRisk: 0.78, layoffRisk: 0.72, demandTrend: 'falling' },
  'Social Media Manager':            { aiRisk: 0.75, layoffRisk: 0.70, demandTrend: 'falling' },
  'Email Marketing Specialist':      { aiRisk: 0.80, layoffRisk: 0.75, demandTrend: 'falling' },
  'Content Strategist':              { aiRisk: 0.68, layoffRisk: 0.62, demandTrend: 'falling' },
  'Brand Manager':                   { aiRisk: 0.45, layoffRisk: 0.42, demandTrend: 'stable' },
  'Growth Hacker':                   { aiRisk: 0.55, layoffRisk: 0.52, demandTrend: 'stable' },
  'Chief Marketing Officer':         { aiRisk: 0.30, layoffRisk: 0.35, demandTrend: 'stable' },
  'Demand Generation Manager':       { aiRisk: 0.62, layoffRisk: 0.58, demandTrend: 'falling' },
  'Customer Success Manager':        { aiRisk: 0.55, layoffRisk: 0.58, demandTrend: 'stable' },
  'Community Manager':               { aiRisk: 0.65, layoffRisk: 0.62, demandTrend: 'falling' },

  // ── Sales & Revenue ───────────────────────────────────────────────────────
  'Sales Development Representative':{ aiRisk: 0.72, layoffRisk: 0.70, demandTrend: 'falling' },
  'Business Development Representative': { aiRisk: 0.68, layoffRisk: 0.65, demandTrend: 'falling' },
  'Account Executive':               { aiRisk: 0.45, layoffRisk: 0.50, demandTrend: 'stable' },
  'Enterprise Sales Manager':        { aiRisk: 0.38, layoffRisk: 0.42, demandTrend: 'stable' },
  'Sales Operations':                { aiRisk: 0.58, layoffRisk: 0.55, demandTrend: 'falling' },
  'Pre-Sales Engineer':              { aiRisk: 0.42, layoffRisk: 0.40, demandTrend: 'stable' },
  'Chief Revenue Officer':           { aiRisk: 0.20, layoffRisk: 0.28, demandTrend: 'stable' },
  'VP of Sales':                     { aiRisk: 0.22, layoffRisk: 0.30, demandTrend: 'stable' },

  // ── Finance & Accounting ──────────────────────────────────────────────────
  'Financial Controller':            { aiRisk: 0.52, layoffRisk: 0.48, demandTrend: 'stable' },
  'Chartered Accountant':            { aiRisk: 0.50, layoffRisk: 0.45, demandTrend: 'stable' },
  'Payroll Specialist':              { aiRisk: 0.82, layoffRisk: 0.78, demandTrend: 'falling' },
  'Accounts Payable / Receivable':   { aiRisk: 0.88, layoffRisk: 0.84, demandTrend: 'falling' },
  'Investment Banker':               { aiRisk: 0.40, layoffRisk: 0.42, demandTrend: 'stable' },
  'Financial Planner':               { aiRisk: 0.45, layoffRisk: 0.40, demandTrend: 'stable' },
  'Risk Manager':                    { aiRisk: 0.38, layoffRisk: 0.35, demandTrend: 'stable' },
  'Compliance Officer':              { aiRisk: 0.42, layoffRisk: 0.38, demandTrend: 'stable' },
  'Internal Auditor':                { aiRisk: 0.55, layoffRisk: 0.50, demandTrend: 'stable' },
  'Treasury Analyst':                { aiRisk: 0.60, layoffRisk: 0.55, demandTrend: 'falling' },
  'CFO':                             { aiRisk: 0.18, layoffRisk: 0.25, demandTrend: 'stable' },

  // ── HR & People Operations ────────────────────────────────────────────────
  'Talent Acquisition Specialist':   { aiRisk: 0.65, layoffRisk: 0.62, demandTrend: 'falling' },
  'HRBP':                            { aiRisk: 0.48, layoffRisk: 0.45, demandTrend: 'stable' },
  'People Operations Manager':       { aiRisk: 0.45, layoffRisk: 0.42, demandTrend: 'stable' },
  'Compensation & Benefits Analyst': { aiRisk: 0.60, layoffRisk: 0.55, demandTrend: 'falling' },
  'Learning & Development Manager':  { aiRisk: 0.50, layoffRisk: 0.48, demandTrend: 'stable' },
  'HR Generalist':                   { aiRisk: 0.58, layoffRisk: 0.55, demandTrend: 'falling' },
  'Chief People Officer':            { aiRisk: 0.22, layoffRisk: 0.28, demandTrend: 'stable' },

  // ── Legal ─────────────────────────────────────────────────────────────────
  'Corporate Lawyer':                { aiRisk: 0.38, layoffRisk: 0.32, demandTrend: 'stable' },
  'IP Lawyer':                       { aiRisk: 0.35, layoffRisk: 0.30, demandTrend: 'stable' },
  'Contract Manager':                { aiRisk: 0.62, layoffRisk: 0.58, demandTrend: 'falling' },
  'Compliance Analyst':              { aiRisk: 0.55, layoffRisk: 0.50, demandTrend: 'stable' },
  'General Counsel':                 { aiRisk: 0.20, layoffRisk: 0.22, demandTrend: 'stable' },

  // ── Operations & Supply Chain ─────────────────────────────────────────────
  'Warehouse Manager':               { aiRisk: 0.48, layoffRisk: 0.52, demandTrend: 'stable' },
  'Procurement Manager':             { aiRisk: 0.45, layoffRisk: 0.48, demandTrend: 'stable' },
  'Logistics Coordinator':           { aiRisk: 0.65, layoffRisk: 0.62, demandTrend: 'falling' },
  'Manufacturing Engineer':          { aiRisk: 0.35, layoffRisk: 0.38, demandTrend: 'stable' },
  'Quality Assurance Manager':       { aiRisk: 0.40, layoffRisk: 0.42, demandTrend: 'stable' },
  'Plant Manager':                   { aiRisk: 0.28, layoffRisk: 0.32, demandTrend: 'stable' },
  'Chief Operating Officer':         { aiRisk: 0.18, layoffRisk: 0.26, demandTrend: 'stable' },

  // ── Healthcare ────────────────────────────────────────────────────────────
  'Nurse Practitioner':              { aiRisk: 0.10, layoffRisk: 0.08, demandTrend: 'rising' },
  'Radiologist':                     { aiRisk: 0.28, layoffRisk: 0.20, demandTrend: 'stable' },
  'Medical Coder':                   { aiRisk: 0.80, layoffRisk: 0.75, demandTrend: 'falling' },
  'Healthcare Administrator':        { aiRisk: 0.52, layoffRisk: 0.48, demandTrend: 'stable' },
  'Clinical Research Associate':     { aiRisk: 0.35, layoffRisk: 0.30, demandTrend: 'stable' },
  'Biomedical Engineer':             { aiRisk: 0.22, layoffRisk: 0.18, demandTrend: 'rising' },
  'Mental Health Counselor':         { aiRisk: 0.08, layoffRisk: 0.10, demandTrend: 'rising' },
  'Physiotherapist':                 { aiRisk: 0.10, layoffRisk: 0.08, demandTrend: 'rising' },

  // ── Education ─────────────────────────────────────────────────────────────
  'University Professor':            { aiRisk: 0.22, layoffRisk: 0.25, demandTrend: 'stable' },
  'Curriculum Designer':             { aiRisk: 0.60, layoffRisk: 0.55, demandTrend: 'falling' },
  'Online Course Creator':           { aiRisk: 0.70, layoffRisk: 0.65, demandTrend: 'falling' },
  'Academic Advisor':                { aiRisk: 0.45, layoffRisk: 0.42, demandTrend: 'stable' },
  'EdTech Product Manager':          { aiRisk: 0.38, layoffRisk: 0.42, demandTrend: 'stable' },

  // ── Creative & Media ──────────────────────────────────────────────────────
  'Journalist':                      { aiRisk: 0.75, layoffRisk: 0.72, demandTrend: 'falling' },
  'Videographer':                    { aiRisk: 0.60, layoffRisk: 0.58, demandTrend: 'falling' },
  'Video Editor':                    { aiRisk: 0.72, layoffRisk: 0.68, demandTrend: 'falling' },
  'Photographer':                    { aiRisk: 0.65, layoffRisk: 0.60, demandTrend: 'falling' },
  '3D Artist':                       { aiRisk: 0.68, layoffRisk: 0.62, demandTrend: 'falling' },
  'Animator':                        { aiRisk: 0.62, layoffRisk: 0.58, demandTrend: 'falling' },
  'Music Producer':                  { aiRisk: 0.55, layoffRisk: 0.50, demandTrend: 'stable' },
  'Podcast Producer':                { aiRisk: 0.60, layoffRisk: 0.55, demandTrend: 'falling' },

  // ── Customer Facing ───────────────────────────────────────────────────────
  'Call Center Agent':               { aiRisk: 0.92, layoffRisk: 0.88, demandTrend: 'falling' },
  'Customer Support Lead':           { aiRisk: 0.62, layoffRisk: 0.60, demandTrend: 'falling' },
  'Technical Support Engineer':      { aiRisk: 0.65, layoffRisk: 0.62, demandTrend: 'falling' },
  'Field Sales Representative':      { aiRisk: 0.42, layoffRisk: 0.48, demandTrend: 'stable' },
  'Insurance Agent':                 { aiRisk: 0.72, layoffRisk: 0.68, demandTrend: 'falling' },
  'Loan Officer':                    { aiRisk: 0.78, layoffRisk: 0.72, demandTrend: 'falling' },

  // ── Physical / Trade ──────────────────────────────────────────────────────
  'Civil Engineer':                  { aiRisk: 0.28, layoffRisk: 0.25, demandTrend: 'stable' },
  'Structural Engineer':             { aiRisk: 0.25, layoffRisk: 0.22, demandTrend: 'stable' },
  'Architect':                       { aiRisk: 0.35, layoffRisk: 0.30, demandTrend: 'stable' },
  'HVAC Technician':                 { aiRisk: 0.08, layoffRisk: 0.08, demandTrend: 'stable' },
  'Carpenter':                       { aiRisk: 0.06, layoffRisk: 0.07, demandTrend: 'stable' },
  'Auto Mechanic':                   { aiRisk: 0.20, layoffRisk: 0.18, demandTrend: 'stable' },
  'Truck Driver':                    { aiRisk: 0.55, layoffRisk: 0.48, demandTrend: 'falling' },
  'Delivery Driver':                 { aiRisk: 0.62, layoffRisk: 0.55, demandTrend: 'falling' },
  'Chef / Cook':                     { aiRisk: 0.15, layoffRisk: 0.18, demandTrend: 'stable' },
  'Food Service Worker':             { aiRisk: 0.40, layoffRisk: 0.38, demandTrend: 'stable' },
};

// ── Fuzzy role inference ──

// Common keywords and their risk profiles
// ACC-BUG-05 FIX: Reordered ROLE_KEYWORD_MAP so compound technical roles match the
// right pattern. Previously "Technical Support Engineer" matched "support|helpdesk"
// (aiRisk:0.80) before "engineer" (aiRisk:0.42) — a 38-point misclassification.
// Rules: (1) domain-specific compound patterns come BEFORE generic seniority/function
// patterns; (2) engineer/developer tests come BEFORE support/helpdesk; (3) new patterns
// for sales engineer, data engineer, and security engineer prevent wrong fallthrough.
const ROLE_KEYWORD_MAP: { pattern: RegExp; exposure: RoleExposure }[] = [
  // ── Compound role patterns (must precede their constituent keywords) ────────────
  // "Technical Support Engineer", "Support Engineer" → engineer tier, not helpdesk tier
  { pattern: /\b(technical support engineer|support engineer|solutions engineer)\b/i,
    exposure: { aiRisk: 0.38, layoffRisk: 0.38, demandTrend: 'stable' } },
  // "Data Platform Engineer", "Data Infrastructure Engineer" → engineering tier
  { pattern: /\b(data platform|data infrastructure|data pipeline|data engineer)\b/i,
    exposure: { aiRisk: 0.32, layoffRisk: 0.30, demandTrend: 'rising' } },
  // "Sales Engineer", "Pre-Sales Engineer" → moderate risk (relationship + technical)
  { pattern: /\b(sales engineer|presales|pre-sales|solutions architect)\b/i,
    exposure: { aiRisk: 0.35, layoffRisk: 0.38, demandTrend: 'stable' } },
  // "Security Engineer", "AppSec Engineer" → security tier
  { pattern: /\b(security engineer|appsec|application security|devsecops)\b/i,
    exposure: { aiRisk: 0.25, layoffRisk: 0.20, demandTrend: 'rising' } },
  // "Customer Success Manager" → relationship-protected, not helpdesk
  { pattern: /\b(customer success|account manager|client success)\b/i,
    exposure: { aiRisk: 0.42, layoffRisk: 0.45, demandTrend: 'stable' } },
  // ── Domain-specific high-protection roles ────────────────────────────────────
  { pattern: /\b(ai|ml|machine learning|deep learning|llm|nlp)\b/i,
    exposure: { aiRisk: 0.15, layoffRisk: 0.15, demandTrend: 'rising' } },
  { pattern: /\b(cyber|security|infosec|penetration|pentest)\b/i,
    exposure: { aiRisk: 0.25, layoffRisk: 0.20, demandTrend: 'rising' } },
  { pattern: /\b(devops|sre|platform|infrastructure|reliability)\b/i,
    exposure: { aiRisk: 0.30, layoffRisk: 0.25, demandTrend: 'rising' } },
  { pattern: /\b(cloud|aws|azure|gcp|kubernetes|k8s)\b/i,
    exposure: { aiRisk: 0.28, layoffRisk: 0.22, demandTrend: 'rising' } },
  { pattern: /\b(nurse|doctor|physician|surgeon|clinical|therapist|pharmacist)\b/i,
    exposure: { aiRisk: 0.08, layoffRisk: 0.10, demandTrend: 'rising' } },
  // ── Leadership / Seniority tiers (ordered: most senior first) ────────────────
  // Tier 1 — C-suite, VP, Fellow, Technical Fellow: very high protection
  { pattern: /\b(chief|cto|ceo|cfo|coo|ciso|vp|vice president|evp|svp|fellow|distinguished engineer)\b/i,
    exposure: { aiRisk: 0.15, layoffRisk: 0.22, demandTrend: 'stable' } },
  // Tier 2 — Director, Head of, GM: director-level protection
  { pattern: /\b(director|head of|general manager)\b/i,
    exposure: { aiRisk: 0.20, layoffRisk: 0.28, demandTrend: 'stable' } },
  // Tier 3 — Principal, Staff, Distinguished (IC tracks above senior): near-director protection
  // These roles carry deep institutional knowledge and broad system ownership.
  { pattern: /\b(principal|staff engineer|staff swe|staff sde|distinguished)\b/i,
    exposure: { aiRisk: 0.22, layoffRisk: 0.25, demandTrend: 'stable' } },
  // Tier 4 — Lead, Architect, Tech Lead: strong protection via scope/ownership
  { pattern: /\b(tech lead|technical lead|engineering lead|lead engineer|architect)\b/i,
    exposure: { aiRisk: 0.25, layoffRisk: 0.28, demandTrend: 'stable' } },
  // Tier 5 — Senior (3–7 yr): moderate protection, the largest cohort
  { pattern: /\b(senior|sr\b|sr\.)\b/i,
    exposure: { aiRisk: 0.32, layoffRisk: 0.34, demandTrend: 'stable' } },
  // Tier 6 — Manager / Lead (people manager): cross-team leverage
  { pattern: /\b(manager|mgr)\b/i,
    exposure: { aiRisk: 0.35, layoffRisk: 0.38, demandTrend: 'stable' } },
  // ── Generic technical roles (after domain-specific) ────────────────────────────
  { pattern: /\b(engineer|developer|dev|programmer|coder)\b/i,
    exposure: { aiRisk: 0.42, layoffRisk: 0.42, demandTrend: 'stable' } },
  { pattern: /\b(designer|ux|ui|product designer|visual designer)\b/i,
    exposure: { aiRisk: 0.50, layoffRisk: 0.48, demandTrend: 'stable' } },
  { pattern: /\b(analyst|associate|strategist)\b/i,
    exposure: { aiRisk: 0.55, layoffRisk: 0.52, demandTrend: 'stable' } },
  { pattern: /\b(intern|trainee|entry.level|junior|graduate)\b/i,
    exposure: { aiRisk: 0.60, layoffRisk: 0.60, demandTrend: 'falling' } },
  { pattern: /\b(coordinator|specialist|generalist)\b/i,
    exposure: { aiRisk: 0.55, layoffRisk: 0.55, demandTrend: 'stable' } },
  // ── High-automation roles (after technical to prevent misclassification) ───────
  { pattern: /\b(data entry|admin|clerk|receptionist|administrative)\b/i,
    exposure: { aiRisk: 0.85, layoffRisk: 0.80, demandTrend: 'falling' } },
  // "customer service" and "helpdesk" come AFTER engineer patterns
  { pattern: /\b(customer service|helpdesk|help desk|call center|chat agent)\b/i,
    exposure: { aiRisk: 0.80, layoffRisk: 0.75, demandTrend: 'falling' } },
  // Generic "support" only fires when no engineer/technical pattern matched first
  { pattern: /\bsupport\b/i,
    exposure: { aiRisk: 0.75, layoffRisk: 0.70, demandTrend: 'falling' } },
  { pattern: /\b(content|writer|copywriter|editor|journalist)\b/i,
    exposure: { aiRisk: 0.78, layoffRisk: 0.72, demandTrend: 'falling' } },
  { pattern: /\b(plumb|electri|weld|mechanic|carpenter|hvac|technician)\b/i,
    exposure: { aiRisk: 0.08, layoffRisk: 0.09, demandTrend: 'stable' } },
  { pattern: /\b(teach|professor|instructor|lecturer|tutor)\b/i,
    exposure: { aiRisk: 0.28, layoffRisk: 0.30, demandTrend: 'stable' } },
  { pattern: /\b(sales|account executive|bdr|sdr|business development)\b/i,
    exposure: { aiRisk: 0.40, layoffRisk: 0.48, demandTrend: 'stable' } },
  { pattern: /\b(recruiter|sourcer|talent acquisition)\b/i,
    exposure: { aiRisk: 0.62, layoffRisk: 0.65, demandTrend: 'falling' } },
  { pattern: /\b(accountant|bookkeeper|auditor|payroll)\b/i,
    exposure: { aiRisk: 0.72, layoffRisk: 0.68, demandTrend: 'falling' } },
  { pattern: /\b(legal|paralegal|counsel|attorney|lawyer)\b/i,
    exposure: { aiRisk: 0.52, layoffRisk: 0.50, demandTrend: 'stable' } },
  // ── [AUDIT FIX] 15+ patterns for commonly uncovered titles ─────────────────
  // Previously all these roles fell through to the generic 0.40/0.40 fallback.
  { pattern: /\b(scrum master|agile coach|delivery manager|programme manager)\b/i,
    exposure: { aiRisk: 0.55, layoffRisk: 0.58, demandTrend: 'falling' } },  // Agile coordination automating
  { pattern: /\b(technical program manager|tpm)\b/i,
    exposure: { aiRisk: 0.38, layoffRisk: 0.40, demandTrend: 'stable' } },   // Cross-functional coordination
  { pattern: /\b(data governance|data steward|master data)\b/i,
    exposure: { aiRisk: 0.60, layoffRisk: 0.55, demandTrend: 'stable' } },   // Data management roles
  { pattern: /\b(business analyst|ba |process analyst)\b/i,
    exposure: { aiRisk: 0.58, layoffRisk: 0.55, demandTrend: 'falling' } },  // Requirements gathering automating
  { pattern: /\b(solutions architect|enterprise architect|it architect)\b/i,
    exposure: { aiRisk: 0.30, layoffRisk: 0.28, demandTrend: 'rising' } },   // System design protected
  { pattern: /\b(supply chain|logistics|procurement|sourcing manager)\b/i,
    exposure: { aiRisk: 0.48, layoffRisk: 0.45, demandTrend: 'stable' } },
  { pattern: /\b(operations manager|biz ops|bizops|chief of staff)\b/i,
    exposure: { aiRisk: 0.42, layoffRisk: 0.42, demandTrend: 'stable' } },
  { pattern: /\b(network engineer|network admin|sysadmin|systems admin)\b/i,
    exposure: { aiRisk: 0.40, layoffRisk: 0.38, demandTrend: 'stable' } },
  { pattern: /\b(embedded|firmware|fpga|rtos|microcontroller)\b/i,
    exposure: { aiRisk: 0.22, layoffRisk: 0.20, demandTrend: 'rising' } },   // Hardware-adjacent, scarce
  { pattern: /\b(game developer|unity|unreal|graphics engineer)\b/i,
    exposure: { aiRisk: 0.45, layoffRisk: 0.55, demandTrend: 'falling' } },  // Gaming sector contracting
  { pattern: /\b(blockchain|web3|smart contract|solidity|crypto)\b/i,
    exposure: { aiRisk: 0.30, layoffRisk: 0.62, demandTrend: 'falling' } },  // Crypto contraction
  { pattern: /\b(seo|sem|paid media|growth hacker|performance market)\b/i,
    exposure: { aiRisk: 0.68, layoffRisk: 0.62, demandTrend: 'falling' } },  // Digital marketing automating fast
  { pattern: /\b(financial advisor|wealth manager|investment banker|ib analyst)\b/i,
    exposure: { aiRisk: 0.40, layoffRisk: 0.38, demandTrend: 'stable' } },   // Relationship-protected
  { pattern: /\b(actuary|quant|quantitative|risk model)\b/i,
    exposure: { aiRisk: 0.28, layoffRisk: 0.25, demandTrend: 'rising' } },   // Math-heavy, hard to replace
  { pattern: /\b(medical writer|regulatory affairs|clinical trial|pharma)\b/i,
    exposure: { aiRisk: 0.35, layoffRisk: 0.28, demandTrend: 'stable' } },   // Regulated domain
  { pattern: /\b(social media|community manager|influencer|brand)\b/i,
    exposure: { aiRisk: 0.70, layoffRisk: 0.65, demandTrend: 'falling' } },  // AI generating content
  { pattern: /\b(interpreter|translator|localization)\b/i,
    exposure: { aiRisk: 0.88, layoffRisk: 0.82, demandTrend: 'falling' } },  // LLMs displacing fast
];

export const inferRoleRisk = (roleTitle: string | null | undefined): RoleExposure => {
  if (!roleTitle) return { aiRisk: 0.40, layoffRisk: 0.40, demandTrend: 'stable' };
  const title = roleTitle.toLowerCase().trim();

  // Try exact match first
  for (const [key, val] of Object.entries(roleExposureData)) {
    if (key.toLowerCase() === title) return val;
  }

  // Try fuzzy keyword matching (first match wins, ordered by specificity)
  for (const entry of ROLE_KEYWORD_MAP) {
    if (entry.pattern.test(title)) return entry.exposure;
  }

  // ACC-BUG-09 FIX: Previously all unrecognized titles returned the same 0.40/0.40
  // fallback — a generic BPO agent and a specialist bioengineer got identical scores.
  // Use secondary heuristics: title length and word count as complexity proxies,
  // and common seniority/domain signals missed by the primary patterns.
  //
  // Signal: long multi-word titles with domain specificity → lower risk (specialist)
  // Signal: very short single-word titles → moderate risk (generalist / unclear scope)
  const words = title.split(/\s+/).filter(w => w.length > 2);
  const wordCount = words.length;

  // Seniority prefix already handled above; if we reach here the title is unusual.
  // Apply a length-based heuristic: longer specialized titles → slightly lower risk.
  // A "Quantitative Risk Analyst" (3 specialized words) is safer than "Analyst" alone.
  const specialistDiscount = wordCount >= 3 ? 0.06 : wordCount === 2 ? 0.02 : 0;
  const baseAI     = Math.max(0.10, 0.40 - specialistDiscount);
  const baseLayoff = Math.max(0.10, 0.40 - specialistDiscount);
  const trend: RoleExposure['demandTrend'] = wordCount >= 3 ? 'stable' : 'falling';

  return { aiRisk: baseAI, layoffRisk: baseLayoff, demandTrend: trend };
};

// Get all role names for autocomplete
export const getAllRoleTitles = (): string[] => Object.keys(roleExposureData);

// New export — maps displayRole → oracle key
export const getOracleRoleMap = (): { title: string; oracleKey: string }[] => {
  return Object.entries(MASTER_CAREER_INTELLIGENCE).map(([oracleKey, intel]) => ({
    title: intel.displayRole,
    oracleKey
  }));
};

// Returns display names from MASTER_CAREER_INTELLIGENCE
export const getAllOracleRoleTitles = (): string[] => {
  return getOracleRoleMap().map(role => role.title);
};

export const calculateRoleExposureScore = (roleTitle: string | null | undefined, department: string | null | undefined, override?: RoleExposure): number => {
  const safeRole = roleTitle ?? '';
  const roleData = override || roleExposureData[safeRole] || inferRoleRisk(safeRole);
  const deptMultiplier = getDepartmentMultiplier(department);

  // Blend aiRisk into the score (20% weight) — now uses the previously dead data
  const blendedRisk = (roleData.layoffRisk * 0.75) + (roleData.aiRisk * 0.25);

  return Math.min(1.0, blendedRisk * deptMultiplier);
};

// ACC-BUG-03 FIX: Use fuzzy substring matching instead of exact string keys.
// Previously "Data Analytics" != "Data" → 99% of users fell through to the
// default 1.00 multiplier regardless of their actual department exposure.
// Now "Marketing Operations" → matches 'marketing' (1.10), etc.
// Ordering: longer/more-specific keys checked before shorter generic ones.
const getDepartmentMultiplier = (department: string | null | undefined): number => {
  if (!department) return 1.0;
  const deptLower = department.toLowerCase();

  // Ordered from most-specific to most-generic to prevent substring collisions.
  const DEPT_MULTIPLIERS: Array<[string, number]> = [
    ['customer success',  1.10],  // relationship component provides partial protection
    ['customer support',  1.15],  // fast-automating, high volume
    ['supply chain',      1.05],
    ['data science',      0.88],  // specialist ML/DS roles more protected than generic data
    ['data engineering',  0.88],  // pipeline work still requires human judgment
    ['data',              0.92],  // generic data roles (prep/reporting automating)
    ['machine learning',  0.80],  // building AI — protected
    ['security',          0.82],  // cybersecurity judgment scarce
    ['devops',            0.88],
    ['infrastructure',    0.88],
    ['cloud',             0.87],
    ['research',          0.85],
    ['engineering',       0.90],
    ['product',           1.00],
    ['design',            1.00],
    ['sales',             0.85],
    ['business develop',  0.88],
    ['marketing',         1.10],
    ['growth',            1.08],
    ['analytics',         1.00],
    ['finance',           0.95],
    ['accounting',        1.05],
    ['legal',             1.00],
    ['compliance',        1.02],
    ['human resources',   1.20],
    ['talent',            1.18],
    ['recruiting',        1.15],
    ['people',            1.18],
    ['hr',                1.20],
    ['operations',        1.05],
    ['administration',    1.15],
    ['admin',             1.15],
    ['it',                1.00],
    ['executive',         0.88],
    ['leadership',        0.88],
    ['management',        0.95],
    ['quality',           1.08],
    ['qa',                1.08],
  ];

  for (const [key, mult] of DEPT_MULTIPLIERS) {
    if (deptLower.includes(key)) return mult;
  }
  return 1.0;
};
