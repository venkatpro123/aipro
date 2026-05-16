// advanced_engineering_creative_actions.ts — v38.0 Phase 4B/5
// 16 Advanced Engineering & Creative/Design roles — biomedical, aerospace systems,
// robotics, mining, marine, quantum, photonics, RF/microwave, plus 8 creative roles
// (graphic, illustrator, 3D animator, commercial photographer, industrial designer,
// fashion designer, voice actor, makeup artist). Engineering roles share low AI
// displacement (build the AI); creative roles face acute generative-AI substitution
// pressure on commodity work.

type BracketPool = Record<string, Record<string, Array<{ title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string }>>>;

function pool(
  jc: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  mc: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  sc: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  h: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
  m: { title: string; description: string; layerFocus?: string; riskReductionPct?: number; deadline?: string; priority?: string },
): BracketPool {
  return {
    junior:    { critical: [jc], high: [h], moderate: [m], low: [m] },
    mid:       { critical: [mc], high: [h], moderate: [m], low: [m] },
    senior:    { critical: [sc], high: [h], moderate: [m], low: [m] },
    principal: { critical: [sc], high: [h], moderate: [m], low: [m] },
  };
}

const A_NETWORKING: BracketPool = pool(
  { title: 'Join 2 Active Technical Communities for Pipeline Intelligence', description: 'For engineers: join the BMES, AIAA, IEEE Robotics, SME, or SNAME society chapter that matches your specialty plus a focused Slack/Discord (e.g., r/AskEngineers Discord, IEEE Photonics Society Young Professionals). For creatives: join AIGA local chapter + ArtStation/3DTotal community. Senior practitioners share unfilled roles 30-60 days before public posting. Comment on 2 threads per week.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '14 days', priority: 'Medium' },
  { title: 'Build a Public Portfolio That Demonstrates Output Quality', description: 'For engineers: publish a GitHub repo with simulation results, CAD models, control firmware, or PCB designs from one personal project. For creatives: ArtStation/Behance reel showing 12+ finished pieces with process documentation. Recruiters at Medtronic, Boeing, Boston Dynamics, ILM, Pixar, Apple Industrial Design scan portfolios for active practitioners. A populated portfolio generates 5-8 recruiter contacts per quarter.', layerFocus: 'L3 · Visibility', riskReductionPct: 18, deadline: '30 days', priority: 'Medium' },
  { title: 'Pursue an Industry-Recognized Credential or Distinction', description: 'For engineers: PE license (most jurisdictions, ~$1,200 over 2 years post-EIT), specialty cert (e.g., AIAA Senior Member, IEEE Senior Member, SME CMfgT), or vendor cert (Dassault CSWE, Ansys ACP). For creatives: Adobe Certified Expert, Autodesk Maya certification, or juried award entry (Cannes Young Lions, ADC, AICP, Annie Awards). Each lifts median compensation by 8-15%.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '6 months — register now', priority: 'High' },
  { title: 'Audit Your LinkedIn for Specific Tools and Technologies', description: 'Recruiters search by specific tools — SolidWorks, CATIA, Ansys, MATLAB/Simulink, COMSOL, Cadence Virtuoso, ROS2 for engineers; Maya, Houdini, Blender, Cinema 4D, ZBrush, Substance Painter, DaVinci Resolve, Procreate, Figma for creatives. Add every tool you have hands-on with. Add an Open to Work signal. Triples recruiter outreach within 30 days.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
  { title: 'Ship One Public Project That Demonstrates Specialized Skill', description: 'Publish one substantive project — an open-source ROS2 package, a thermal simulation walkthrough, an animated short, a packaging design portfolio piece, or a published photo essay. One finished piece beats 10 in-progress sketches. Schedule a 4-week timeboxed sprint with a fixed publish date to force completion.', layerFocus: 'L3 · Reputation', riskReductionPct: 16, deadline: '30 days', priority: 'Medium' },
);

// ── ACTION_DB_ADVANCED_ENGINEERING_CREATIVE ──────────────────────────────────

export const ACTION_DB_ADVANCED_ENGINEERING_CREATIVE: Record<string, BracketPool> = {

  biomedical_engineer: pool(
    { title: 'Earn a BMES Membership and Pursue PE in Biomedical or Mechanical', description: 'BMES membership ($175/yr student, $260 professional) is the entry credential for biomedical engineering. Pair with PE eligibility in Mechanical (no dedicated biomedical PE in most US states yet) — total PE pathway ~$1,200 over 24 months post-FE. Medtronic, Stryker, Boston Scientific, and J&J specifically promote PE-licensed engineers into staff-level roles ($20K-$35K premium).', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months — register FE if needed', priority: 'Critical' },
    { title: 'Build a Regulatory-Aware Portfolio (FDA 510(k) / Design Controls)', description: 'Mid-career biomedical engineers who own FDA 510(k) submission experience or ISO 13485 Design Controls execution earn $25K-$45K more than pure R&D peers. Document one full design history file (DHF) on a personal project (open-source medical device, e.g., open-source spirometer), reference FDA 21 CFR 820. Hiring managers at Medtronic, GE Healthcare, Philips specifically screen for this.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to 3 Senior Roles at Medical Device Top-5', description: 'Medtronic, Stryker, Boston Scientific, J&J, Abbott pay senior biomedical engineers $145K-$210K base + 12-18% bonus + RSU. Even if you stay at current employer, the offer becomes leverage. Apply within 7 days; reference your DHF portfolio and any FDA submission experience.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '7 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  aerospace_systems_engineer: pool(
    { title: 'Pursue AIAA Membership and INCOSE CSEP Certification', description: 'AIAA membership ($120/yr) plus INCOSE Certified Systems Engineering Professional (CSEP, $400 exam + $175/yr cert) is the credential signature for aerospace systems engineering. Boeing, Lockheed Martin, Northrop Grumman, Raytheon, and NASA prime contractors specifically value CSEP for staff-engineer promotion ($15K-$30K premium).', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Document Concrete MBSE / DOORS / Cameo Experience', description: 'Mid-career aerospace systems engineers who own Model-Based Systems Engineering (MBSE) tooling — Cameo Systems Modeler, IBM DOORS, Capella — earn 18-28% more than requirements-doc-only peers. Publish one OS reference architecture using SysML on GitHub. Reference NASA SE Handbook NPR 7123.1 and DoDAF where appropriate. SpaceX, Blue Origin, and the NewSpace primes screen for this.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Get a Security Clearance (or Sponsor Re-Activation)', description: 'Active Secret/Top Secret clearance is worth $25K-$60K in immediate offer premium and unlocks the entire DoD prime contractor pipeline (Lockheed, Northrop, L3Harris, Leidos, Booz Allen aerospace work). If you have inactive clearance, reactivate now (sponsor-dependent, 60-90 days). If you have no clearance, target clearance-sponsoring junior roles to start the process.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  robotics_engineer: pool(
    { title: 'Build Public ROS2 / MoveIt2 Project on GitHub', description: 'A populated ROS2 repo with documented motion-planning, perception, or manipulation work is the single strongest signal in robotics hiring. Boston Dynamics, ABB, Fanuc, KUKA, Agility Robotics, and Figure all screen GitHub before interviews. Pick one task (pick-and-place with vision, mobile-base SLAM, dual-arm coordination), ship a video + repo within 60 days.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Join the IEEE Robotics & Automation Society and Publish at ICRA/IROS', description: 'IEEE RAS membership ($60/yr) plus a workshop paper at ICRA or IROS is the academic credential that converts senior robotics engineer ($165K) → staff robotics engineer ($220K+). Even a workshop paper (lower bar than main track) is sufficient signal. Co-author with a university lab if your employer does not support publication.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months — paper deadline', priority: 'High' },
    { title: 'Apply to Humanoid / Embodied AI Companies', description: 'Figure, 1X, Apptronik, Agility Robotics, Sanctuary, and Boston Dynamics are hiring senior robotics engineers at $200K-$320K base + significant equity in the embodied-AI boom. Tesla Optimus and Meta robotics also recruiting aggressively. Apply within 14 days with your ROS2 portfolio as the headline.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  mining_engineer: pool(
    { title: 'Earn SME Membership and Pursue PE in Mining/Mineral', description: 'Society for Mining, Metallurgy & Exploration (SME) membership ($175/yr) plus PE-Mining license is the credential standard. PE-Mining is offered in major mining states (NV, AZ, CO, MT, UT, WY, AK). PE adds $20K-$35K to senior mining engineer comp and is required for senior planning/permitting roles at Newmont, Barrick, Freeport-McMoRan, BHP, Rio Tinto.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Master Industry-Standard Mine Planning Software', description: 'Deswik, Vulcan (Maptek), Surpac (Dassault), MineSight (Hexagon), and Datamine are the dominant mine planning suites. Mid-career mining engineers fluent in 2+ of these earn 18-28% more than single-tool peers. Vendor certifications run $1,500-$4,000 each. Newmont, Barrick, and major consulting (SRK, Wood, AMC) specifically screen for multi-tool fluency.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    { title: 'Pivot to Critical Minerals / Battery Metals Specialization', description: 'Lithium, cobalt, nickel, copper, and rare earth project pipeline expansion (IRA + EU Critical Raw Materials Act) is driving acute shortage of engineers with battery-metals experience. Albemarle, Lithium Americas, Talon Metals, MP Materials hiring senior mining engineers at $160K-$240K. Pivot via 1-2 published technical papers (SME Mining Engineering journal) plus targeted applications.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  marine_engineer: pool(
    { title: 'Earn SNAME Membership and USCG Engineering License (if shipboard)', description: 'Society of Naval Architects and Marine Engineers (SNAME) membership ($165/yr) is the credential floor. For shipboard track, USCG Chief Engineer license is the credential bar that opens $180K+ offshore and senior fleet roles. For shore-side / shipyard track, PE-Naval Architecture & Marine Engineering (offered in select states) is the equivalent. Adds $25K-$45K to senior comp.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'Critical' },
    { title: 'Specialize in LNG / Offshore Wind / Autonomous Vessels', description: 'Three highest-demand marine engineering specialties in 2026: LNG carrier conversion/newbuild (Hyundai HI, Samsung HI, HD KSOE pipelines), offshore wind installation/cabling (Ørsted, Equinor, Vineyard Wind), and autonomous surface vessels (Saildrone, Sea Machines, MARTAC). Pivoting via 1 specialized course (DNV academy, ABS Academy) plus targeted apps opens $30K-$60K premium roles.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Build a Public Hydrodynamic / CFD Portfolio', description: 'A portfolio with OpenFOAM, ANSYS Fluent, or STAR-CCM+ hydrodynamic simulations (resistance, propulsion, seakeeping) plus matched experimental validation is the strongest senior signal. SNAME Maritime Convention papers and Marine Technology journal publications are the gold-standard signal — even one paper triples staff-engineer offer probability.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  quantum_computing_engineer: pool(
    { title: 'Complete IBM Qiskit / Google Cirq / Microsoft Q# Certified Track', description: 'IBM Qiskit Developer Certification ($200) plus hands-on with Google Cirq and Microsoft Azure Quantum (Q#) is the credential floor for quantum engineering roles. IBM Quantum Network, Google Quantum AI, Microsoft Azure Quantum, IonQ, Rigetti, PsiQuantum specifically screen for multi-platform fluency. Adds $30K-$60K to mid-level offer.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Publish at QIP, IEEE Quantum Week, or arXiv quant-ph', description: 'Quantum computing engineering is still publication-dominated for senior recognition. A workshop paper at QIP, IEEE Quantum Week, or even arXiv preprint with citations is the signal that converts $200K senior → $280K+ staff. Co-author with an academic collaborator if your employer is publication-restrictive. Topics in demand: error correction, gate optimization, quantum-classical hybrid algorithms.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '12 months', priority: 'Critical' },
    { title: 'Apply to Quantum Hardware vs. Software Roles', description: 'Quantum hardware engineers (superconducting, ion-trap, photonic, neutral atom) at IBM, Google, IonQ, Quantinuum, PsiQuantum, Atom Computing earn $250K-$400K total comp. Quantum software/algorithms engineers at the same companies plus QC Ware, Zapata, Classiq earn similar. Apply within 14 days — sub-2,000 quantum engineers globally with industry experience.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  photonics_engineer: pool(
    { title: 'Join IEEE Photonics Society and Pursue Optical Engineering Specialization', description: 'IEEE Photonics Society membership ($45/yr) plus deep specialization in one area (integrated photonics, silicon photonics, fiber lasers, LiDAR optics, AR/VR waveguides, or quantum photonics) is the senior-engineer credential. SPIE conferences (Photonics West, Optics+Photonics) are the primary recruiting venues — present even a poster to gain visibility.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Build Public Zemax / Code V / Lumerical Simulation Portfolio', description: 'Zemax OpticStudio, Synopsys Code V, and Ansys Lumerical are the dominant optical/photonic design suites. A portfolio with 3-5 designed-and-analyzed systems (lens design, waveguide, AR combiner, LiDAR scanner) is the senior-engineer signal. ASML, Lumentum, Coherent, II-VI, IPG Photonics, Magic Leap, Apple AR specifically screen for multi-tool fluency.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to LiDAR / AR-VR / Silicon Photonics Leaders', description: 'LiDAR (Luminar, Aeva, Innoviz, Hesai), AR/VR optics (Apple, Meta Reality Labs, Magic Leap, Snap), and silicon photonics (Ayar Labs, Lightmatter, PsiQuantum, Intel Silicon Photonics) hire senior photonics engineers at $175K-$260K base + equity. Apply within 14 days with simulation portfolio as headline.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  rf_microwave_engineer: pool(
    { title: 'Join IEEE MTT-S and Pursue Specific RF Tool Mastery', description: 'IEEE Microwave Theory and Technology Society (MTT-S) membership ($26/yr) is the technical-credential floor. Pair with deep fluency in Keysight ADS, Cadence AWR, Ansys HFSS — multi-tool fluency adds $20K-$40K to senior comp. IEEE MTT-S International Microwave Symposium (IMS) is the primary recruiting and credentialing venue.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Specialize in 5G/6G mmWave, Phased Arrays, or GaN Power Amplifiers', description: 'Three highest-demand RF specializations in 2026: 5G/6G mmWave front-end, phased-array antenna design (radar + SATCOM), and GaN/SiC power amplifier design. Qualcomm, MediaTek, Apple, Samsung, Northrop Grumman, Raytheon, L3Harris, Anokiwave, SpaceX (Starlink), and Amazon Kuiper all hiring at $175K-$255K base. Pivot via 1-2 conference papers + portfolio.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Get a Security Clearance for Defense RF Work', description: 'Defense RF roles (radar, EW, SATCOM, mmWave imaging) at Northrop Grumman, Lockheed, Raytheon, L3Harris, BAE pay $20K-$45K clearance premium plus dramatic role security. Active Secret/TS clearance is the access key. If inactive, work with sponsor to reactivate (60-90 days). If unclear, target clearance-sponsoring junior roles.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  graphic_designer_commercial: pool(
    { title: 'Specialize in One AI-Resistant Niche (Brand Systems, Editorial, Packaging)', description: 'Commodity graphic design (social tiles, basic layout, stock-photo composites) is the highest-displacement creative role in 2026 — Midjourney, DALL-E, Adobe Firefly, and Canva AI now handle 60%+ of this work. Survive by specializing in one defensible niche: brand identity systems (logo + guidelines + applications), editorial design (magazines, books), or premium packaging — where typographic judgment and brand strategy still require human direction. Build 5 portfolio pieces in your chosen niche within 90 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '90 days', priority: 'Critical' },
    { title: 'Become AIGA Member and Pursue Awards (ADC, Brand New, Webby)', description: 'AIGA membership ($265/yr professional) is the credential floor for serious commercial designers. Pair with awards entry: One Show / ADC Annual, Brand New / Under Consideration, AIGA 50 Books / 50 Covers, D&AD Pencils. Even a shortlist mention adds $15K-$25K to senior offer and converts journeyman → senior designer in recruiter eyes. Submission costs $50-$300 per entry.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '6 months — entry deadlines', priority: 'High' },
    { title: 'Develop Hybrid Skills: Design + Motion, Design + Strategy, Design + Code', description: 'Pure graphic designers are commoditized; hybrid designers command 30-50% premium. Top hybrid combos in 2026: design + motion (After Effects, Cavalry, Rive), design + strategy (brand strategy, naming, content), or design + code (Webflow, Framer, basic React/Figma plugins). Pick one within 14 days, complete a 60-day skill ramp via Domestika or School of Motion courses ($200-$800).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  illustrator_freelance: pool(
    { title: 'Establish a Defensible Style + 3-Client Concentration', description: 'Freelance illustration faces the highest generative-AI substitution pressure (40%+ for commodity work). Survival requires a recognizable personal style (Midjourney cannot replicate "your" style without permission/training data) plus 3 long-term repeat clients providing 60%+ of revenue (children\'s book publisher, editorial outlet, agency retainer). Identify 3 target clients this week; pitch each within 30 days.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '30 days', priority: 'Critical' },
    { title: 'Build a Premium Portfolio on Behance / ArtStation / Instagram + Procreate Process', description: 'Behance/ArtStation for editorial and agency clients; Instagram for direct-to-consumer (prints, merch, commissions). Procreate process videos and timelapses (recorded on iPad) are the highest-engagement content in 2026 — viewers value authentic human craft. Publish 1 timelapse per week for 90 days; aim for 500-2,000 followers per quarter.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Build a Children\'s Book / Editorial / Licensing Specialty', description: 'Children\'s book illustration (Penguin Random House, HarperCollins, Scholastic, Chronicle Books) is among the most AI-resistant illustration niches — publishers require named-illustrator brand for marketing. Editorial (NYT, New Yorker, WSJ Op-Ed, Wired) pays $1,200-$3,500 per piece. Licensing (Society of Illustrators, art licensing agents) creates passive income. Pick one within 14 days; pitch via a Society of Illustrators-style portfolio mailing.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  animator_3d: pool(
    { title: 'Master One Production Pipeline (Maya + Houdini OR Blender + Unreal)', description: 'Generalist 3D animators are commoditized; pipeline specialists are not. Two viable pipelines in 2026: Maya + Houdini + Substance + RenderMan/Arnold (VFX feature pipeline — ILM, Weta, MPC, DNEG, Framestore) or Blender + Unreal Engine 5 + Substance (real-time / virtual production — Epic Games, Quixel, Trixter). Pick one within 14 days; commit to a 90-day skill-ramp with 1 finished piece per pipeline.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    { title: 'Build a 60-Second Demo Reel That Demonstrates a Specialty', description: 'A 60-second demo reel showing one specialty (character animation, FX simulation, hard-surface modeling, lighting/lookdev) beats a 3-minute generalist reel for recruiter response rate. Match the reel to specific target studios: Pixar wants character animators, ILM wants creature FX, Riot Games wants stylized character, MPC wants high-fidelity creature. Ship within 60 days.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Apply to Animation / VFX / Games Top-Tier with Reel', description: 'Pixar, ILM, Weta FX, DNEG, MPC, Framestore, Sony Imageworks pay senior animators $115K-$180K. Games studios (Naughty Dog, Riot, Blizzard, Insomniac, Epic Games) pay $120K-$200K. Real-time / virtual production studios (Disguise, Quixel, Trixter, Halon) growing 30-50% YoY. Apply within 14 days with new reel.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  commercial_photographer: pool(
    { title: 'Join ASMP and Specialize in One High-Margin Vertical', description: 'American Society of Media Photographers (ASMP) membership ($395/yr) is the credential and legal-resource floor for commercial work. Specialize in one vertical that resists AI substitution: commercial portrait (executive, editorial), architecture/interior (real estate luxury), product (food, beverage, luxury goods), or live event (corporate, sports, news). AI image gen pressures stock and concept work but cannot replicate real-time live capture or branded-talent portraiture.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Build a Direct-Client Pipeline of 5 Retainer Accounts', description: 'Freelance commercial photographers with 5+ retainer / repeat clients earn 2-3x what gig-economy photographers earn. Target: 5 agencies, brands, or publications paying $2K-$10K/shoot on a quarterly or monthly cadence. Cold outreach (Instagram DMs, LinkedIn, ASMP find-a-photographer) is the primary acquisition channel. Pitch 5 prospects per week for 12 weeks.', layerFocus: 'L4 · Network', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Develop Video / Motion Capability for Hybrid Packages', description: 'Clients increasingly bundle stills + motion (BTS, social cut-downs, brand films). Commercial photographers who can deliver both win 60%+ premium budgets. Invest in one motion-capable body (Sony A7S III, Canon R5C, FX3 — used $2,500-$4,500), and edit in DaVinci Resolve. 60-day skill ramp via Aputure courses + 1 finished hybrid project.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  industrial_designer: pool(
    { title: 'Join IDSA and Build a Physical-Prototype Portfolio', description: 'Industrial Designers Society of America (IDSA) membership ($295/yr) is the credential floor. Pair with a portfolio of 5-8 physical prototypes (3D-printed, CNC-machined, or hand-fabricated) photographed professionally — pure-digital renders read as junior-level. Apple Industrial Design, IDEO, Frog, Smart Design, Teague, Ammunition, and in-house teams at Tesla, Whirlpool, Steelcase, Herman Miller specifically screen for physical prototyping capability.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Master SolidWorks + KeyShot + Rhino + Sketching Fundamentals', description: 'Industrial design tool stack in 2026: SolidWorks or Creo (engineering-grade CAD), Rhino + Grasshopper (parametric/free-form), KeyShot (photo-real rendering), plus traditional sketching (Procreate on iPad, marker rendering). Multi-tool fluency adds $20K-$35K to senior comp. Pivoting via SolidWorks CSWP cert ($299), KeyShot certified user ($499), and 60-day sketching practice.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    { title: 'Pursue IDEA Awards / Red Dot / iF Design Awards', description: 'IDEA Awards (IDSA), Red Dot, iF Design, Core77 Design Awards are the industrial design recognition pipeline. Even a finalist mention adds $15K-$30K to senior offer and accelerates Apple / Frog / IDEO interviews. Submission costs $200-$800 per entry. Build 1-2 award-worthy projects in 6 months; submit to 3-4 awards.', layerFocus: 'L3 · Reputation', riskReductionPct: 24, deadline: '6 months — entry deadlines', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  fashion_designer: pool(
    { title: 'Pursue CFDA Recognition or Award Entry (CFDA/Vogue Fashion Fund, LVMH Prize)', description: 'Council of Fashion Designers of America (CFDA) membership is by invitation, but the CFDA/Vogue Fashion Fund ($400K + mentorship), LVMH Prize ($300K + mentorship), and ANDAM Fashion Award (€280K) are the primary recognition pipelines for emerging designers. Even a semi-finalist mention transforms career trajectory. Application costs $0-$500. Apply this cycle.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '6 months — application cycle', priority: 'Critical' },
    { title: 'Build a Tight 12-Look Capsule Collection + Lookbook', description: 'A focused 12-look capsule (vs. 30+-look graduate collection) with cohesive concept, technical garments, and editorial-quality lookbook is the modern portfolio standard. Buyers, press, and CFDA application reviewers evaluate cohesion over volume. Total budget: $8K-$20K for fabric + production + photography. Ship within 6 months.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Apply to Heritage Houses + Modern Direct-to-Consumer Brands', description: 'Heritage houses (LVMH brands — Louis Vuitton, Dior, Loewe, Celine; Kering — Gucci, Saint Laurent, Balenciaga; Hermès; Prada Group; Chanel) pay senior designers $120K-$220K. Modern DTC (Mansur Gavriel, Khaite, The Row, Lemaire, Phoebe Philo, Toteme) similar. Apply within 14 days with capsule lookbook as headline.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '14 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  voice_actor: pool(
    { title: 'Join SAG-AFTRA and Build Union-Rate Pipeline', description: 'SAG-AFTRA membership ($3,000 initiation + $241.92 base dues, half-yearly) is the single highest career-leverage credential in voice acting. Union scale guarantees minimums: $948+/4-hour session for animation, $396+/hour for commercial, plus residuals. Non-union work is the highest-displacement segment (synthetic voices like ElevenLabs, Play.ht, Microsoft VALL-E are eating commodity narration). Join via Taft-Hartley voucher from a union project, or 3-day-status conversion.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a Home Studio + Demo Reel That Beats Synthetic Voice', description: 'A broadcast-quality home studio (treated booth — WhisperRoom or DIY, Sennheiser MKH 416 or Neumann TLM 103, Apollo Twin or Audient interface, total $3K-$6K) is the technical floor. Pair with 3 specialized demo reels (commercial, animation/character, narration/audiobook). Survive the AI substitution wave by demonstrating emotional range, comedic timing, and direction-following that ElevenLabs cannot match.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Land 2 Agents (Commercial + Theatrical/Animation)', description: 'Top voice agents (DPN, CESD, Atlas Talent, AVO, Innovative Artists, SBV, Abrams Artists) handle 70%+ of premium auditions. Without an agent, you compete on Voices.com / Voice123 for $50-$300 jobs; with an agent, you audition for $5K-$50K national commercial campaigns and SAG-AFTRA animation series. Submit demo reels to 8-10 agents within 14 days.', layerFocus: 'L4 · Network', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  makeup_artist_film_tv: pool(
    { title: 'Join IATSE Local 706 (Make-Up Artists & Hair Stylists Guild)', description: 'IATSE Local 706 membership is the single highest career-leverage credential for film/TV makeup artists. Union scale: $54-$95/hr depending on tier (Department Head, Key, Journey), plus pension, health, residuals. Initiation $4,500-$8,000 + quarterly dues. Required for major studio productions (Disney, Warner Bros, Netflix, Amazon, Apple TV+). Pathway: 30+ accumulated days on non-union productions, then Roster Office application.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '12 months', priority: 'Critical' },
    { title: 'Build Specialty Portfolio: Beauty, Period, SFX, or Prosthetic', description: 'Generalist makeup artists are commoditized; specialty artists are not. Four specialties with strongest career trajectories: beauty/glam (commercials, fashion editorial — Vogue, Bazaar), period (HBO/Apple TV+ prestige drama — Bridgerton, Crown, Mad Men style), SFX (horror, action — Walking Dead, Stranger Things), prosthetic (creature, aging — Wētā Workshop, KNB EFX, Dick Smith protégés). Pick one within 14 days; build 8-12 portfolio looks photographed professionally.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Pursue Make-Up Artists & Hair Stylists Guild Awards / Emmy Recognition', description: 'Make-Up Artists & Hair Stylists Guild Awards (MUAHS) and Emmy / Oscar nominations are the recognition pipeline that converts journeyman → Department Head ($1,500-$3,500/day rates). Even one nomination shifts category for Local 706 roster placement. Build relationships with Department Heads on at least 2 productions per year to be considered for credit.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '12 months', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE: Record<string, { canonicalKey: string; displayRole: string }> = {
  // Biomedical
  'biomedical engineer': { canonicalKey: 'biomedical_engineer', displayRole: 'Biomedical Engineer' },
  'medical device engineer': { canonicalKey: 'biomedical_engineer', displayRole: 'Medical Device Engineer' },
  'bme': { canonicalKey: 'biomedical_engineer', displayRole: 'Biomedical Engineer' },
  'biomechanical engineer': { canonicalKey: 'biomedical_engineer', displayRole: 'Biomechanical Engineer' },
  'rehabilitation engineer': { canonicalKey: 'biomedical_engineer', displayRole: 'Rehabilitation Engineer' },
  // Aerospace Systems
  'aerospace systems engineer': { canonicalKey: 'aerospace_systems_engineer', displayRole: 'Aerospace Systems Engineer' },
  'aerospace systems': { canonicalKey: 'aerospace_systems_engineer', displayRole: 'Aerospace Systems Engineer' },
  'avionics systems engineer': { canonicalKey: 'aerospace_systems_engineer', displayRole: 'Avionics Systems Engineer' },
  'spacecraft systems engineer': { canonicalKey: 'aerospace_systems_engineer', displayRole: 'Spacecraft Systems Engineer' },
  'mission systems engineer': { canonicalKey: 'aerospace_systems_engineer', displayRole: 'Mission Systems Engineer' },
  // Robotics
  'robotics engineer': { canonicalKey: 'robotics_engineer', displayRole: 'Robotics Engineer' },
  'robotics software engineer': { canonicalKey: 'robotics_engineer', displayRole: 'Robotics Software Engineer' },
  'motion planning engineer': { canonicalKey: 'robotics_engineer', displayRole: 'Motion Planning Engineer' },
  'manipulation engineer': { canonicalKey: 'robotics_engineer', displayRole: 'Manipulation Engineer' },
  'autonomy engineer': { canonicalKey: 'robotics_engineer', displayRole: 'Autonomy Engineer' },
  // Mining
  'mining engineer': { canonicalKey: 'mining_engineer', displayRole: 'Mining Engineer' },
  'mine planning engineer': { canonicalKey: 'mining_engineer', displayRole: 'Mine Planning Engineer' },
  'mineral processing engineer': { canonicalKey: 'mining_engineer', displayRole: 'Mineral Processing Engineer' },
  'geological engineer': { canonicalKey: 'mining_engineer', displayRole: 'Geological Engineer' },
  // Marine
  'marine engineer': { canonicalKey: 'marine_engineer', displayRole: 'Marine Engineer' },
  'naval architect': { canonicalKey: 'marine_engineer', displayRole: 'Naval Architect' },
  'offshore engineer': { canonicalKey: 'marine_engineer', displayRole: 'Offshore Engineer' },
  'ship engineer': { canonicalKey: 'marine_engineer', displayRole: 'Ship Engineer' },
  // Quantum
  'quantum computing engineer': { canonicalKey: 'quantum_computing_engineer', displayRole: 'Quantum Computing Engineer' },
  'quantum engineer': { canonicalKey: 'quantum_computing_engineer', displayRole: 'Quantum Engineer' },
  'quantum software engineer': { canonicalKey: 'quantum_computing_engineer', displayRole: 'Quantum Software Engineer' },
  'quantum algorithms engineer': { canonicalKey: 'quantum_computing_engineer', displayRole: 'Quantum Algorithms Engineer' },
  'quantum hardware engineer': { canonicalKey: 'quantum_computing_engineer', displayRole: 'Quantum Hardware Engineer' },
  // Photonics
  'photonics engineer': { canonicalKey: 'photonics_engineer', displayRole: 'Photonics Engineer' },
  'optical engineer': { canonicalKey: 'photonics_engineer', displayRole: 'Optical Engineer' },
  'laser engineer': { canonicalKey: 'photonics_engineer', displayRole: 'Laser Engineer' },
  'silicon photonics engineer': { canonicalKey: 'photonics_engineer', displayRole: 'Silicon Photonics Engineer' },
  'integrated photonics engineer': { canonicalKey: 'photonics_engineer', displayRole: 'Integrated Photonics Engineer' },
  // RF / Microwave
  'rf engineer': { canonicalKey: 'rf_microwave_engineer', displayRole: 'RF Engineer' },
  'rf microwave engineer': { canonicalKey: 'rf_microwave_engineer', displayRole: 'RF/Microwave Engineer' },
  'microwave engineer': { canonicalKey: 'rf_microwave_engineer', displayRole: 'Microwave Engineer' },
  'antenna engineer': { canonicalKey: 'rf_microwave_engineer', displayRole: 'Antenna Engineer' },
  'radar engineer': { canonicalKey: 'rf_microwave_engineer', displayRole: 'Radar Engineer' },
  // Graphic Designer (commercial)
  'graphic designer': { canonicalKey: 'graphic_designer_commercial', displayRole: 'Graphic Designer' },
  'commercial graphic designer': { canonicalKey: 'graphic_designer_commercial', displayRole: 'Commercial Graphic Designer' },
  'visual designer commercial': { canonicalKey: 'graphic_designer_commercial', displayRole: 'Visual Designer' },
  'identity designer': { canonicalKey: 'graphic_designer_commercial', displayRole: 'Identity Designer' },
  'editorial designer': { canonicalKey: 'graphic_designer_commercial', displayRole: 'Editorial Designer' },
  // Illustrator
  'illustrator': { canonicalKey: 'illustrator_freelance', displayRole: 'Illustrator' },
  'freelance illustrator': { canonicalKey: 'illustrator_freelance', displayRole: 'Freelance Illustrator' },
  'editorial illustrator': { canonicalKey: 'illustrator_freelance', displayRole: 'Editorial Illustrator' },
  'concept illustrator': { canonicalKey: 'illustrator_freelance', displayRole: 'Concept Illustrator' },
  // 3D Animator
  '3d animator': { canonicalKey: 'animator_3d', displayRole: '3D Animator' },
  'animator 3d': { canonicalKey: 'animator_3d', displayRole: '3D Animator' },
  'character animator': { canonicalKey: 'animator_3d', displayRole: 'Character Animator' },
  'vfx animator': { canonicalKey: 'animator_3d', displayRole: 'VFX Animator' },
  'cg animator': { canonicalKey: 'animator_3d', displayRole: 'CG Animator' },
  // Commercial Photographer
  'commercial photographer': { canonicalKey: 'commercial_photographer', displayRole: 'Commercial Photographer' },
  'product photographer': { canonicalKey: 'commercial_photographer', displayRole: 'Product Photographer' },
  'fashion photographer': { canonicalKey: 'commercial_photographer', displayRole: 'Fashion Photographer' },
  'editorial photographer': { canonicalKey: 'commercial_photographer', displayRole: 'Editorial Photographer' },
  'architectural photographer': { canonicalKey: 'commercial_photographer', displayRole: 'Architectural Photographer' },
  // Industrial Designer
  'industrial designer': { canonicalKey: 'industrial_designer', displayRole: 'Industrial Designer' },
  'product industrial designer': { canonicalKey: 'industrial_designer', displayRole: 'Product Designer (Industrial)' },
  'hardware designer': { canonicalKey: 'industrial_designer', displayRole: 'Hardware Designer' },
  'consumer product designer': { canonicalKey: 'industrial_designer', displayRole: 'Consumer Product Designer' },
  // Fashion Designer
  'fashion designer': { canonicalKey: 'fashion_designer', displayRole: 'Fashion Designer' },
  'apparel designer': { canonicalKey: 'fashion_designer', displayRole: 'Apparel Designer' },
  'womenswear designer': { canonicalKey: 'fashion_designer', displayRole: 'Womenswear Designer' },
  'menswear designer': { canonicalKey: 'fashion_designer', displayRole: 'Menswear Designer' },
  'accessories designer': { canonicalKey: 'fashion_designer', displayRole: 'Accessories Designer' },
  // Voice Actor
  'voice actor': { canonicalKey: 'voice_actor', displayRole: 'Voice Actor' },
  'voiceover artist': { canonicalKey: 'voice_actor', displayRole: 'Voiceover Artist' },
  'voice over actor': { canonicalKey: 'voice_actor', displayRole: 'Voice Over Actor' },
  'narrator': { canonicalKey: 'voice_actor', displayRole: 'Narrator' },
  // Makeup Artist Film/TV
  'makeup artist film tv': { canonicalKey: 'makeup_artist_film_tv', displayRole: 'Makeup Artist (Film/TV)' },
  'makeup artist': { canonicalKey: 'makeup_artist_film_tv', displayRole: 'Makeup Artist' },
  'film makeup artist': { canonicalKey: 'makeup_artist_film_tv', displayRole: 'Film Makeup Artist' },
  'sfx makeup artist': { canonicalKey: 'makeup_artist_film_tv', displayRole: 'SFX Makeup Artist' },
  'prosthetic makeup artist': { canonicalKey: 'makeup_artist_film_tv', displayRole: 'Prosthetic Makeup Artist' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE: Record<string, string> = {
  biomedical_engineer: 'biomedical_engineer',
  aerospace_systems_engineer: 'aerospace_systems_engineer',
  robotics_engineer: 'robotics_engineer',
  mining_engineer: 'mining_engineer',
  marine_engineer: 'marine_engineer',
  quantum_computing_engineer: 'quantum_computing_engineer',
  photonics_engineer: 'photonics_engineer',
  rf_microwave_engineer: 'rf_microwave_engineer',
  graphic_designer_commercial: 'graphic_designer_commercial',
  illustrator_freelance: 'illustrator_freelance',
  animator_3d: 'animator_3d',
  commercial_photographer: 'commercial_photographer',
  industrial_designer: 'industrial_designer',
  fashion_designer: 'fashion_designer',
  voice_actor: 'voice_actor',
  makeup_artist_film_tv: 'makeup_artist_film_tv',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  biomedical_engineer:         { roleKey: 'biomedical_engineer',         roleName: 'Biomedical Engineer',         demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 55, yoyJobOpeningsChange: 12,  topHiringLocations: ['Minneapolis MN', 'Boston MA', 'San Diego CA', 'Indianapolis IN', 'Warsaw IN'],            aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Medtronic, Stryker, J&J, GE Healthcare driving steady hiring; FDA submission experience commands premium.' },
  aerospace_systems_engineer:  { roleKey: 'aerospace_systems_engineer',  roleName: 'Aerospace Systems Engineer',  demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 75, yoyJobOpeningsChange: 18,  topHiringLocations: ['Los Angeles CA', 'Seattle WA', 'Huntsville AL', 'Houston TX', 'Hampton VA'],              aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Boeing, Lockheed, Northrop, SpaceX, Blue Origin, NASA all expanding; clearance is 2x force multiplier.' },
  robotics_engineer:           { roleKey: 'robotics_engineer',           roleName: 'Robotics Engineer',           demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 62, yoyJobOpeningsChange: 28,  topHiringLocations: ['San Francisco CA', 'Boston MA', 'Pittsburgh PA', 'Austin TX', 'Seattle WA'],              aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Humanoid + embodied AI boom (Figure, 1X, Apptronik, Tesla Optimus) driving acute robotics hiring.' },
  mining_engineer:             { roleKey: 'mining_engineer',             roleName: 'Mining Engineer',             demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 85, yoyJobOpeningsChange: 15,  topHiringLocations: ['Denver CO', 'Salt Lake City UT', 'Tucson AZ', 'Elko NV', 'Reno NV'],                       aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Critical minerals (Li/Co/Ni/Cu/REE) demand from IRA + EU CRMA driving hiring at Newmont, Albemarle, MP Materials.' },
  marine_engineer:             { roleKey: 'marine_engineer',             roleName: 'Marine Engineer',             demandIndex: 74, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 70, yoyJobOpeningsChange: 8,   topHiringLocations: ['Houston TX', 'Norfolk VA', 'New Orleans LA', 'Seattle WA', 'San Diego CA'],                aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'LNG carrier newbuild + offshore wind installation + autonomous vessels driving specialty demand.' },
  quantum_computing_engineer:  { roleKey: 'quantum_computing_engineer',  roleName: 'Quantum Computing Engineer',  demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 105, yoyJobOpeningsChange: 32, topHiringLocations: ['San Francisco CA', 'Boston MA', 'New York NY', 'Yorktown Heights NY', 'Boulder CO'],     aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Sub-2K quantum engineers globally with industry experience; IBM, Google, IonQ, PsiQuantum, Quantinuum hiring.' },
  photonics_engineer:          { roleKey: 'photonics_engineer',          roleName: 'Photonics Engineer',          demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 78, yoyJobOpeningsChange: 22,  topHiringLocations: ['Cupertino CA', 'Boston MA', 'San Jose CA', 'Rochester NY', 'Tucson AZ'],                  aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'LiDAR + AR/VR + silicon photonics + quantum optics combine to drive acute demand at Apple, Meta, ASML, Lumentum.' },
  rf_microwave_engineer:       { roleKey: 'rf_microwave_engineer',       roleName: 'RF/Microwave Engineer',       demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 72, yoyJobOpeningsChange: 18,  topHiringLocations: ['San Diego CA', 'Cupertino CA', 'Hawthorne CA', 'Boston MA', 'Melbourne FL'],              aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: '5G/6G mmWave + phased arrays + GaN + Starlink/Kuiper driving acute demand; clearance roles strongly preferred.' },
  graphic_designer_commercial: { roleKey: 'graphic_designer_commercial', roleName: 'Graphic Designer (Commercial)',demandIndex: 58, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'falling', timeToFillDays: 22, yoyJobOpeningsChange: -22, topHiringLocations: ['New York NY', 'Los Angeles CA', 'San Francisco CA', 'Chicago IL', 'Austin TX'],          aiSubstitutionRisk: 0.40, dataQuarter: '2026-Q1', calibrationNote: 'Highest-displacement creative role 2026 — generative AI (Firefly, Midjourney, Canva AI) eating commodity layout/social work.' },
  illustrator_freelance:       { roleKey: 'illustrator_freelance',       roleName: 'Freelance Illustrator',       demandIndex: 56, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'falling', timeToFillDays: 18, yoyJobOpeningsChange: -25, topHiringLocations: ['Remote', 'New York NY', 'Los Angeles CA', 'Portland OR', 'Brooklyn NY'],                  aiSubstitutionRisk: 0.40, dataQuarter: '2026-Q1', calibrationNote: 'Commodity illustration acutely displaced by Midjourney/DALL-E; survivable via defensible style + repeat clients.' },
  animator_3d:                 { roleKey: 'animator_3d',                 roleName: '3D Animator',                 demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 48, yoyJobOpeningsChange: 2,  topHiringLocations: ['Los Angeles CA', 'Vancouver BC', 'Montreal QC', 'Wellington', 'London'],                  aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1', calibrationNote: 'Generalist animators under pressure; pipeline specialists (Maya+Houdini or Blender+Unreal) stable to rising.' },
  commercial_photographer:     { roleKey: 'commercial_photographer',     roleName: 'Commercial Photographer',     demandIndex: 60, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'stable',  timeToFillDays: 25, yoyJobOpeningsChange: -15, topHiringLocations: ['New York NY', 'Los Angeles CA', 'Miami FL', 'Chicago IL', 'Atlanta GA'],                  aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1', calibrationNote: 'Stock + concept photography heavily displaced; live event + branded portrait + hybrid video survive.' },
  industrial_designer:         { roleKey: 'industrial_designer',         roleName: 'Industrial Designer',         demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 55, yoyJobOpeningsChange: 4,   topHiringLocations: ['Cupertino CA', 'San Francisco CA', 'Palo Alto CA', 'Austin TX', 'New York NY'],            aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Apple, Frog, IDEO, Smart Design, Tesla, Herman Miller stable hiring; physical prototyping required.' },
  fashion_designer:            { roleKey: 'fashion_designer',            roleName: 'Fashion Designer',            demandIndex: 64, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 60, yoyJobOpeningsChange: -2, topHiringLocations: ['New York NY', 'Los Angeles CA', 'Paris', 'Milan', 'London'],                                aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1', calibrationNote: 'Heritage houses (LVMH, Kering, Hermès, Prada, Chanel) + DTC stable; commodity fast-fashion design under pressure.' },
  voice_actor:                 { roleKey: 'voice_actor',                 roleName: 'Voice Actor',                 demandIndex: 54, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'falling', timeToFillDays: 15, yoyJobOpeningsChange: -32, topHiringLocations: ['Los Angeles CA', 'New York NY', 'Atlanta GA', 'Toronto ON', 'Remote'],                    aiSubstitutionRisk: 0.38, dataQuarter: '2026-Q1', calibrationNote: 'Synthetic voice (ElevenLabs, Play.ht, VALL-E) eating commodity narration; SAG-AFTRA union work + character/animation survive.' },
  makeup_artist_film_tv:       { roleKey: 'makeup_artist_film_tv',       roleName: 'Makeup Artist (Film/TV)',     demandIndex: 68, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 32, yoyJobOpeningsChange: 5,   topHiringLocations: ['Los Angeles CA', 'New York NY', 'Atlanta GA', 'Albuquerque NM', 'Vancouver BC'],          aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'IATSE Local 706 union work + prosthetic/SFX + Department Head pathway protected; production volume rebound.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE: Record<string, Record<string, number>> = {
  biomedical_engineer:         { '0-2': 78_000,  '2-5': 105_000, '5-10': 138_000, '10-15': 162_000, '15+': 180_000 },
  aerospace_systems_engineer:  { '0-2': 95_000,  '2-5': 130_000, '5-10': 170_000, '10-15': 200_000, '15+': 220_000 },
  robotics_engineer:           { '0-2': 105_000, '2-5': 140_000, '5-10': 180_000, '10-15': 215_000, '15+': 235_000 },
  mining_engineer:             { '0-2': 82_000,  '2-5': 110_000, '5-10': 142_000, '10-15': 172_000, '15+': 195_000 },
  marine_engineer:             { '0-2': 80_000,  '2-5': 105_000, '5-10': 138_000, '10-15': 168_000, '15+': 190_000 },
  quantum_computing_engineer:  { '0-2': 138_000, '2-5': 185_000, '5-10': 240_000, '10-15': 285_000, '15+': 310_000 },
  photonics_engineer:          { '0-2': 95_000,  '2-5': 128_000, '5-10': 162_000, '10-15': 188_000, '15+': 200_000 },
  rf_microwave_engineer:       { '0-2': 92_000,  '2-5': 125_000, '5-10': 160_000, '10-15': 188_000, '15+': 210_000 },
  graphic_designer_commercial: { '0-2': 50_000,  '2-5': 68_000,  '5-10': 88_000,  '10-15': 110_000, '15+': 130_000 },
  illustrator_freelance:       { '0-2': 38_000,  '2-5': 58_000,  '5-10': 82_000,  '10-15': 108_000, '15+': 135_000 },
  animator_3d:                 { '0-2': 62_000,  '2-5': 88_000,  '5-10': 118_000, '10-15': 145_000, '15+': 160_000 },
  commercial_photographer:     { '0-2': 42_000,  '2-5': 65_000,  '5-10': 92_000,  '10-15': 120_000, '15+': 145_000 },
  industrial_designer:         { '0-2': 68_000,  '2-5': 92_000,  '5-10': 122_000, '10-15': 152_000, '15+': 175_000 },
  fashion_designer:            { '0-2': 52_000,  '2-5': 78_000,  '5-10': 112_000, '10-15': 148_000, '15+': 180_000 },
  voice_actor:                 { '0-2': 32_000,  '2-5': 58_000,  '5-10': 108_000, '10-15': 175_000, '15+': 250_000 },
  makeup_artist_film_tv:       { '0-2': 45_000,  '2-5': 72_000,  '5-10': 108_000, '10-15': 148_000, '15+': 185_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_ADVANCED_ENGINEERING_CREATIVE: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  biomedical_engineer: {
    strongOpener: 'I want to discuss my compensation in light of my FDA 510(k) submission track record, design controls execution, and ISO 13485 audit support. The 2026 medical device engineering market for engineers with these specific competencies is at $150K-$190K base for senior roles.',
    leverageContext: 'Per BLS and BioSpace 2026 salary data, biomedical engineers with hands-on FDA submission experience are in a 3:1 demand-to-supply ratio at the senior level. Replacement cost: 6 months minimum to find an engineer with my DHF authorship + regulatory experience. Specific contributions this year: [submissions led, audits supported, design changes documented].',
    countersScript: 'I\'m asking for $X base (75th percentile per BioSpace senior biomedical engineer), a documented progression to staff or principal engineer in 12 months, and tuition reimbursement for the PE-Mechanical eligibility pathway or RAC certification.',
    walkAwayLine: 'I have approaches from Medtronic and Stryker recruiters at meaningfully higher comp. The work here is important — I want to find a way to stay.',
  },
  aerospace_systems_engineer: {
    strongOpener: 'I\'d like to align my compensation with the senior aerospace systems engineer market. With my AIAA membership, INCOSE CSEP, [security clearance level], and recent program contributions, I\'m operating at the staff engineer level commanding $185K-$220K in 2026.',
    leverageContext: 'Aerospace systems engineers with active Secret/TS clearance + MBSE tooling experience (Cameo, DOORS) are in a 4:1 demand-to-supply ratio per AIA workforce data. Replacement cost: 4-6 months including clearance reactivation. Boeing, Lockheed, Northrop, SpaceX, Blue Origin are actively recruiting at $185K-$230K base.',
    countersScript: 'I\'m asking for $X base (matches 75th percentile), retention RSU or recognition bonus, and tuition support for INCOSE ESEP and one advanced training (e.g., NASA APPEL, SpaceX-internal systems courses if applicable).',
    walkAwayLine: 'I have inbound from a competing prime and one NewSpace startup at meaningfully higher total comp. I\'d prefer to continue the program here but need market alignment.',
  },
  robotics_engineer: {
    strongOpener: 'I want to discuss my comp in light of the 2026 robotics engineer market — humanoid and embodied AI hiring at Figure, 1X, Apptronik, Tesla, Boston Dynamics is driving staff-level offers to $250K-$320K base + significant equity for engineers with my ROS2 / motion planning / manipulation portfolio.',
    leverageContext: 'My contributions: [autonomy stack, perception pipeline, manipulation success rate, deployment metrics]. Robotics engineers with shipped real-robot experience are in a 5:1 demand-to-supply ratio. Replacement cost: 6+ months. Boston Dynamics, Agility, Figure, 1X, Apptronik, Sanctuary, Tesla Optimus all actively recruiting.',
    countersScript: 'I\'m asking for $X base (75th percentile per Levels.fyi senior robotics engineer), equity refresh of $Y, and conference budget for ICRA + IROS + RSS attendance.',
    walkAwayLine: 'I have offers from two humanoid robotics companies at meaningfully higher total comp including equity. I\'ve enjoyed the work — I need to see real movement.',
  },
  quantum_computing_engineer: {
    strongOpener: 'I want to align my compensation with the quantum computing engineer market — sub-2,000 quantum engineers globally with industry experience, and total comp at IBM, Google, IonQ, Quantinuum, PsiQuantum is at $300K-$450K for senior level.',
    leverageContext: 'My specific contributions: [error correction work, gate optimization, hardware-software co-design, published papers, citations]. Quantum engineers with multi-platform fluency (Qiskit + Cirq + Q#) are in extreme shortage. Replacement cost: 12 months minimum.',
    countersScript: 'I\'m asking for $X base (matches 75th percentile for senior quantum engineer), retention RSU or signing bonus, research time (20% protected for publishable work), and conference budget for QIP + IEEE Quantum Week.',
    walkAwayLine: 'I have approaches from [IBM Quantum / Google Quantum AI / IonQ / PsiQuantum] at meaningfully higher comp. The work here is meaningful — I need to see real movement.',
  },
  photonics_engineer: {
    strongOpener: 'I\'d like to discuss my compensation in the context of the 2026 photonics engineer market. With my specialization in [silicon photonics / LiDAR optics / AR waveguide / fiber laser] and Zemax + Lumerical portfolio, I\'m at the senior engineer level commanding $170K-$210K.',
    leverageContext: 'Photonics engineers with multi-tool simulation experience (Zemax + Code V + Lumerical) and specialty domain knowledge are in 4:1 demand-to-supply ratio. Apple, Meta Reality Labs, ASML, Lumentum, Coherent, Lightmatter, Ayar Labs are actively recruiting at $185K-$240K.',
    countersScript: 'I\'m asking for $X base (75th percentile per Levels.fyi senior photonics engineer), conference budget for SPIE Photonics West, and IEEE Photonics Society Senior Member sponsorship.',
    walkAwayLine: 'I have inbound from [Apple AR / Lumentum / Ayar Labs / silicon photonics startup] at meaningfully higher total comp. I\'d prefer to continue here.',
  },
  rf_microwave_engineer: {
    strongOpener: 'I want to align my comp with the 2026 RF/microwave engineer market. With my specialization in [5G/6G mmWave / phased array / GaN PA / radar] and active [Secret/TS] clearance, I\'m commanding $175K-$220K at the senior level.',
    leverageContext: 'RF engineers with cleared mmWave + phased array experience are in a 5:1 demand-to-supply ratio per IEEE MTT-S workforce data. Apple, Qualcomm, Northrop Grumman, Raytheon, L3Harris, SpaceX Starlink, Amazon Kuiper are actively recruiting at $185K-$230K.',
    countersScript: 'I\'m asking for $X base, clearance retention recognition, retention RSU, and conference budget for IEEE IMS attendance with presentation slot if possible.',
    walkAwayLine: 'I have inbound from [defense prime / Starlink / Kuiper / commercial 6G program] at meaningfully higher total comp. The work here has been excellent — I need to see real movement.',
  },
  industrial_designer: {
    strongOpener: 'I want to discuss my compensation in the context of the senior industrial designer market. With my portfolio of physical prototypes, multi-tool fluency (SolidWorks + Rhino + KeyShot), and [IDEA / Red Dot / iF Award] recognition, I\'m at the senior designer level.',
    leverageContext: 'Senior industrial designers with award recognition and physical prototyping fluency are at $135K-$185K at top consultancies (IDEO, Frog, Smart Design, Ammunition) and in-house teams (Apple, Tesla, Herman Miller). Replacement cost: 4-6 months including portfolio review cycle.',
    countersScript: 'I\'m asking for $X base (75th percentile per Coroflot senior industrial designer), prototyping budget of $Y/year, and conference participation budget (IDSA International Design Conference).',
    walkAwayLine: 'I have an offer from [Apple Industrial Design / IDEO / Frog / in-house consumer brand] at meaningfully higher total comp. I\'d like to find a way to stay.',
  },
  fashion_designer: {
    strongOpener: 'I want to align my comp with the senior fashion designer market — heritage houses and elevated DTC brands are paying $125K-$180K for senior designers with my capsule track record and aesthetic POV.',
    leverageContext: 'My contributions this season: [capsule designed, sell-through rate, press placements, brand collaborations]. Senior designers with proven sell-through and editorial recognition are in shortage at LVMH, Kering, Hermès, Prada, and elevated DTC (The Row, Khaite, Lemaire, Toteme).',
    countersScript: 'I\'m asking for $X base (matches 75th percentile per BoF careers data), bonus tied to season sell-through, design travel budget (Paris/Milan/NY market weeks), and 1 named project per year for portfolio.',
    walkAwayLine: 'I have approaches from two heritage houses and one elevated DTC brand at meaningfully higher comp. The work here is meaningful — I need market alignment.',
  },
  voice_actor: {
    strongOpener: 'I want to discuss my booking-rate floor in the context of the 2026 union scale. As a SAG-AFTRA member with [animation series credits / national commercial work / audiobook publishing], my rate should align with current scale plus my market premium.',
    leverageContext: 'SAG-AFTRA 2026 scale: $948/4-hour animation session, $396/hour commercial, $233/finished-hour audiobook minimum. My specific track record: [series regular credits, commercial campaigns, audiobook ratings, fan following]. Synthetic voices cannot replicate emotional range and direction-following at my level.',
    countersScript: 'I\'m asking for [scale + Y%] for new sessions, residual structure per SAG-AFTRA contract for commercial work, and right-of-first-refusal on continuing character roles.',
    walkAwayLine: 'I have bookings with [DPN-rep client / competing animation house / audiobook publisher] at full scale + premium. I\'d prefer to continue here but need union-rate alignment.',
  },
  makeup_artist_film_tv: {
    strongOpener: 'I want to align my day rate with my IATSE Local 706 tier and recent credit list. As [Department Head / Key Artist / Journey] with credits on [productions], my rate should be at Local 706 negotiated scale plus market premium.',
    leverageContext: 'Local 706 2026 scale: $54-$95/hr depending on tier plus pension/health/residuals. My recent track record: [productions, Department Head credits, MUAHS / Emmy / Oscar recognition if any]. Department Heads with my specialty (period / SFX / prosthetic / beauty) are in shortage during peak production windows.',
    countersScript: 'I\'m asking for $X day rate (matches Local 706 senior tier + Y% market premium), kit fee of $Z/day, prep + wrap days at 1.5x, and 1st-position credit per WGA-DGA standard.',
    walkAwayLine: 'I have offers on two competing productions at meaningfully higher day rate + credit position. I\'d prefer to continue the work here but need rate alignment.',
  },
  mining_engineer: {
    strongOpener: 'I want to discuss my compensation in light of the 2026 mining engineer market — critical minerals demand (IRA + EU CRMA) is driving senior engineers with PE + multi-software fluency to $150K-$200K base.',
    leverageContext: 'Mining engineers with battery-metals (Li/Co/Ni/Cu/REE) project experience are in 3:1 demand-to-supply ratio. My contributions: [project planning, permitting support, software fluency, safety record]. Newmont, Albemarle, MP Materials, Lithium Americas, Talon are actively recruiting at $160K-$220K.',
    countersScript: 'I\'m asking for $X base (75th percentile per SME salary survey), PE renewal coverage, vendor training budget (Deswik/Vulcan/Surpac certifications), and rotation/travel allowance.',
    walkAwayLine: 'I have approaches from two critical-minerals operators at meaningfully higher comp + rotation premium. The work here is meaningful — I need market alignment.',
  },
};
