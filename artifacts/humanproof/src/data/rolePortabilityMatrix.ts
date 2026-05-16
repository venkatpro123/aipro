// rolePortabilityMatrix.ts — v37.0 Phase 6A
// Cross-role family portability scores for career transition intelligence.
//
// portability(source, target) → 0.0–1.0
//   0.0 = near-impossible transition (requires starting over)
//   0.3 = hard transition (new credentials / long ramp)
//   0.6 = achievable (6-18 months bridge)
//   0.8 = natural progression (2-6 months)
//   1.0 = trivial (lateral move within adjacent domain)
//
// Methodology: Asymmetric matrix. Portability from (A → B) ≠ (B → A).
// Example: tech → fintech = 0.85 (easy), fintech → tech = 0.75 (slightly harder).
//
// Role families correspond to CANONICAL_TO_ACTION_GROUP keys in roleResolution.ts.
// Each row is the SOURCE family; columns are TARGET families.

export type RoleFamily =
  | 'tech'
  | 'data_science'
  | 'ml_ai'
  | 'devops_infra'
  | 'product'
  | 'design'
  | 'finance'
  | 'fintech'
  | 'accounting'
  | 'sales'
  | 'marketing'
  | 'customer_success'
  | 'hr_people'
  | 'consulting'
  | 'legal'
  | 'healthcare_clinical'
  | 'healthcare_admin'
  | 'pharma_biotech'
  | 'manufacturing'
  | 'energy'
  | 'construction'
  | 'retail'
  | 'logistics'
  | 'agriculture'
  | 'automotive'
  | 'telecom'
  | 'government'
  | 'education'
  | 'media_creative'
  | 'hospitality'
  | 'real_estate'
  | 'cybersecurity'
  | 'veterinary'
  | 'public_health'
  | 'aviation';

export interface PortabilityEntry {
  score: number;        // 0.0–1.0
  difficulty: 'trivial' | 'easy' | 'moderate' | 'hard' | 'very_hard';
  typical_months: number;   // median time to make successful transition
  key_bridges: string[];    // skill/credential bridges that unlock this transition
  note: string;
}

function entry(
  score: number,
  typical_months: number,
  key_bridges: string[],
  note: string,
): PortabilityEntry {
  const difficulty =
    score >= 0.85 ? 'trivial'
    : score >= 0.70 ? 'easy'
    : score >= 0.50 ? 'moderate'
    : score >= 0.30 ? 'hard'
    : 'very_hard';
  return { score, difficulty, typical_months, key_bridges, note };
}

// ─── Portability Matrix ───────────────────────────────────────────────────────
// ROLE_PORTABILITY_MATRIX[source][target] → PortabilityEntry
// Self-transitions are omitted (undefined → same-family lateral move).

export const ROLE_PORTABILITY_MATRIX: Partial<Record<RoleFamily, Partial<Record<RoleFamily, PortabilityEntry>>>> = {

  tech: {
    data_science:       entry(0.72, 6,  ['Python/R proficiency', 'statistics fundamentals', 'ML frameworks'], 'SWEs transition well if they invest in stats/ML foundations.'),
    ml_ai:              entry(0.65, 9,  ['ML theory', 'PyTorch/TF', 'math prerequisites'], 'Achievable but requires deep upskilling in theory.'),
    devops_infra:       entry(0.85, 2,  ['cloud certs (AWS/GCP/Azure)', 'IaC tools'], 'Very natural move — most SWEs have transferable infra exposure.'),
    product:            entry(0.70, 6,  ['product management courses', 'PM experience', 'stakeholder exposure'], 'Tech-to-PM is common; requires explicit PM credential signals.'),
    design:             entry(0.40, 12, ['UX bootcamp', 'portfolio build', 'design tools'], 'Hard without a visible portfolio — employers discount SWE background.'),
    finance:            entry(0.45, 12, ['CFA L1', 'financial modeling', 'Excel/SQL'], 'Requires financial credential signals. Fintech pathway easier than traditional finance.'),
    fintech:            entry(0.82, 4,  ['financial products knowledge', 'regulatory basics'], 'High demand for tech talent in fintech — very achievable.'),
    consulting:         entry(0.60, 8,  ['strategy frameworks', 'client presentation skills', 'MBA or MBB case prep'], 'Tech consulting (digital transformation) is natural; strategy consulting harder.'),
    sales:              entry(0.50, 6,  ['solution selling', 'sales methodology', 'quota accountability exposure'], 'Sales engineering is a natural bridge; pure AE harder.'),
    marketing:          entry(0.55, 6,  ['growth/analytics tools', 'content strategy', 'campaign measurement'], 'Technical marketers in high demand; creative side is harder pivot.'),
    hr_people:          entry(0.35, 12, ['HR certification (SHRM)', 'people skills demonstration', 'coaching'], 'Uncommon pivot; usually requires explicit HR experience.'),
    legal:              entry(0.20, 48, ['JD degree (3 years)', 'bar exam', 'law school'], 'Requires a full credential path — not a career transition, a restart.'),
    healthcare_clinical: entry(0.10, 60, ['medical/nursing school', 'clinical residency'], 'Near-impossible without full credential path — 5+ year restart.'),
    pharma_biotech:     entry(0.55, 9,  ['bioinformatics', 'clinical trial systems knowledge', 'domain upskilling'], 'Strong demand for tech talent in pharma/biotech; R&D systems is viable.'),
    government:         entry(0.48, 9,  ['security clearance (if needed)', 'federal contracting knowledge'], 'Defense tech and digital government are growing pathways.'),
    education:          entry(0.52, 6,  ['teaching certification (optional)', 'curriculum design', 'Ed-tech product exposure'], 'Ed-tech PM or instructor role is accessible; K-12 teaching harder.'),
    media_creative:     entry(0.45, 9,  ['content creation portfolio', 'tech writing', 'media tools'], 'Technical writing and developer advocacy are natural bridges.'),
  },

  data_science: {
    tech:               entry(0.68, 6,  ['software engineering practices', 'production code quality', 'system design'], 'DS to SWE: requires production-grade code skills beyond notebook prototyping.'),
    ml_ai:              entry(0.88, 3,  ['deep learning frameworks', 'production ML systems', 'LLM tooling'], 'Very natural progression — same knowledge base, higher specialization.'),
    product:            entry(0.65, 6,  ['product analytics', 'roadmap ownership', 'stakeholder communication'], 'Data PMs are extremely valued — very strong bridge role.'),
    finance:            entry(0.62, 8,  ['financial modeling', 'quant methods', 'CFA exposure'], 'Quant/risk roles value data science skills heavily.'),
    consulting:         entry(0.65, 6,  ['strategy framing', 'client-facing skills', 'PowerPoint narrative'], 'Analytics consulting is a natural bridge; adds client skills.'),
    healthcare_admin:   entry(0.58, 9,  ['health data standards (HL7/FHIR)', 'clinical research knowledge'], 'Health analytics is a growing field — strong overlap.'),
    pharma_biotech:     entry(0.72, 6,  ['bioinformatics', 'clinical data standards', 'R/Python for bio'], 'Strong bridge — pharma actively recruits data scientists.'),
    government:         entry(0.55, 9,  ['public sector data practices', 'clearance if needed'], 'Policy analytics and census/public health roles available.'),
    marketing:          entry(0.70, 4,  ['marketing analytics tools', 'attribution models', 'growth metrics'], 'Marketing analytics is one of the easiest DS transitions.'),
  },

  ml_ai: {
    tech:               entry(0.72, 4,  ['system design at scale', 'distributed systems', 'production reliability'], 'ML engineers often pivot back to SWE; strong demand for AI-fluent SWEs.'),
    data_science:       entry(0.85, 2,  ['statistical analysis', 'business stakeholder framing'], 'Natural regression — same toolkit, different emphasis.'),
    product:            entry(0.62, 8,  ['AI product strategy', 'user research', 'go-to-market'], 'AI PM roles are booming — very accessible with ML background.'),
    consulting:         entry(0.58, 9,  ['client communication', 'strategy frameworks', 'AI implementation advisory'], 'AI consulting is a strong growth area for ML practitioners.'),
    pharma_biotech:     entry(0.75, 6,  ['computational biology', 'drug discovery AI knowledge'], 'Biotech AI is one of the fastest-growing ML verticals.'),
    fintech:            entry(0.78, 4,  ['financial products knowledge', 'model risk management'], 'Algorithmic trading and risk modeling actively recruit ML talent.'),
  },

  devops_infra: {
    tech:               entry(0.80, 3,  ['application development skills', 'broader SWE breadth'], 'Very natural return — most infra engineers can make this move.'),
    ml_ai:              entry(0.48, 12, ['ML theory', 'data engineering', 'MLOps → ML research path'], 'MLOps is accessible; research ML is harder without theory background.'),
    consulting:         entry(0.55, 8,  ['cloud architecture advisory', 'client communication'], 'Cloud consulting and enterprise architecture are strong bridges.'),
    product:            entry(0.52, 9,  ['platform product management', 'developer experience focus'], 'Developer platform PM roles specifically value infra background.'),
    telecom:            entry(0.68, 6,  ['network fundamentals', 'telecom protocols (5G basics)'], 'Network infra overlaps with telecom — achievable transition.'),
  },

  product: {
    tech:               entry(0.42, 12, ['coding bootcamp or CS fundamentals', 'technical fluency'], 'Reverse pivot is hard — lack of production code experience is a blocker.'),
    consulting:         entry(0.75, 4,  ['strategy framing', 'executive stakeholder management'], 'Product → consulting is very common; strong analytical skills transfer.'),
    marketing:          entry(0.72, 4,  ['growth marketing', 'brand strategy', 'go-to-market ownership'], 'Product marketing manager is the natural bridge role.'),
    sales:              entry(0.58, 6,  ['quota accountability', 'enterprise sales process', 'revenue ownership'], 'Solution/enterprise sales values product context highly.'),
    finance:            entry(0.48, 12, ['financial modeling', 'CFA or MBA', 'P&L ownership experience'], 'CFO/COO paths exist but require explicit finance credential addition.'),
    hr_people:          entry(0.40, 12, ['SHRM', 'people management', 'organizational development'], 'Uncommon; people-ops PM roles exist as a bridge.'),
    media_creative:     entry(0.55, 8,  ['content strategy', 'audience growth', 'editorial judgment'], 'Content product managers and growth PMs bridge well.'),
  },

  finance: {
    consulting:         entry(0.78, 4,  ['strategy frameworks', 'client advisory skills', 'PowerPoint narrative'], 'Finance → consulting (financial advisory) is a very common path.'),
    fintech:            entry(0.80, 4,  ['startup culture adaptation', 'product sense', 'technical fluency'], 'Traditional finance skills highly valued in fintech.'),
    accounting:         entry(0.70, 6,  ['CPA exam', 'audit and control knowledge', 'GAAP/IFRS'], 'Adjacent skills; CPA adds credential bridge.'),
    product:            entry(0.52, 12, ['PM frameworks', 'technical context', 'user research'], 'Financial product management is achievable with explicit PM training.'),
    tech:               entry(0.35, 18, ['coding skills', 'software development context'], 'Hard without coding — fintech analyst to PM to tech is a multi-hop.'),
    legal:              entry(0.38, 36, ['JD or LLM', 'securities law focus'], 'Finance → compliance law requires a legal credential; 3-year path.'),
    government:         entry(0.62, 8,  ['public budgeting knowledge', 'policy context'], 'Treasury and budget roles in government value finance background.'),
    real_estate:        entry(0.65, 6,  ['real estate finance', 'CRE modeling', 'property market knowledge'], 'Real estate finance is a strong bridge for finance professionals.'),
  },

  fintech: {
    tech:               entry(0.75, 4,  ['broader software engineering', 'non-financial system design'], 'Fintech engineers move to tech easily — engineering skills are core.'),
    finance:            entry(0.72, 6,  ['CFA', 'traditional finance context', 'regulatory depth'], 'Reverse move possible; traditional finance culture is an adjustment.'),
    consulting:         entry(0.70, 6,  ['advisory framing', 'client skills'], 'Digital transformation and payments consulting are natural targets.'),
    product:            entry(0.75, 4,  ['product frameworks', 'user research'], 'Fintech PMs have strong market demand across industries.'),
  },

  consulting: {
    finance:            entry(0.72, 6,  ['financial modeling depth', 'CFA or MBA', 'deal experience'], 'Strategy consulting → investment banking is a well-trodden path.'),
    product:            entry(0.75, 4,  ['PM execution experience', 'user research', 'agile methods'], 'Consultants → PM is very common; adds hands-on product ownership.'),
    tech:               entry(0.50, 12, ['technical skills', 'coding', 'software development context'], 'Consulting → tech requires technical credentialing; common for ex-tech consultants.'),
    hr_people:          entry(0.65, 6,  ['organizational development', 'change management certification'], 'OD consulting to in-house HR BP is a natural move.'),
    marketing:          entry(0.68, 6,  ['campaign execution', 'brand management', 'growth channels'], 'Strategy to marketing leadership is common at director level.'),
    government:         entry(0.62, 8,  ['public sector context', 'policy knowledge'], 'Government advisory roles directly value consulting background.'),
    legal:              entry(0.32, 36, ['JD or LLM', 'law firm experience'], 'Consulting → legal requires full credential restart except compliance advisory.'),
  },

  legal: {
    consulting:         entry(0.68, 6,  ['business strategy framing', 'client advisory skills'], 'Corporate lawyers pivot to strategy consulting with strong success rates.'),
    finance:            entry(0.48, 12, ['financial modeling', 'CFA or securities knowledge'], 'M&A lawyers can bridge to investment banking; requires finance skills.'),
    hr_people:          entry(0.55, 8,  ['employment law depth', 'SHRM', 'people operations experience'], 'Employment lawyers bridge well to HR leadership and compliance.'),
    government:         entry(0.75, 4,  ['public law knowledge', 'regulatory affairs experience'], 'In-house counsel to government regulatory roles is a natural move.'),
    pharma_biotech:     entry(0.70, 6,  ['FDA regulatory knowledge', 'IP law for biotech'], 'IP and regulatory lawyers are highly sought in pharma.'),
    tech:               entry(0.40, 18, ['technical context', 'product legal experience'], 'Tech legal roles exist; pure SWE pivot requires significant reskilling.'),
    media_creative:     entry(0.60, 8,  ['entertainment/media law', 'IP and copyright'], 'Entertainment law is a natural adjacency for IP and contract lawyers.'),
  },

  healthcare_clinical: {
    healthcare_admin:   entry(0.70, 6,  ['healthcare administration', 'MHA or MBA in health', 'operational experience'], 'Clinicians moving into administration is a well-established path.'),
    pharma_biotech:     entry(0.65, 8,  ['clinical research', 'regulatory affairs basics', 'GCP certification'], 'Clinical research and medical affairs roles value clinical background.'),
    consulting:         entry(0.55, 12, ['strategy/advisory framing', 'business communication', 'MBA'], 'Healthcare consulting (clinical advisory) is accessible for MDs/NPs.'),
    education:          entry(0.62, 6,  ['teaching/precepting experience', 'curriculum development'], 'Clinical educators and nursing faculty are well-compensated paths.'),
    legal:              entry(0.20, 60, ['JD degree (3 years)', 'bar exam', 'medical-legal specialty'], 'Requires full legal credential — 3-year restart even for MDs.'),
    tech:               entry(0.30, 24, ['technical skills', 'health IT knowledge', 'software development'], 'Health IT and clinical informatics are bridges; pure SWE is very hard.'),
    government:         entry(0.58, 8,  ['public health experience', 'MPH or policy degree'], 'Public health and FDA/CDC roles value clinical background highly.'),
  },

  pharma_biotech: {
    consulting:         entry(0.65, 8,  ['life sciences consulting firms', 'client skills', 'strategy framing'], 'Life sciences consulting is a very common pharma exit.'),
    healthcare_clinical: entry(0.40, 24, ['clinical training', 'patient care experience', 'clinical rotation'], 'Hard without clinical experience; medical affairs is a bridge.'),
    legal:              entry(0.48, 24, ['JD or LLM', 'FDA law specialization'], 'Regulatory affairs can bridge to compliance law with LLM.'),
    finance:            entry(0.52, 12, ['equity research', 'biotech financial modeling', 'CFA'], 'Biotech equity research actively values scientific background.'),
    government:         entry(0.65, 8,  ['FDA/regulatory experience', 'public health context'], 'FDA, NIH, and CDC roles value pharma industry experience.'),
  },

  manufacturing: {
    consulting:         entry(0.60, 8,  ['lean/six sigma advisory', 'operations strategy framing'], 'Operations consulting is a strong bridge for manufacturing leaders.'),
    energy:             entry(0.58, 9,  ['industrial processes overlap', 'renewable energy upskilling'], 'Process engineers bridge to energy — especially oil & gas or renewables.'),
    construction:       entry(0.52, 9,  ['project management certification', 'civil/structural context'], 'Manufacturing to construction PM is achievable with PMP.'),
    logistics:          entry(0.65, 6,  ['supply chain management', 'APICS CPIM cert'], 'Supply chain and operations management bridge naturally.'),
    government:         entry(0.48, 12, ['defense contracting knowledge', 'federal procurement context'], 'Defense manufacturing roles are a natural bridge.'),
    tech:               entry(0.40, 18, ['automation/robotics software', 'IIoT platforms', 'coding'], 'Manufacturing automation to tech is achievable via IIoT/robotics focus.'),
  },

  energy: {
    consulting:         entry(0.65, 8,  ['energy transition advisory', 'strategy framing'], 'Energy transition consulting is a strong bridge for energy professionals.'),
    manufacturing:      entry(0.58, 9,  ['industrial overlap', 'process engineering'], 'Oil & gas engineers bridge to industrial manufacturing.'),
    government:         entry(0.62, 8,  ['energy policy', 'regulatory affairs experience'], 'Energy regulators (FERC, EPA roles) value industry experience.'),
    finance:            entry(0.55, 12, ['commodity trading', 'energy finance modeling', 'CFA'], 'Energy trading and infrastructure finance bridge well.'),
    tech:               entry(0.45, 15, ['energy software', 'grid management systems', 'coding'], 'Energy tech (smart grid, solar software) is a growing bridge.'),
  },

  construction: {
    manufacturing:      entry(0.52, 9,  ['industrial processes', 'lean manufacturing context'], 'Project managers bridge reasonably; technical skills differ.'),
    government:         entry(0.65, 6,  ['public works', 'municipal project management'], 'Municipal infrastructure roles naturally value construction background.'),
    consulting:         entry(0.60, 8,  ['project advisory', 'real estate/infrastructure consulting'], 'Construction management consulting is a direct bridge.'),
    real_estate:        entry(0.72, 4,  ['real estate development', 'project finance basics'], 'Construction to real estate development is one of the strongest bridges.'),
  },

  sales: {
    consulting:         entry(0.60, 8,  ['strategy framing', 'client advisory positioning', 'MBA optional'], 'Enterprise sales → consulting is common at director+ level.'),
    marketing:          entry(0.72, 4,  ['demand generation', 'campaign execution', 'marketing analytics'], 'Sales to marketing is very natural; revenue focus is shared.'),
    product:            entry(0.55, 9,  ['PM frameworks', 'user research', 'roadmap ownership'], 'Sales engineers and solution architects bridge to PM well.'),
    customer_success:   entry(0.85, 2,  ['CS methodology', 'retention metrics'], 'Very natural — shared customer relationship skills.'),
    hr_people:          entry(0.40, 12, ['SHRM', 'talent acquisition exposure'], 'Recruiting (sales skills + people focus) is the strongest bridge.'),
  },

  marketing: {
    product:            entry(0.70, 6,  ['product frameworks', 'technical context', 'user research'], 'Product marketing to PM is one of the most common career pivots.'),
    sales:              entry(0.65, 6,  ['quota accountability', 'enterprise selling', 'revenue ownership'], 'Demand gen and growth marketing bridge to sales naturally.'),
    consulting:         entry(0.62, 8,  ['strategy framing', 'client advisory skills'], 'Brand and growth strategy consulting are natural targets.'),
    media_creative:     entry(0.75, 4,  ['content strategy', 'creative direction', 'audience analytics'], 'Content marketing to editorial/media is a strong bridge.'),
    hr_people:          entry(0.42, 12, ['employer branding', 'SHRM', 'people operations context'], 'Employer branding is the natural bridge into HR for marketers.'),
  },

  hr_people: {
    consulting:         entry(0.65, 8,  ['OD consulting', 'change management', 'executive coaching'], 'HR business partners bridge to OD and workforce consulting.'),
    marketing:          entry(0.48, 12, ['employer branding to full marketing', 'campaign skills', 'analytics'], 'Employer branding → brand marketing is achievable.'),
    legal:              entry(0.40, 36, ['JD/LLM', 'employment law specialization'], 'Employment lawyers exist who came from HR but requires full credential.'),
    sales:              entry(0.38, 12, ['quota accountability', 'revenue focus', 'CRM tools'], 'Recruiting to sales (quota-based) is achievable but culture shift.'),
    government:         entry(0.60, 8,  ['civil service HR', 'public sector people operations'], 'Government HR roles value SHRM-certified practitioners.'),
  },

  customer_success: {
    sales:              entry(0.78, 4,  ['quota accountability', 'revenue ownership', 'closing skills'], 'CS to sales is very natural — shared customer relationship skills.'),
    product:            entry(0.65, 6,  ['PM frameworks', 'roadmap exposure', 'user feedback synthesis'], 'CS managers who work closely with product teams pivot well.'),
    marketing:          entry(0.62, 6,  ['customer advocacy', 'lifecycle marketing', 'content creation'], 'Customer advocacy and lifecycle marketing are natural bridges.'),
    consulting:         entry(0.58, 8,  ['advisory framing', 'project management', 'business communication'], 'CX consulting and implementation consulting are accessible.'),
  },

  retail: {
    logistics:          entry(0.72, 4,  ['supply chain management', 'APICS CPIM'], 'Retail operations to logistics is a very natural move.'),
    marketing:          entry(0.62, 6,  ['brand management', 'digital marketing', 'campaign measurement'], 'Retail buyers and merchandisers bridge to brand marketing.'),
    consulting:         entry(0.55, 9,  ['retail strategy advisory', 'business framing'], 'Retail operations consulting is accessible for experienced retail leaders.'),
    hospitality:        entry(0.65, 6,  ['customer experience', 'service operations', 'brand standards'], 'Retail management to hospitality operations management is achievable.'),
  },

  logistics: {
    manufacturing:      entry(0.65, 6,  ['operations management', 'lean/six sigma', 'process engineering'], 'Supply chain to manufacturing operations is a strong bridge.'),
    consulting:         entry(0.60, 8,  ['supply chain advisory', 'strategy framing'], 'Supply chain consulting is a natural bridge for logistics leaders.'),
    retail:             entry(0.68, 4,  ['retail operations', 'inventory management', 'demand planning'], 'Logistics to retail supply chain is very accessible.'),
    government:         entry(0.52, 9,  ['federal contracting', 'defense logistics (DLAD)'], 'Defense logistics and government supply chain are bridge roles.'),
  },

  government: {
    consulting:         entry(0.70, 6,  ['strategy framing', 'client advisory positioning', 'government advisory practice'], 'Government officials are highly valued in policy consulting.'),
    legal:              entry(0.65, 8,  ['government law practice', 'regulatory expertise'], 'Government lawyers and regulators bridge to regulatory law practices.'),
    education:          entry(0.62, 6,  ['teaching certification', 'policy education', 'academic context'], 'Policy analysts bridge to policy education and think tanks.'),
    hr_people:          entry(0.58, 6,  ['civil service HR', 'SHRM', 'people ops context'], 'Government HR to private sector HR is achievable.'),
    finance:            entry(0.52, 12, ['financial modeling', 'CFA', 'public finance to private'], 'Public finance officials bridge to banking and consulting.'),
  },

  education: {
    consulting:         entry(0.62, 8,  ['business strategy framing', 'client skills', 'MBA optional'], 'Teachers and professors bridge to consulting with research/analysis skills.'),
    hr_people:          entry(0.65, 6,  ['L&D specialization', 'SHRM', 'people operations'], 'Instructional designers and trainers bridge to L&D/HR directly.'),
    government:         entry(0.62, 6,  ['policy focus', 'public education administration'], 'Education administrators bridge to education policy roles.'),
    media_creative:     entry(0.58, 8,  ['content creation', 'editorial judgment', 'curriculum → content'], 'Educators bridge to content strategy and ed-tech product roles.'),
    product:            entry(0.50, 12, ['ed-tech PM', 'product frameworks', 'user research'], 'Instructional designers bridge to ed-tech PM roles.'),
  },

  media_creative: {
    marketing:          entry(0.75, 4,  ['brand strategy', 'campaign execution', 'audience analytics'], 'Journalists and content creators bridge to content marketing well.'),
    consulting:         entry(0.52, 12, ['strategy framing', 'business communication', 'MBA optional'], 'Media to consulting requires explicit business credential addition.'),
    tech:               entry(0.40, 18, ['technical skills', 'software development', 'coding'], 'Media to tech requires significant reskilling unless in media-tech.'),
    government:         entry(0.55, 9,  ['public information officer', 'policy communications'], 'Media professionals bridge to public affairs and policy communications.'),
    education:          entry(0.65, 6,  ['curriculum development', 'teaching certification optional'], 'Journalists and media professionals bridge to education and training.'),
  },

  hospitality: {
    retail:             entry(0.68, 4,  ['retail operations', 'customer experience management'], 'Hotel operations to retail management is a natural pivot.'),
    consulting:         entry(0.52, 12, ['strategy framing', 'MBA optional', 'business communication'], 'Hospitality leadership to operations consulting with explicit business training.'),
    real_estate:        entry(0.58, 9,  ['hotel real estate finance', 'asset management basics'], 'Hotel GMs bridge to hotel real estate and asset management.'),
    government:         entry(0.45, 12, ['public administration', 'tourism policy'], 'Tourism and convention authority roles value hospitality experience.'),
    marketing:          entry(0.62, 6,  ['brand management', 'digital marketing', 'customer journey'], 'Hospitality marketing to broader brand marketing is accessible.'),
  },

  // ─── v39.0 C3: Source rows for previously-missing families ───────────────────
  // Each family below is BOTH used as a target elsewhere AND mapped here as a
  // source, closing the bidirectional gap that left most specialized roles
  // with no outbound portability data.

  cybersecurity: {
    tech:               entry(0.78, 4,  ['broader SWE breadth', 'system design beyond security'], 'Security engineers move back to SWE easily — production code skills are intact.'),
    devops_infra:       entry(0.85, 2,  ['cloud cert refresh', 'IaC tooling'], 'DevSecOps is essentially the same role with one specialty added.'),
    consulting:         entry(0.74, 5,  ['client framing', 'security advisory packaging', 'compliance frameworks (SOC2/ISO27001)'], 'Cyber consulting (Big4, Mandiant, CrowdStrike services) actively recruits practitioners.'),
    government:         entry(0.72, 6,  ['security clearance', 'federal compliance frameworks (FISMA, FedRAMP)'], 'Defense / DHS / CISA roles actively hire experienced security engineers.'),
    finance:            entry(0.62, 8,  ['financial product knowledge', 'fraud detection systems', 'risk modeling'], 'Bank cyber + fraud teams are a high-paying bridge.'),
    ml_ai:              entry(0.55, 9,  ['ML for security', 'anomaly detection mathematical foundation'], 'Security data scientists exist; threat-detection ML is the bridge.'),
    legal:              entry(0.35, 36, ['JD or CIPP-style privacy credential', 'cyber law specialization'], 'Cyber law / privacy practice requires a JD or extensive privacy certification.'),
  },

  accounting: {
    finance:            entry(0.82, 3,  ['financial modeling depth', 'investor-facing presentation skills'], 'Accountants move to FP&A and corporate finance very naturally.'),
    consulting:         entry(0.72, 6,  ['advisory framing', 'client skills', 'PowerPoint narrative'], 'Big4 audit to advisory consulting is a well-trodden path.'),
    legal:              entry(0.45, 30, ['JD with tax specialization', 'bar exam'], 'Tax attorneys often start as CPAs; requires legal credential.'),
    government:         entry(0.65, 6,  ['public sector accounting (GASB)', 'government contracts knowledge'], 'Federal / state auditor and treasury roles directly value CPAs.'),
    fintech:            entry(0.68, 5,  ['startup culture', 'product context'], 'Fintech finance/controller roles value Big4-trained CPAs.'),
    education:          entry(0.55, 8,  ['teaching credential (optional for college)', 'curriculum development'], 'Accounting faculty and CPA exam prep instructor roles are accessible.'),
  },

  agriculture: {
    manufacturing:      entry(0.62, 8,  ['lean process knowledge', 'food/ag manufacturing context'], 'Agricultural ops bridges to food manufacturing operations.'),
    energy:             entry(0.55, 10, ['biofuels expertise', 'rural energy infrastructure'], 'Bioenergy and rural utility roles bridge from ag.'),
    government:         entry(0.68, 6,  ['USDA / state ag agency context', 'land use policy'], 'USDA, state agricultural agencies, and conservation roles bridge directly.'),
    consulting:         entry(0.50, 10, ['ag-tech consulting', 'sustainability advisory'], 'Ag-tech and sustainability consulting are growing target areas.'),
    logistics:          entry(0.65, 6,  ['cold chain logistics', 'supply chain certifications'], 'Ag supply chain to broader logistics is a natural pivot.'),
    education:          entry(0.55, 8,  ['extension education', 'curriculum for ag colleges'], 'Cooperative extension and ag college roles directly value field experience.'),
  },

  automotive: {
    manufacturing:      entry(0.85, 2,  ['cross-industry manufacturing context'], 'Automotive manufacturing skills transfer directly to other industrial manufacturing.'),
    energy:             entry(0.65, 8,  ['battery technology', 'EV / charging infrastructure'], 'EV transition makes automotive engineers high-value for battery/grid companies.'),
    tech:               entry(0.55, 10, ['software-defined vehicle (SDV) context', 'embedded software'], 'Automotive software engineers bridge to broader tech; mechanical engineers harder.'),
    aviation:           entry(0.70, 6,  ['aerospace certifications', 'higher safety/redundancy standards'], 'Mechanical and electrical engineers move to aerospace with regulatory uplift.'),
    consulting:         entry(0.58, 9,  ['automotive industry advisory', 'strategy framing'], 'Roland Berger, AlixPartners, BCG automotive practices actively recruit.'),
    logistics:          entry(0.62, 7,  ['automotive supply chain', 'inventory + JIT'], 'Automotive supply chain knowledge transfers to broader logistics.'),
  },

  telecom: {
    tech:               entry(0.72, 5,  ['cloud-native skills (away from on-prem network gear)', 'general SWE'], 'Network engineers with cloud certs bridge to tech infra teams quickly.'),
    devops_infra:       entry(0.85, 2,  ['cloud certs (AWS/GCP/Azure)', 'IaC tools'], 'Network engineering and devops/SRE share most fundamentals.'),
    cybersecurity:      entry(0.78, 4,  ['security certs (CISSP, OSCP)', 'network security focus'], 'Network telcom engineers transition to cyber via network security roles.'),
    consulting:         entry(0.55, 9,  ['telecom advisory', 'client framing'], 'Telecom advisory (Bell Labs, Accenture Communications) actively recruits.'),
    government:         entry(0.60, 8,  ['federal communications context (FCC, NTIA)', 'public-sector procurement'], 'FCC, NTIA, and federal-contractor telecom roles bridge directly.'),
    energy:             entry(0.55, 9,  ['smart grid', 'utility networks'], 'Smart grid and utility comms are growing target areas.'),
  },

  real_estate: {
    finance:            entry(0.72, 6,  ['CRE finance (REIT, CMBS)', 'financial modeling beyond cap-rate math'], 'Real estate finance to corporate or investment finance is a natural bridge.'),
    construction:       entry(0.78, 4,  ['project construction context', 'GC/owner-side experience'], 'Real estate development and construction management share most operational skills.'),
    consulting:         entry(0.62, 7,  ['real estate strategy advisory', 'client framing'], 'CBRE, JLL, Cushman advisory practices actively hire experienced operators.'),
    hospitality:        entry(0.70, 5,  ['hotel-specific operations vs. generic property'], 'Hotel real estate is a natural pivot for property managers.'),
    government:         entry(0.60, 8,  ['public-sector property management', 'housing policy'], 'HUD, state housing finance agencies, and local development authorities bridge.'),
  },

  veterinary: {
    healthcare_clinical: entry(0.55, 12, ['human medicine certification', 'patient communication shift'], 'Veterinarians can pivot to allied human-health roles but pure clinical requires retraining.'),
    pharma_biotech:     entry(0.72, 5,  ['GLP/GCP for veterinary trials', 'animal model expertise'], 'Veterinary clinical research and animal model SMEs are highly valued in pharma R&D.'),
    public_health:      entry(0.78, 4,  ['MPH (optional)', 'zoonotic disease focus', 'One Health framework'], 'One Health is the explicit veterinary → public health bridge — actively recruited.'),
    education:          entry(0.65, 6,  ['DVM teaching credential', 'curriculum development'], 'Veterinary school faculty roles are direct bridges for experienced practitioners.'),
    agriculture:        entry(0.82, 3,  ['large-animal practice', 'food safety frameworks'], 'Large-animal vets cross directly into agricultural production and food safety.'),
    government:         entry(0.72, 5,  ['USDA APHIS, FDA CVM context', 'epidemiology basics'], 'USDA APHIS, FDA Center for Veterinary Medicine, and state agencies actively hire DVMs.'),
  },

  public_health: {
    healthcare_clinical: entry(0.55, 15, ['clinical credential (MD/RN if not held)', 'patient care experience'], 'Pure clinical roles require a clinical credential; community health roles bridge.'),
    healthcare_admin:   entry(0.78, 4,  ['MHA basics', 'hospital operations exposure'], 'Public health epidemiologists and program managers bridge to health administration easily.'),
    government:         entry(0.85, 3,  ['federal/state public health context'], 'CDC, state health departments, HHS, and WHO are the natural employers.'),
    pharma_biotech:     entry(0.68, 6,  ['regulatory affairs', 'clinical trial epidemiology'], 'Pharma epidemiology and real-world evidence teams actively hire PH practitioners.'),
    consulting:         entry(0.62, 7,  ['health policy advisory', 'strategy framing'], 'Public health consulting (Abt, RTI, ICF) is a natural bridge.'),
    education:          entry(0.70, 5,  ['public health teaching', 'graduate-level instruction'], 'MPH faculty and instructor roles are direct bridges for experienced practitioners.'),
  },

  aviation: {
    tech:               entry(0.45, 14, ['SWE skills', 'avionics-software bridge'], 'Avionics engineers bridge to tech via embedded/safety-critical software roles.'),
    automotive:         entry(0.65, 7,  ['ADAS / autonomous vehicle context'], 'Aviation engineers are highly sought in autonomous vehicle programs.'),
    energy:             entry(0.55, 10, ['rotating-machinery overlap (turbines)', 'industrial gas turbine context'], 'Gas turbine engineers cross to power generation; airframe engineers harder.'),
    consulting:         entry(0.62, 8,  ['aviation advisory practices', 'client framing'], 'Oliver Wyman aviation, ICF, and Roland Berger actively recruit airline executives.'),
    manufacturing:      entry(0.72, 5,  ['cross-industry manufacturing', 'aerospace-grade quality systems'], 'Aerospace engineering skills transfer to other regulated manufacturing (medical devices, defense).'),
    government:         entry(0.70, 6,  ['FAA / EASA / DGCA context', 'aviation safety regulation'], 'Federal aviation regulators directly hire experienced airline operations + maintenance leaders.'),
  },

  healthcare_admin: {
    consulting:         entry(0.72, 5,  ['healthcare consulting practices (Huron, Sg2, Advisory Board)', 'PowerPoint narrative'], 'Healthcare admin → consulting is one of the strongest pivots in the sector.'),
    healthcare_clinical: entry(0.30, 36, ['clinical credential', 'patient-care experience'], 'Pure clinical practice requires re-credentialing; this is a near-restart.'),
    pharma_biotech:     entry(0.65, 7,  ['commercial pharma operations', 'market access context'], 'Hospital admin to pharma commercial/market-access is a natural bridge.'),
    finance:            entry(0.55, 10, ['healthcare finance focus', 'CFO-track via MHA'], 'Healthcare CFO-track and revenue-cycle finance roles bridge directly.'),
    government:         entry(0.68, 6,  ['CMS / state health agency context', 'public health policy'], 'CMS, HRSA, and state Medicaid leadership are direct targets.'),
    tech:               entry(0.40, 18, ['health IT context', 'product / clinical-informatics fluency'], 'Health-IT product and operations roles bridge; pure SWE requires reskilling.'),
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns portability entry for a source → target role family transition, or null if not mapped. */
export function getPortabilityEntry(source: RoleFamily, target: RoleFamily): PortabilityEntry | null {
  if (source === target) return null;
  return ROLE_PORTABILITY_MATRIX[source]?.[target] ?? null;
}

/** Returns portability score (0-1) for a transition, defaulting to 0.30 (hard) if unmapped. */
export function getPortabilityScore(source: RoleFamily, target: RoleFamily): number {
  if (source === target) return 1.0;
  return ROLE_PORTABILITY_MATRIX[source]?.[target]?.score ?? 0.30;
}

/** Returns all targets reachable from a source role family with score ≥ threshold. */
export function getReachableTargets(
  source: RoleFamily,
  minScore: number = 0.60,
): Array<{ target: RoleFamily; entry: PortabilityEntry }> {
  const row = ROLE_PORTABILITY_MATRIX[source];
  if (!row) return [];
  return (Object.entries(row) as Array<[RoleFamily, PortabilityEntry]>)
    .filter(([, e]) => e.score >= minScore)
    .sort((a, b) => b[1].score - a[1].score)
    .map(([target, entry]) => ({ target, entry }));
}

/** Maps a canonical role key to the closest role family. */
const ROLE_KEY_TO_FAMILY: Record<string, RoleFamily> = {
  // Tech
  swe: 'tech', senior_swe: 'tech', staff_engineer: 'tech', distinguished_engineer: 'tech',
  frontend_engineer: 'tech', backend_engineer: 'tech', fullstack_engineer: 'tech',
  mobile_engineer: 'tech', ios_engineer: 'tech', android_engineer: 'tech',
  embedded_engineer: 'tech', systems_engineer: 'tech',
  // Data / ML
  data_scientist: 'data_science', analytics_engineer: 'data_science',
  business_intelligence_analyst: 'data_science', data_governance_analyst: 'data_science',
  quantitative_analyst: 'data_science', research_scientist: 'data_science',
  ml_engineer: 'ml_ai', ml_ops_engineer: 'ml_ai', ai_product_manager: 'ml_ai',
  // DevOps
  devops_engineer: 'devops_infra', cloud_architect: 'devops_infra', sre: 'devops_infra',
  platform_engineer: 'devops_infra', network_engineer_telecom: 'telecom',
  // Product / Design
  product_manager: 'product', product_owner: 'product', product_director: 'product',
  associate_pm: 'product', vp_product: 'product',
  ux_designer: 'design', ui_designer: 'design', product_designer: 'design',
  ux_researcher: 'design', brand_designer: 'design', creative_director: 'design',
  // Finance
  financial_analyst: 'finance', senior_financial_analyst: 'finance', fp_a_analyst: 'finance',
  investment_banker: 'finance', equity_researcher: 'finance', portfolio_manager: 'finance',
  risk_analyst: 'finance', treasury_analyst: 'finance', actuarial_analyst: 'finance',
  cfo: 'finance',
  // Accounting
  auditor_cpa: 'accounting', controller: 'accounting', tax_specialist: 'accounting',
  // Sales
  account_executive: 'sales', senior_account_executive: 'sales', enterprise_ae: 'sales',
  sales_development_rep: 'sales', business_development_manager: 'sales',
  sales_engineer: 'sales', vp_sales: 'sales', chief_revenue_officer: 'sales',
  sales_operations_analyst: 'sales', partnership_manager: 'sales',
  // Marketing
  digital_marketing_manager: 'marketing', content_marketing_manager: 'marketing',
  seo_specialist: 'marketing', social_media_manager: 'marketing',
  brand_manager: 'marketing', growth_marketing_manager: 'marketing',
  product_marketing_manager: 'marketing', campaign_manager: 'marketing',
  chief_marketing_officer: 'marketing',
  // Customer Success
  customer_success_manager: 'customer_success', customer_support_specialist: 'customer_success',
  cx_operations_manager: 'customer_success',
  // HR
  hr_generalist: 'hr_people', hr_business_partner: 'hr_people', hr_director: 'hr_people',
  talent_acquisition_specialist: 'hr_people', recruiting_manager: 'hr_people',
  chief_people_officer: 'hr_people',
  // Consulting
  management_consultant: 'consulting', strategy_consultant: 'consulting',
  technology_consultant: 'consulting', fractional_coo: 'consulting',
  // Legal
  attorney_general_practice: 'legal', corporate_attorney: 'legal', ip_attorney: 'legal',
  paralegal: 'legal', general_counsel: 'legal', compliance_officer: 'legal',
  compliance_attorney: 'legal',
  // Healthcare
  registered_nurse: 'healthcare_clinical', nurse_practitioner: 'healthcare_clinical',
  physician_general_practitioner: 'healthcare_clinical', physician_assistant: 'healthcare_clinical',
  physical_therapist: 'healthcare_clinical', pharmacist: 'healthcare_clinical',
  hospital_administrator: 'healthcare_admin', healthcare_it_analyst: 'healthcare_admin',
  // Pharma
  pharmaceutical_scientist: 'pharma_biotech', clinical_trial_manager: 'pharma_biotech',
  regulatory_affairs_specialist_pharma: 'pharma_biotech', drug_safety_pharmacovigilance: 'pharma_biotech',
  medical_writer_pharma: 'pharma_biotech', quality_assurance_pharma: 'pharma_biotech',
  // Manufacturing
  manufacturing_engineer: 'manufacturing', process_engineer: 'manufacturing',
  operations_manager: 'manufacturing', lean_six_sigma_specialist: 'manufacturing',
  supply_chain_manager: 'manufacturing', plant_manager: 'manufacturing',
  // Energy
  petroleum_engineer: 'energy', renewable_energy_engineer: 'energy',
  electrical_engineer_power: 'energy', sustainability_manager: 'energy',
  ev_battery_engineer: 'energy',
  // Construction
  civil_engineer: 'construction', structural_engineer: 'construction',
  construction_project_manager: 'construction', architect: 'construction',
  // Retail
  retail_store_manager: 'retail', e_commerce_manager: 'retail',
  merchandising_manager: 'retail', retail_operations_analyst: 'retail',
  inventory_planner: 'retail',
  // Logistics
  logistics_operations_manager: 'logistics', customs_broker: 'logistics',
  freight_forwarder: 'logistics', route_optimization_analyst: 'logistics',
  transportation_analyst: 'logistics', warehouse_automation_specialist: 'logistics',
  // Agriculture
  agronomist: 'agriculture', food_scientist: 'agriculture',
  agri_tech_product_manager: 'agriculture',
  // Automotive
  automotive_engineer: 'automotive', adas_engineer: 'automotive',
  automotive_program_manager: 'automotive',
  // Telecom
  rf_engineer: 'telecom', telecom_product_manager: 'telecom',
  // Government
  government_policy_analyst: 'government', municipal_administrator: 'government',
  nonprofit_program_director: 'government', defense_contractor_engineer: 'government',
  // Education
  university_professor: 'education', K12_teacher: 'education',
  instructional_designer: 'education', corporate_trainer: 'education',
  // Media
  journalist_reporter: 'media_creative', game_designer: 'media_creative',
  content_creator: 'media_creative', streaming_product_manager: 'media_creative',
  // Insurance
  underwriter_property_casualty: 'finance', actuarial_analyst_insurance: 'finance',
  claims_adjuster: 'finance', insurance_product_manager: 'finance',
  // Real estate
  real_estate_analyst: 'real_estate', property_manager: 'real_estate',
  proptech_product_manager: 'real_estate',
  // Hospitality
  hotel_general_manager: 'hospitality', revenue_manager_hospitality: 'hospitality',
  executive_chef: 'hospitality', events_manager: 'hospitality',

  // ═══ Phase 1 / v38.0 ═══
  // Cybersecurity (25 roles)
  cyber_threat_analyst: 'cybersecurity', soc_analyst_tier_1: 'cybersecurity',
  soc_analyst_tier_2: 'cybersecurity', soc_analyst_tier_3: 'cybersecurity',
  incident_response_engineer: 'cybersecurity', penetration_tester: 'cybersecurity',
  red_team_operator: 'cybersecurity', purple_team_engineer: 'cybersecurity',
  application_security_engineer: 'cybersecurity', cloud_security_architect: 'cybersecurity',
  devsecops_engineer: 'cybersecurity', identity_access_management_engineer: 'cybersecurity',
  grc_analyst: 'cybersecurity', siem_engineer: 'cybersecurity',
  forensics_analyst: 'cybersecurity', malware_analyst: 'cybersecurity',
  vulnerability_management_specialist: 'cybersecurity',
  security_compliance_manager: 'cybersecurity', ciso: 'cybersecurity', vciso: 'cybersecurity',
  bug_bounty_researcher: 'cybersecurity', cryptography_engineer: 'cybersecurity',
  zero_trust_architect: 'cybersecurity', ot_security_engineer: 'cybersecurity',
  cyber_intelligence_analyst: 'cybersecurity',
  // Cloud Platform (15 roles)
  kubernetes_engineer: 'devops_infra', service_mesh_engineer: 'devops_infra',
  observability_engineer: 'devops_infra', chaos_engineer: 'devops_infra',
  gitops_engineer: 'devops_infra', database_reliability_engineer: 'devops_infra',
  data_engineer: 'data_science', data_platform_engineer: 'devops_infra',
  cloud_finops_analyst: 'devops_infra', edge_computing_engineer: 'devops_infra',
  multi_cloud_architect: 'devops_infra', aws_solutions_architect: 'devops_infra',
  gcp_solutions_architect: 'devops_infra', azure_solutions_architect: 'devops_infra',
  internal_developer_platform_engineer: 'devops_infra',
  // AI/ML Specialization (10 roles)
  llm_engineer: 'ml_ai', prompt_engineer: 'ml_ai',
  ml_research_scientist: 'ml_ai', applied_ml_scientist: 'ml_ai',
  computer_vision_engineer: 'ml_ai', nlp_engineer: 'ml_ai',
  reinforcement_learning_engineer: 'ml_ai', ai_safety_researcher: 'ml_ai',
  model_evaluation_engineer: 'ml_ai', ai_red_teamer: 'ml_ai',
  // QA + Frontend/Mobile (10 roles)
  qa_automation_engineer: 'tech', performance_test_engineer: 'tech',
  chaos_qa_engineer: 'tech', mobile_qa_engineer: 'tech',
  accessibility_engineer: 'tech', frontend_performance_engineer: 'tech',
  webgl_engineer: 'tech', ios_engineer_senior: 'tech',
  android_engineer_senior: 'tech', react_native_engineer: 'tech',

  // ═══ Phase 2 / v38.0 — Healthcare Deep + Biotech Distinct (75 roles) ═══
  // Physician specialties (17)
  cardiologist: 'healthcare_clinical', oncologist_medical: 'healthcare_clinical',
  oncologist_surgical: 'healthcare_clinical', radiologist: 'healthcare_clinical',
  radiation_oncologist: 'healthcare_clinical', anesthesiologist: 'healthcare_clinical',
  neurologist: 'healthcare_clinical', emergency_medicine_physician: 'healthcare_clinical',
  general_surgeon: 'healthcare_clinical', neurosurgeon: 'healthcare_clinical',
  orthopedic_surgeon: 'healthcare_clinical', cardiothoracic_surgeon: 'healthcare_clinical',
  plastic_surgeon: 'healthcare_clinical', psychiatrist: 'healthcare_clinical',
  dermatologist: 'healthcare_clinical', ophthalmologist: 'healthcare_clinical',
  pediatrician: 'healthcare_clinical',
  // Nursing (11)
  icu_nurse: 'healthcare_clinical', er_nurse: 'healthcare_clinical',
  or_nurse: 'healthcare_clinical', pacu_nurse: 'healthcare_clinical',
  labor_delivery_nurse: 'healthcare_clinical', psychiatric_nurse: 'healthcare_clinical',
  oncology_nurse: 'healthcare_clinical', nurse_practitioner_family: 'healthcare_clinical',
  nurse_practitioner_psychiatric: 'healthcare_clinical', crna: 'healthcare_clinical',
  clinical_nurse_specialist: 'healthcare_clinical',
  // Allied Health (10) — physical_therapist already mapped above
  occupational_therapist: 'healthcare_clinical', speech_language_pathologist: 'healthcare_clinical',
  respiratory_therapist: 'healthcare_clinical', radiologic_technologist: 'healthcare_clinical',
  surgical_technologist: 'healthcare_clinical', paramedic: 'healthcare_clinical',
  emt: 'healthcare_clinical', hospital_pharmacist: 'healthcare_clinical',
  pharmacy_technician: 'healthcare_clinical',
  // Biotech distinct (10)
  computational_biologist: 'pharma_biotech', bioinformatics_scientist: 'pharma_biotech',
  cell_gene_therapy_specialist: 'pharma_biotech', protein_engineer: 'pharma_biotech',
  synthetic_biologist: 'pharma_biotech', bioprocess_engineer: 'pharma_biotech',
  biostatistician: 'pharma_biotech', cro_project_manager: 'pharma_biotech',
  bench_scientist: 'pharma_biotech', clinical_biostatistician: 'pharma_biotech',
  // Healthcare IT (5)
  epic_analyst: 'healthcare_admin', clinical_informaticist: 'healthcare_admin',
  fhir_engineer: 'tech', healthcare_data_scientist: 'data_science',
  revenue_cycle_management_analyst: 'healthcare_admin',
  // Behavioral Health (6)
  clinical_psychologist: 'healthcare_clinical', licensed_clinical_social_worker: 'healthcare_clinical',
  licensed_professional_counselor: 'healthcare_clinical', bcba: 'healthcare_clinical',
  addiction_counselor: 'healthcare_clinical', marriage_family_therapist: 'healthcare_clinical',
  // Healthcare Admin (6)
  chief_medical_officer: 'healthcare_admin', chief_nursing_officer: 'healthcare_admin',
  hospital_administrator_senior: 'healthcare_admin', clinical_operations_director: 'healthcare_admin',
  quality_improvement_director: 'healthcare_admin', medical_coder_denials_specialist: 'healthcare_admin',
  // Veterinary (4)
  veterinarian: 'veterinary', veterinary_technician: 'veterinary',
  veterinary_surgeon: 'veterinary', equine_veterinarian: 'veterinary',
  // Public Health (6)
  epidemiologist: 'public_health', biostatistician_public_health: 'public_health',
  mph_health_analyst: 'public_health', vaccine_program_specialist: 'public_health',
  global_health_officer: 'public_health', infection_preventionist: 'public_health',

  // ═══ Phase 6 / v38.0 — Final Coverage: Medical Sub-specialties + Adv Engineering/Creative + Skilled/Services/Education/Government (~46 roles) ═══
  // Medical Sub-specialties (12)
  vascular_surgeon: 'healthcare_clinical', ent_surgeon: 'healthcare_clinical',
  urologist: 'healthcare_clinical', ob_gyn_specialist: 'healthcare_clinical',
  palliative_care_specialist: 'healthcare_clinical', geriatrician: 'healthcare_clinical',
  sports_medicine_physician: 'healthcare_clinical', sleep_medicine_specialist: 'healthcare_clinical',
  nurse_midwife: 'healthcare_clinical', audiologist: 'healthcare_clinical',
  dietitian_nutritionist: 'healthcare_clinical', physician_assistant_surgical: 'healthcare_clinical',
  // Advanced Engineering (8)
  biomedical_engineer: 'pharma_biotech', aerospace_systems_engineer: 'tech',
  robotics_engineer: 'tech', mining_engineer: 'energy',
  marine_engineer: 'energy', quantum_computing_engineer: 'ml_ai',
  photonics_engineer: 'tech', rf_microwave_engineer: 'telecom',
  // Creative & Design (8)
  graphic_designer_commercial: 'design', illustrator_freelance: 'design',
  animator_3d: 'media_creative', commercial_photographer: 'media_creative',
  industrial_designer: 'design', fashion_designer: 'design',
  voice_actor: 'media_creative', makeup_artist_film_tv: 'media_creative',
  // Skilled Labor (6)
  auto_mechanic_master: 'manufacturing', heavy_equipment_operator: 'construction',
  crane_operator: 'construction', locksmith_master: 'manufacturing',
  commercial_diver: 'energy', arborist_certified: 'agriculture',
  // Personal Services + Wellness (6)
  personal_trainer_certified: 'hospitality', registered_dietitian: 'healthcare_clinical',
  massage_therapist_licensed: 'healthcare_clinical', hairstylist_master: 'retail',
  wedding_planner_executive: 'hospitality', funeral_director_licensed: 'hospitality',
  // Education Specialty (3)
  special_education_teacher: 'education', college_sports_coach: 'education',
  athletic_trainer_certified: 'healthcare_clinical',
  // Government Specialty (3)
  tax_cpa_specialist: 'accounting', foreign_service_officer: 'government',
  customs_border_officer: 'government',

  // ═══ Phase 5 / v38.0 — Media / Hospitality / CX Scale / Research & Academia (~38 roles) ═══
  // Media & Entertainment (14)
  editor_in_chief: 'media_creative', content_producer_video: 'media_creative',
  film_tv_director: 'media_creative', screenwriter: 'media_creative',
  video_editor_professional: 'media_creative', music_producer: 'media_creative',
  audio_engineer_professional: 'media_creative', podcast_producer: 'media_creative',
  talent_agent: 'media_creative', entertainment_attorney: 'legal',
  esports_manager: 'media_creative', media_analytics_specialist: 'data_science',
  broadcast_journalist: 'media_creative', documentary_filmmaker: 'media_creative',
  // Hospitality & Travel (10)
  restaurant_manager: 'hospitality', travel_agent_specialist: 'hospitality',
  airline_operations_manager: 'aviation', airport_operations_specialist: 'aviation',
  hospitality_technology_manager: 'hospitality', spa_wellness_director: 'hospitality',
  food_beverage_director: 'hospitality', concierge_specialist: 'hospitality',
  hotel_operations_manager: 'hospitality', chief_hospitality_officer: 'hospitality',
  // CX Support Scale (6)
  enterprise_support_engineer: 'tech', support_operations_director: 'consulting',
  workforce_management_analyst_cx: 'consulting', chatbot_ai_trainer: 'ml_ai',
  knowledge_base_specialist: 'consulting', voice_of_customer_analyst: 'data_science',
  // Research & Academia (8)
  postdoctoral_researcher: 'education', research_lab_director: 'education',
  science_policy_advisor: 'government', technology_transfer_specialist: 'education',
  research_commercialization_manager: 'education', think_tank_researcher: 'education',
  independent_researcher: 'education', science_journalist: 'media_creative',

  // ═══ Phase 4 / v38.0 — Industrial / Trades / Energy / Construction / Aviation / Public Safety (80 roles) ═══
  // Skilled Trades (15)
  journeyman_electrician: 'tech', master_electrician: 'tech',
  plumber_journeyman: 'construction', hvac_technician: 'construction', hvac_engineer_licensed: 'construction',
  welder_certified: 'manufacturing', pipefitter: 'construction', ironworker_structural: 'construction',
  carpenter_journeyman: 'construction', concrete_mason: 'construction', sheet_metal_worker: 'construction',
  boilermaker: 'manufacturing', millwright: 'manufacturing', industrial_painter: 'construction',
  roofer_commercial: 'construction',
  // Industrial Engineering (15)
  reliability_engineer: 'manufacturing', industrial_automation_engineer: 'tech',
  cnc_machinist_programmer: 'manufacturing', chemical_engineer: 'energy',
  materials_engineer: 'manufacturing', packaging_engineer: 'manufacturing',
  quality_systems_manager: 'manufacturing', continuous_improvement_manager: 'manufacturing',
  industrial_safety_engineer_hse: 'manufacturing', production_planning_manager: 'manufacturing',
  demand_planner: 'logistics', procurement_manager: 'logistics',
  category_manager_strategic: 'consulting', warehouse_operations_manager: 'logistics',
  environmental_engineer_industrial: 'energy',
  // Energy Specializations (15)
  reservoir_engineer: 'energy', drilling_engineer: 'energy', nuclear_engineer: 'energy',
  nuclear_plant_operator: 'energy', grid_operations_engineer: 'energy',
  energy_trading_analyst: 'finance', power_systems_engineer: 'energy',
  solar_pv_engineer_utility: 'energy', wind_energy_engineer: 'energy',
  battery_storage_engineer: 'energy', hydrogen_engineer: 'energy',
  geothermal_engineer: 'energy', transmission_line_engineer: 'energy',
  oil_gas_project_manager: 'energy', environmental_compliance_specialist_energy: 'energy',
  // Construction Specializations (15)
  site_superintendent: 'construction', quantity_surveyor: 'construction',
  bim_manager: 'construction', mep_coordinator: 'construction',
  safety_hse_manager_construction: 'construction', project_controls_specialist: 'construction',
  urban_planner: 'government', geotechnical_engineer: 'construction',
  building_inspector: 'government', facilities_manager: 'real_estate',
  real_estate_developer_commercial: 'real_estate', landscape_architect: 'construction',
  interior_designer_commercial: 'design', sustainability_consultant_built_env: 'consulting',
  fire_protection_engineer: 'construction',
  // Aviation (10)
  commercial_pilot_airline: 'aviation', first_officer_airline: 'aviation',
  corporate_pilot: 'aviation', air_traffic_controller: 'government',
  aviation_mechanic_ap: 'aviation', aerospace_engineer_structures: 'tech',
  aerospace_engineer_propulsion: 'tech', avionics_technician: 'tech',
  aerospace_project_manager: 'tech', uav_operator_commercial: 'tech',
  // Public Safety (10)
  police_officer: 'government', detective_investigator: 'government',
  firefighter: 'government', fire_captain: 'government',
  corrections_officer: 'government', probation_parole_officer: 'government',
  security_manager_physical: 'consulting', emergency_management_coordinator: 'government',
  forensic_scientist: 'government', crime_scene_investigator: 'government',

  // ═══ Phase 3 / v38.0 — Finance Deep + Insurance (70 roles) ═══
  // Investment Banking (10)
  ib_analyst: 'finance', ib_associate_ma: 'finance', ib_vp_ma: 'finance',
  ib_director_ma: 'finance', ib_md_ma: 'finance', ecm_banker: 'finance',
  dcm_banker: 'finance', leveraged_finance_banker: 'finance',
  restructuring_banker: 'finance', fig_banker: 'finance',
  // PE / VC (8)
  pe_associate: 'finance', pe_principal: 'finance', pe_partner: 'finance',
  growth_equity_principal: 'finance', vc_associate: 'finance',
  vc_principal: 'finance', vc_partner: 'finance', secondaries_principal: 'finance',
  // Quantitative Finance (6)
  quant_researcher: 'finance', quant_developer: 'finance', algo_trader: 'finance',
  risk_quant: 'finance', market_making_engineer: 'finance', stat_arb_researcher: 'finance',
  // Asset Management (6) — portfolio_manager already mapped above (line 348)
  etf_specialist: 'finance', fixed_income_trader: 'finance',
  equity_research_analyst: 'finance', multi_asset_strategist: 'finance', esg_analyst: 'finance',
  // Hedge Fund (5)
  long_short_equity_analyst: 'finance', event_driven_analyst: 'finance',
  macro_trader: 'finance', distressed_credit_analyst: 'finance', special_situations_analyst: 'finance',
  // Corporate Finance / Treasury (6)
  fpa_director: 'finance', treasurer: 'finance', ir_director: 'finance',
  deputy_cfo: 'finance', corporate_development_director: 'finance', controller_strategic: 'accounting',
  // Banking — Retail / Commercial (6)
  relationship_manager_commercial: 'finance', commercial_credit_officer: 'finance',
  wealth_manager_advisor: 'finance', private_banker: 'finance',
  mortgage_originator: 'finance', branch_manager_bank: 'finance',
  // Risk + Compliance (6)
  credit_risk_analyst: 'finance', market_risk_analyst: 'finance',
  operational_risk_manager: 'finance', model_risk_validator: 'finance',
  bsa_aml_specialist: 'finance', ofac_compliance_specialist: 'finance',
  // Insurance (12)
  life_actuary: 'finance', pc_actuary: 'finance', reinsurance_pricing_actuary: 'finance',
  catastrophe_modeler: 'finance', captive_insurance_manager: 'finance',
  health_underwriter_senior: 'finance', claims_executive: 'finance',
  insurance_broker_commercial: 'finance', mga_executive: 'finance',
  insurtech_product_manager: 'product', surplus_lines_specialist: 'finance',
  parametric_insurance_analyst: 'finance',
  // Real Estate Finance (5)
  cre_asset_manager: 'real_estate', cre_debt_origination: 'finance',
  reit_research_analyst: 'finance', opportunistic_re_investor: 'real_estate',
  gp_lp_relations_associate: 'finance',
};

/** Maps a canonical role key to its role family. Returns null if unmapped. */
export function getRoleFamilyForKey(roleKey: string): RoleFamily | null {
  return ROLE_KEY_TO_FAMILY[roleKey] ?? null;
}
