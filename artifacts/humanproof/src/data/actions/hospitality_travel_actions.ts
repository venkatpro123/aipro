// hospitality_travel_actions.ts — v38.0 Phase 2B
// 10 Hospitality & Travel roles — distinct from insurance_media_hospitality_actions.ts
// (hotel_general_manager, revenue_manager_hospitality, executive_chef, events_manager already covered there)

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

const A_HOSPITALITY_NETWORK: BracketPool = pool(
  { title: 'Join AHLEI and Pursue CHA or CRME Certification', description: 'The American Hotel & Lodging Educational Institute (AHLEI) CHA (Certified Hotel Administrator) is the industry gold standard — recognized by Marriott, Hilton, Hyatt, IHG, and Accor globally. CHA costs $475-$850 depending on membership tier. Cornell SHA alumni network further accelerates placement at luxury brands like Four Seasons, Ritz-Carlton, Aman, and Belmond. Enroll in AHLEI online courses immediately to begin qualifying.', layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '6 months — enroll now', priority: 'High' },
  { title: 'Build a Hospitality Industry LinkedIn Presence with Quantified Results', description: 'Hiring managers at Marriott, Hilton, Hyatt, IHG, and Accor search LinkedIn for specific operational metrics: RevPAR improvement %, guest satisfaction (GSS/NPS) scores, cost-per-cover reduction, ADR growth. Rewrite your LinkedIn summary with 3-5 quantified accomplishments. Add "Open to hospitality opportunities" signal. Top hospitality talent is found through LinkedIn before any job board — 70%+ of senior placements.', layerFocus: 'L3 · Visibility', riskReductionPct: 14, deadline: '7 days', priority: 'Medium' },
  { title: 'Establish a Cornell SHA Continuing Education Credential', description: 'Cornell School of Hotel Administration (SHA) eCornell certificates ($3,500-$5,500) in Hospitality Management, Revenue Management, or Food & Beverage Management are recognized by all major chains as equivalent to 1-2 years of accelerated development. Ritz-Carlton Leadership Center programs are also valuable for luxury track. Both add $15K-$30K to compensation and open VP-track pathways.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '90 days', priority: 'High' },
  { title: 'Engage 2 Hospitality Industry Associations for Network Intelligence', description: 'HSMAI (Hospitality Sales and Marketing Association International) and AHLEI both host regional chapter meetings with early hiring intelligence. Senior hospitality professionals share unfilled roles 45-60 days before public posting in these communities. Join both at chapter level ($150-$300/year each) and attend 1 meeting per quarter. Introductions from chapter members convert to interviews at 3x the rate of cold applications.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '21 days', priority: 'Medium' },
  { title: 'Update Your Professional Portfolio with Guest Satisfaction Metrics', description: 'Every hospitality operator should maintain a portfolio of GSS (Guest Satisfaction Survey) scores, NPS trends, TripAdvisor/Google review ratings, and operational cost metrics. Quantify your footprint: covers per day, ADR managed, RevPAR, spa revenue per treatment room. This portfolio is the primary hiring signal for corporate hospitality roles at all major chains.', layerFocus: 'L3 · Reputation', riskReductionPct: 10, deadline: '14 days', priority: 'Medium' },
);

// ── ACTION_DB_HOSPITALITY_TRAVEL ──────────────────────────────────────────────

export const ACTION_DB_HOSPITALITY_TRAVEL: Record<string, BracketPool> = {

  restaurant_manager: pool(
    { title: 'Earn ServSafe Manager Certification and Begin Culinary Institute Coursework', description: 'ServSafe Manager ($125) is the baseline food safety credential required by all major QSR, fast-casual, and fine dining operators. For fine dining track, the National Restaurant Association Educational Foundation (NRAEF) ManageFirst credential ($275) covers the full operations curriculum. Start with ServSafe this week — it opens every mid-level restaurant manager role at Darden Restaurants, Bloomin\' Brands, Brinker International, and independent fine dining groups.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    { title: 'Build a Restaurant P&L Ownership Portfolio for Multi-Unit Path', description: 'Multi-unit restaurant directors and area managers earn $95K-$145K vs. single-unit managers at $55K-$85K. To qualify, document P&L ownership: food cost percentage management (target sub-28%), labor percentage (target 28-32% QSR, 35-40% fine dining), revenue trends, and guest satisfaction scores from Toast or Micros/Oracle POS data. A "managed $4M annual revenue with 18% EBITDA" narrative converts a single-unit manager to multi-unit candidate.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Pivot to Multi-Unit Director or Franchise Development Role', description: 'The highest ROI move for a restaurant manager with 5+ years P&L experience is multi-unit director ($95K-$145K) or moving to franchise development (Chick-fil-A, McDonald\'s, Panera franchise business consultant roles at $110K-$155K). Quantify your single-unit performance across 4 quarters (revenue, comps, food cost, labor cost), then apply to area manager postings at top QSR and fast-casual chains.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '30 days', priority: 'Critical' },
    A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

  travel_agent_specialist: pool(
    { title: 'Earn ASTA Verified Travel Advisor (VTA) and IATA Certification', description: 'ASTA (American Society of Travel Advisors) VTA certification ($199 + coursework) is the primary credential for travel advisors. IATA BSP (Billing and Settlement Plan) certification allows direct airline ticketing commission access — critical for corporate travel accounts. Luxury/adventure travel specialists should also pursue Virtuoso membership application (invite-only, requires portfolio of luxury bookings). Together these credentials unlock commission structures unavailable to GDS-dependent generalists.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Specialize in Luxury, Corporate, or Adventure Travel to Escape Expedia/Booking.com Displacement', description: 'Routine leisure travel booking faces 40-45% AI displacement from Expedia AI, Booking.com AI, and Google Travel. The protection is specialization: luxury travel advisors (Virtuoso, Signature Travel Network) charge fees and earn 10-18% commission on packages Expedia cannot replicate. GBTA (Global Business Travel Association) corporate travel specialist certification ($350) opens $80K-$125K corporate travel manager roles. Adventure/expedition travel (ATTA — Adventure Travel Trade Association) is the other protected niche.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '60 days', priority: 'Critical' },
    { title: 'Build a Client Portfolio of 50+ Loyal Luxury Travelers', description: 'For luxury travel advisors, the 50-client portfolio is the career-defining milestone. Each loyal luxury client generates $8K-$25K in annual bookings, $800-$4,500 in commissions. Build client relationships through curated destination newsletters, post-trip debrief calls, and proactive trip design for clients\' anniversary/milestone travel. Virtuoso-affiliated advisors with 50+ clients earn $95K-$145K net of all costs.', layerFocus: 'L4 · Network', riskReductionPct: 28, deadline: '12 months', priority: 'High' },
    A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

  airline_operations_manager: pool(
    { title: 'Earn IATA Airport Operations Diploma and ACI Airport Operations Professional Credential', description: 'IATA Airport Operations Diploma ($2,500 online / $3,200 instructor-led) is the primary credential for airline and airport operations management. ACI-NA (Airports Council International) Airport Operations Professional (AOP) credential is the peer-recognized standard. Both are recognized by Delta, American Airlines, United, Southwest, Emirates, Lufthansa, and all major carriers for manager-to-director promotions. Budget 3-4 months of self-study alongside work.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '4 months', priority: 'Critical' },
    { title: 'Lead a OTP (On-Time Performance) Improvement Initiative and Document Results', description: 'OTP is the primary KPI for airline operations managers. Document a specific OTP improvement initiative: gate turn time reduction, irregular operations recovery protocol, ground crew coordination improvement. Quantify results: "improved OTP by 3.2 percentage points on X routes, recovering $2.1M in connection revenue." This portfolio piece is the bridge to senior director roles at major carriers (Delta, American, United) at $125K-$165K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to Post-COVID Fleet Expansion Roles at Delta, American, or International Carriers', description: 'Post-COVID airline fleet expansion (Delta +150 aircraft by 2027, American +220 by 2028, Emirates A380 reactivation, Lufthansa Group +85) is driving acute operations manager hiring. Senior ops managers with OTP track records are getting $115K-$165K offers with flight benefits worth $18K-$25K annually. Apply to Delta TechOps, American AAdvantage Operations, and United Ground Ops hiring tracks this month — each has active senior-level openings.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '21 days', priority: 'Critical' },
    A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

  airport_operations_specialist: pool(
    { title: 'Earn ACI-NA Airport Operations Professional (AOP) and FAA Part 139 Inspector Credential', description: 'ACI-NA AOP is the primary credential for airport operations specialists at major airports. FAA Part 139 Airport Inspection knowledge (required for commercial service airports) is assessed in TSA/FAA compliance roles. IATA Ground Operations Manual (IGOM) proficiency is required by all major carrier hub airports (DFW, ORD, LAX, JFK, ATL). These three credentialing tracks differentiate operations specialists qualifying for $75K-$110K roles at large hub airports vs. $55K-$68K at regional airports.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'Critical' },
    { title: 'Specialize in Emergency Response and ARFF Coordination', description: 'Airport Operations Specialists with Aircraft Rescue and Firefighting (ARFF) emergency coordination training (NIMS ICS-300/400 + airport-specific ARFF protocols) are in permanent shortage at hub airports. This specialization opens Emergency Manager roles at the TSA, FAA, and major airport authorities (Port Authority of NY/NJ, LAWA, MASSPORT) at $85K-$115K. Complete FEMA ICS-300 online ($0) and pursue NFPA 403 ARFF coordination training ($800-$1,200).', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '120 days', priority: 'High' },
    A_HOSPITALITY_NETWORK.senior.critical[0], A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

  hospitality_technology_manager: pool(
    { title: 'Earn Oracle OPERA Cloud Certification and Complete Mews/Cloudbeds Training', description: 'Oracle OPERA (Property Management System) is deployed at 40,000+ hotels globally — Marriott, Hilton, IHG, Hyatt all run OPERA. Oracle OPERA Cloud certification ($1,200-$1,800 including coursework) is the primary hiring signal for hospitality technology managers. Additionally, complete Mews Certified Implementer ($0 — Mews Academy) and Cloudbeds Partner Training ($0) to cover the growing independent and boutique hotel tech stack. This combination opens $95K-$135K hospitality IT roles that were $75K 3 years ago.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Lead a PMS Migration or Channel Manager Integration Project', description: 'Hospitality technology managers who own a completed PMS migration (e.g., legacy Fidelio to OPERA Cloud, or SynXis to Amadeus Central Reservations) earn 30-45% more than maintenance-only IT managers. Document the project: scope (number of properties, room count), timeline, integrations (POS: Toast or Micros/Oracle, revenue management: Duetto or IDEAS, CRS: Amadeus), and post-go-live stability metrics. This becomes the portfolio piece for VP of Technology at hotel management companies.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'Critical' },
    { title: 'Apply to Oracle Hospitality, Agilysys, and Amadeus for Vendor-Side Roles', description: 'Hospitality technology vendors (Oracle Hospitality Global, Agilysys, Amadeus Hospitality, Duetto, IDEAS Revenue Management) hire experienced operators at $110K-$160K for implementation, customer success, and product roles. These vendor roles pay 20-40% above in-house hotel IT while providing equity and career diversification. Apply to Oracle Hospitality Solutions Consultant, Agilysys Implementation Manager, or Amadeus Account Director this month.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '21 days', priority: 'Critical' },
    A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

  spa_wellness_director: pool(
    { title: 'Earn ISPA Certified Spa Director (CSD) and Complete Book4Time/Mindbody Training', description: 'ISPA (International Spa Association) Certified Spa Director credential is the primary industry qualification recognized by Four Seasons, Ritz-Carlton, Aman, Belmond, and all luxury spa brands. CSD coursework covers spa finance (treatment room yield management, retail capture rate), staff management, and guest experience design. Additionally, complete Mindbody Business software training ($0 — free Mindbody Academy) and Book4Time certification ($0 — Book4Time University) as these are the two dominant spa management platforms. Total investment: $1,800-$2,400. Adds $20K-$35K to compensation.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Develop Wellness Revenue Diversification Portfolio', description: 'Spa directors who expand revenue beyond treatment bookings into memberships, retail (target 30-35% of total revenue), wellness programming, and corporate wellness contracts earn significantly more and are dramatically harder to replace. Document your retail capture rate (industry benchmark: 25-30%), treatment room yield (industry benchmark: 72-78%), and any new revenue lines you\'ve created. Luxury brands (Four Seasons Spa, Aman Wellness, Ritz-Carlton Spa) specifically recruit directors with $4M+ spa revenue track records.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    { title: 'Build a Network Through ISPA and Global Wellness Institute', description: 'The Global Wellness Institute (GWI) and ISPA annual conferences are where luxury spa directors get hired for flagship roles at Four Seasons, Aman, Six Senses, and COMO Hotels. Present or moderate a session at ISPA Conference — even a roundtable facilitator role puts you in front of 400+ spa decision-makers including corporate directors at Marriott Wellness and Hyatt Wellbeing.', layerFocus: 'L4 · Network', riskReductionPct: 22, deadline: '90 days — ISPA CFP deadline', priority: 'High' },
    A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

  food_beverage_director: pool(
    { title: 'Pursue Cornell SHA F&B Management Certificate and ACF Certification', description: 'Cornell SHA eCornell Food & Beverage Management Certificate ($3,500) is the top credential for F&B directors at full-service hotels. American Culinary Federation (ACF) Certified Culinary Administrator (CCA) credential ($475) demonstrates culinary operations depth alongside financial management. Together these credentials differentiate F&B directors targeting luxury brands: Four Seasons, Ritz-Carlton, Waldorf Astoria, Mandarin Oriental, Park Hyatt — where F&B revenue represents 35-55% of total hotel revenue and F&B directors earn $115K-$185K.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '4 months', priority: 'Critical' },
    { title: 'Lead a Beverage Program Redesign with Sommelier/Spirits Certification', description: 'F&B directors who own a documented beverage program overhaul (wine list redesign, craft cocktail program, cellar inventory optimization) earn $20K-$40K more than food-only operators. Pursue the Court of Master Sommeliers Introductory ($595) or WSET Level 3 ($800) to add credential. Beverage profitability (cost target: 22-28% for wine, 18-22% for spirits) and James Beard Foundation-recognized beverage programs are the portfolio pieces that open VP-level F&B roles.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'High' },
    { title: 'Build a Michelin-Adjacent Portfolio or James Beard Nomination Pipeline', description: 'F&B directors at Michelin-starred hotel restaurants (Four Seasons restaurants with Michelin stars, Ritz-Carlton fine dining outlets, Waldorf Astoria restaurants) command $145K-$185K base. If your current property doesn\'t have Michelin aspirations, document the guest satisfaction metrics (OpenTable score, GSS F&B module, social sentiment on hotel F&B), COGS management, and cover counts that demonstrate you can operate at that level. A single James Beard semifinalist nomination for a chef you championed is a powerful proxy signal.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '12 months', priority: 'Critical' },
    A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

  concierge_specialist: pool(
    { title: 'Apply to Les Clefs d\'Or USA for Membership Sponsorship', description: 'Les Clefs d\'Or (Society of Golden Keys) is the international association of elite hotel concierges — recognized by Ritz-Carlton, Four Seasons, Aman, Mandarin Oriental, and all Forbes 5-Star properties as the definitive credential. Membership requires 5+ years hotel concierge experience and sponsorship from 2 existing members ($250 annual dues post-acceptance). Les Clefs d\'Or members average $72K-$90K base + gratuities ($15K-$35K/year at luxury properties) and are the first candidates contacted for Head Concierge openings at flagship properties.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Build a Hyper-Local Expertise Network (Michelin Restaurants, Cultural Venues, Private Access)', description: 'The concierge role\'s primary value and AI-displacement protection is access that algorithms cannot replicate: direct relationships with Michelin restaurant maîtres d\', backstage access at venues, private event invitations, and knowledge of undiscovered local gems. Document your relationship portfolio: how many restaurants have your direct contact at the reservation desk, which venues give you priority allocations, how many private-access arrangements you maintain. This network is your primary career asset — protect it regardless of employer changes.', layerFocus: 'L4 · Network', riskReductionPct: 30, deadline: '30 days', priority: 'High' },
    { title: 'Pursue Head Concierge Roles at New Luxury Hotel Openings', description: 'New luxury hotel openings (Aman, Four Seasons, Rosewood, Waldorf Astoria in major markets) recruit Head Concierges 12-18 months pre-opening — these roles pay $68K-$90K base and come with a property startup bonus ($8K-$15K). Pre-opening teams are smaller, advancement is faster, and you establish the guest relationship standard for a property from day one. Track hotel development pipelines via Hotel News Now and Smith Travel Research.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '30 days', priority: 'High' },
    A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

  hotel_operations_manager: pool(
    { title: 'Earn AHLEI Certified Hotel Administrator (CHA) and Build Oracle OPERA Expertise', description: 'AHLEI CHA is the operations manager-to-GM pipeline credential recognized by all major hotel chains (Marriott, Hilton, Hyatt, IHG, Accor). CHA cost: $475-$850 with AHLEI membership. Additionally, hands-on Oracle OPERA expertise (PMS used at 40,000+ hotels) is the operational technology differentiator. Combined CHA + OPERA proficiency opens $88K-$125K hotel operations director roles at full-service and upper-upscale properties. Cornell SHA eCornell Operations certificate is the premium alternative ($3,500 but faster track to Marriott/Hilton corporate pipeline programs).', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Document Cross-Departmental Leadership Portfolio for GM Pipeline', description: 'Hotel operations managers who can demonstrate cross-departmental ownership (Rooms + F&B + Engineering + Housekeeping P&L accountability, not just Rooms) are the primary talent pool for General Manager promotions at branded hotels. Build a portfolio documenting: RevPAR index vs. competitive set, departmental flow-through percentages, GSS overall satisfaction scores (target top-quartile in brand), and any capital project you led. Marriott, Hilton, and Hyatt GM pipeline programs specifically require demonstrated multi-department ownership.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Apply to Branded Hotel Management Company GM Pipeline Programs', description: 'Aimbridge Hospitality (world\'s largest hotel management company), Interstate Hotels & Resorts, and Davidson Hospitality Group run formal GM development programs that take hotel operations managers to GM in 18-36 months. These programs offer $95K-$125K operations director pay with accelerated GM track. Major brands (Marriott, Hilton) also have internal EDP (Executive Development Program) pathways. Apply to all four tracks this month while your current role provides the required operational credentials.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '21 days', priority: 'Critical' },
    A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

  chief_hospitality_officer: pool(
    { title: 'Build Board-Level Portfolio: Portfolio RevPAR, EBITDA Flow-Through, and Brand Equity Metrics', description: 'Chief Hospitality Officers at hotel management companies and REITs are evaluated on portfolio-level metrics, not property-level. Document your contribution to portfolio RevPAR index improvement (competitive set vs. STR benchmark), EBITDA flow-through percentage (industry standard: 45-55%), brand equity scores across portfolio, and CapEx return on investment projects you championed. Cornell SHA Executive Education for senior hospitality leaders ($12,000-$18,000) provides the board communication framework. Top CHOs at publicly traded REITs and management companies earn $220K-$450K total comp.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Develop Technology Transformation Leadership Narrative', description: 'CHOs who own the digital transformation agenda (PMS cloud migration across portfolio, revenue management AI deployment via Duetto or IDeaS, direct booking optimization reducing OTA dependency) earn 25-40% above operations-only CHOs. Document your technology leadership track record: number of properties migrated to OPERA Cloud or Mews, revenue management system ROI, distribution cost reduction as percentage of total revenue. This narrative opens PE-backed hospitality rollup opportunities and REIT CXO roles.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Establish Advisory Board Presence at Hospitality Tech and Investment Firms', description: 'CHOs who serve on advisory boards at hospitality technology companies (Oracle Hospitality, Amadeus, Duetto, Agilysys) or hospitality-focused PE funds (KSL Capital, Blackstone Real Estate, Starwood Capital hospitality portfolio) earn $60K-$150K in supplemental board fees while dramatically increasing career resilience and visibility for the next CXO placement. Engage with 2 advisory board opportunities annually through ALIS (Americas Lodging Investment Summit) and IHIF (International Hotel Investment Forum) networks.', layerFocus: 'L4 · Network', riskReductionPct: 35, deadline: '90 days', priority: 'Critical' },
    A_HOSPITALITY_NETWORK.senior.high[0], A_HOSPITALITY_NETWORK.junior.moderate[0],
  ),

};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_HOSPITALITY_TRAVEL: Record<string, { canonicalKey: string; displayRole: string }> = {
  'restaurant manager': { canonicalKey: 'restaurant_manager', displayRole: 'Restaurant Manager' },
  'restaurant general manager': { canonicalKey: 'restaurant_manager', displayRole: 'Restaurant General Manager' },
  'food service manager': { canonicalKey: 'restaurant_manager', displayRole: 'Food Service Manager' },
  'qsr manager': { canonicalKey: 'restaurant_manager', displayRole: 'QSR Manager' },
  'fast casual manager': { canonicalKey: 'restaurant_manager', displayRole: 'Fast Casual Manager' },
  'fine dining manager': { canonicalKey: 'restaurant_manager', displayRole: 'Fine Dining Manager' },
  'travel agent': { canonicalKey: 'travel_agent_specialist', displayRole: 'Travel Agent' },
  'travel agent specialist': { canonicalKey: 'travel_agent_specialist', displayRole: 'Travel Agent Specialist' },
  'travel advisor': { canonicalKey: 'travel_agent_specialist', displayRole: 'Travel Advisor' },
  'luxury travel advisor': { canonicalKey: 'travel_agent_specialist', displayRole: 'Luxury Travel Advisor' },
  'corporate travel specialist': { canonicalKey: 'travel_agent_specialist', displayRole: 'Corporate Travel Specialist' },
  'adventure travel specialist': { canonicalKey: 'travel_agent_specialist', displayRole: 'Adventure Travel Specialist' },
  'airline operations manager': { canonicalKey: 'airline_operations_manager', displayRole: 'Airline Operations Manager' },
  'ground operations manager': { canonicalKey: 'airline_operations_manager', displayRole: 'Ground Operations Manager' },
  'station manager airline': { canonicalKey: 'airline_operations_manager', displayRole: 'Airline Station Manager' },
  'flight operations manager': { canonicalKey: 'airline_operations_manager', displayRole: 'Flight Operations Manager' },
  'airport operations specialist': { canonicalKey: 'airport_operations_specialist', displayRole: 'Airport Operations Specialist' },
  'airport operations officer': { canonicalKey: 'airport_operations_specialist', displayRole: 'Airport Operations Officer' },
  'airside operations specialist': { canonicalKey: 'airport_operations_specialist', displayRole: 'Airside Operations Specialist' },
  'hospitality technology manager': { canonicalKey: 'hospitality_technology_manager', displayRole: 'Hospitality Technology Manager' },
  'hotel technology manager': { canonicalKey: 'hospitality_technology_manager', displayRole: 'Hotel Technology Manager' },
  'pms administrator': { canonicalKey: 'hospitality_technology_manager', displayRole: 'PMS Administrator' },
  'hospitality it manager': { canonicalKey: 'hospitality_technology_manager', displayRole: 'Hospitality IT Manager' },
  'hotel systems manager': { canonicalKey: 'hospitality_technology_manager', displayRole: 'Hotel Systems Manager' },
  'spa director': { canonicalKey: 'spa_wellness_director', displayRole: 'Spa Director' },
  'spa wellness director': { canonicalKey: 'spa_wellness_director', displayRole: 'Spa & Wellness Director' },
  'wellness director': { canonicalKey: 'spa_wellness_director', displayRole: 'Wellness Director' },
  'spa manager': { canonicalKey: 'spa_wellness_director', displayRole: 'Spa Manager' },
  'food beverage director': { canonicalKey: 'food_beverage_director', displayRole: 'Food & Beverage Director' },
  'fb director': { canonicalKey: 'food_beverage_director', displayRole: 'F&B Director' },
  'director of food and beverage': { canonicalKey: 'food_beverage_director', displayRole: 'Director of Food & Beverage' },
  'f&b director': { canonicalKey: 'food_beverage_director', displayRole: 'F&B Director' },
  'concierge': { canonicalKey: 'concierge_specialist', displayRole: 'Concierge' },
  'concierge specialist': { canonicalKey: 'concierge_specialist', displayRole: 'Concierge Specialist' },
  'head concierge': { canonicalKey: 'concierge_specialist', displayRole: 'Head Concierge' },
  'chief concierge': { canonicalKey: 'concierge_specialist', displayRole: 'Chief Concierge' },
  'les clefs dor concierge': { canonicalKey: 'concierge_specialist', displayRole: 'Les Clefs d\'Or Concierge' },
  'hotel operations manager': { canonicalKey: 'hotel_operations_manager', displayRole: 'Hotel Operations Manager' },
  'director of hotel operations': { canonicalKey: 'hotel_operations_manager', displayRole: 'Director of Hotel Operations' },
  'rooms division manager': { canonicalKey: 'hotel_operations_manager', displayRole: 'Rooms Division Manager' },
  'hotel operations director': { canonicalKey: 'hotel_operations_manager', displayRole: 'Hotel Operations Director' },
  'chief hospitality officer': { canonicalKey: 'chief_hospitality_officer', displayRole: 'Chief Hospitality Officer' },
  'cho': { canonicalKey: 'chief_hospitality_officer', displayRole: 'Chief Hospitality Officer' },
  'vp hospitality': { canonicalKey: 'chief_hospitality_officer', displayRole: 'VP of Hospitality' },
  'svp hotel operations': { canonicalKey: 'chief_hospitality_officer', displayRole: 'SVP Hotel Operations' },
  'chief experience officer hospitality': { canonicalKey: 'chief_hospitality_officer', displayRole: 'Chief Experience Officer (Hospitality)' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_HOSPITALITY_TRAVEL: Record<string, string> = {
  restaurant_manager: 'restaurant_manager',
  travel_agent_specialist: 'travel_agent_specialist',
  airline_operations_manager: 'airline_operations_manager',
  airport_operations_specialist: 'airport_operations_specialist',
  hospitality_technology_manager: 'hospitality_technology_manager',
  spa_wellness_director: 'spa_wellness_director',
  food_beverage_director: 'food_beverage_director',
  concierge_specialist: 'concierge_specialist',
  hotel_operations_manager: 'hotel_operations_manager',
  chief_hospitality_officer: 'chief_hospitality_officer',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_HOSPITALITY_TRAVEL: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  restaurant_manager:            { roleKey: 'restaurant_manager',            roleName: 'Restaurant Manager',              demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 32, yoyJobOpeningsChange: 4,   topHiringLocations: ['New York NY', 'Los Angeles CA', 'Chicago IL', 'Houston TX', 'Miami FL'],             aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1', calibrationNote: 'Multi-unit and fine dining demand stable; QSR manager market large but commoditized. AI ordering kiosks pressuring entry-level roles while senior ops managers hold.' },
  travel_agent_specialist:       { roleKey: 'travel_agent_specialist',       roleName: 'Travel Agent Specialist',         demandIndex: 62, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'stable',  timeToFillDays: 38, yoyJobOpeningsChange: -14, topHiringLocations: ['New York NY', 'Los Angeles CA', 'Miami FL', 'Remote', 'Chicago IL'],                aiSubstitutionRisk: 0.40, dataQuarter: '2026-Q1', calibrationNote: 'Routine leisure demand falling sharply due to Expedia/Booking AI. Luxury corporate/adventure specialists growing — bimodal market. Specialists earn 2-3x generalists.' },
  airline_operations_manager:    { roleKey: 'airline_operations_manager',    roleName: 'Airline Operations Manager',      demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 52, yoyJobOpeningsChange: 22,  topHiringLocations: ['Dallas TX', 'Atlanta GA', 'Chicago IL', 'Miami FL', 'New York NY'],                 aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1', calibrationNote: 'Post-COVID fleet expansion at Delta, American, United, Southwest driving acute ops manager hiring. Emirates and Lufthansa also expanding US hub presence.' },
  airport_operations_specialist: { roleKey: 'airport_operations_specialist', roleName: 'Airport Operations Specialist',   demandIndex: 76, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 42, yoyJobOpeningsChange: 12,  topHiringLocations: ['Dallas TX', 'Atlanta GA', 'Chicago IL', 'Los Angeles CA', 'New York NY'],           aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'Airport capacity expansions (LAX, ORD, JFK, DFW) and new terminal openings driving specialist demand. FAA compliance and emergency coordination roles structurally short.' },
  hospitality_technology_manager:{ roleKey: 'hospitality_technology_manager',roleName: 'Hospitality Technology Manager',  demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 48, yoyJobOpeningsChange: 28,  topHiringLocations: ['Orlando FL', 'Las Vegas NV', 'New York NY', 'Chicago IL', 'Remote'],                aiSubstitutionRisk: 0.13, dataQuarter: '2026-Q1', calibrationNote: 'Hotel tech transformation (OPERA Cloud migrations, channel manager integrations, AI revenue management) driving acute hospitality IT demand — most understaffed segment in hospitality.' },
  spa_wellness_director:         { roleKey: 'spa_wellness_director',         roleName: 'Spa & Wellness Director',         demandIndex: 74, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 58, yoyJobOpeningsChange: 14,  topHiringLocations: ['New York NY', 'Miami FL', 'Los Angeles CA', 'Scottsdale AZ', 'Aspen CO'],           aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Post-COVID wellness travel boom sustained. Luxury spa revenue rising 15-20% annually at Forbes 5-Star properties. ISPA CSD-credentialed directors in shortage.' },
  food_beverage_director:        { roleKey: 'food_beverage_director',        roleName: 'Food & Beverage Director',        demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 55, yoyJobOpeningsChange: 10,  topHiringLocations: ['New York NY', 'Las Vegas NV', 'Miami FL', 'Los Angeles CA', 'Chicago IL'],           aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Hotel F&B recovery complete post-COVID. Luxury brands investing heavily in culinary differentiation (Michelin, James Beard-adjacent programs) driving senior F&B Director demand.' },
  concierge_specialist:          { roleKey: 'concierge_specialist',          roleName: 'Concierge Specialist',            demandIndex: 68, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable',  timeToFillDays: 35, yoyJobOpeningsChange: 4,   topHiringLocations: ['New York NY', 'Miami FL', 'Los Angeles CA', 'Las Vegas NV', 'Chicago IL'],           aiSubstitutionRisk: 0.07, dataQuarter: '2026-Q1', calibrationNote: 'Relationship-intensive luxury concierge roles highly AI-resistant. New luxury hotel openings (Aman, Rosewood, Waldorf Astoria) creating demand. Les Clefs d\'Or members structurally short at flagship properties.' },
  hotel_operations_manager:      { roleKey: 'hotel_operations_manager',      roleName: 'Hotel Operations Manager',        demandIndex: 76, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising',  timeToFillDays: 45, yoyJobOpeningsChange: 6,   topHiringLocations: ['New York NY', 'Orlando FL', 'Las Vegas NV', 'Miami FL', 'Chicago IL'],              aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'Full-service hotel operations demand steady. Cross-departmental operators feeding GM pipeline at Aimbridge, Interstate, and major brand management companies.' },
  chief_hospitality_officer:     { roleKey: 'chief_hospitality_officer',     roleName: 'Chief Hospitality Officer',       demandIndex: 72, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising',  timeToFillDays: 110, yoyJobOpeningsChange: 14, topHiringLocations: ['New York NY', 'Miami FL', 'Los Angeles CA', 'Chicago IL', 'Las Vegas NV'],           aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'PE-backed hospitality rollups and REITs driving CHO demand. Digital transformation leadership + portfolio RevPAR track record commands $300K-$450K total comp at top management companies.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_HOSPITALITY_TRAVEL: Record<string, Record<string, number>> = {
  restaurant_manager:            { '0-2': 55_000,  '2-5': 68_000,  '5-10': 85_000,  '10-15': 100_000, '15+': 115_000 },
  travel_agent_specialist:       { '0-2': 45_000,  '2-5': 62_000,  '5-10': 82_000,  '10-15': 105_000, '15+': 125_000 },
  airline_operations_manager:    { '0-2': 85_000,  '2-5': 105_000, '5-10': 132_000, '10-15': 152_000, '15+': 165_000 },
  airport_operations_specialist: { '0-2': 55_000,  '2-5': 70_000,  '5-10': 88_000,  '10-15': 100_000, '15+': 110_000 },
  hospitality_technology_manager:{ '0-2': 85_000,  '2-5': 108_000, '5-10': 132_000, '10-15': 148_000, '15+': 160_000 },
  spa_wellness_director:         { '0-2': 65_000,  '2-5': 85_000,  '5-10': 108_000, '10-15': 128_000, '15+': 145_000 },
  food_beverage_director:        { '0-2': 85_000,  '2-5': 108_000, '5-10': 142_000, '10-15': 168_000, '15+': 185_000 },
  concierge_specialist:          { '0-2': 45_000,  '2-5': 56_000,  '5-10': 68_000,  '10-15': 80_000,  '15+': 90_000  },
  hotel_operations_manager:      { '0-2': 72_000,  '2-5': 90_000,  '5-10': 115_000, '10-15': 132_000, '15+': 145_000 },
  chief_hospitality_officer:     { '0-2': 185_000, '2-5': 240_000, '5-10': 310_000, '10-15': 385_000, '15+': 450_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_HOSPITALITY_TRAVEL: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  chief_hospitality_officer: {
    strongOpener: 'I want to align my compensation with the 2026 CHO market. With [portfolio RevPAR index improvement of X%], [EBITDA flow-through of Y%], and [technology transformation program you led], I\'m operating at the senior CXO level at management companies of this scale.',
    leverageContext: 'Per ALIS 2026 compensation benchmarks, CHOs at management companies of our portfolio size earn $X base + Y% bonus + $Z equity. My current total comp is [X]% below the 50th percentile despite outperforming peers on RevPAR index and flow-through. Replacing me would mean a 4-6 month search and loss of continuity on the digital transformation roadmap.',
    countersScript: 'I\'m asking for base of $X (75th percentile for my portfolio scope), bonus target of Y% tied to portfolio RevPAR and EBITDA benchmarks, and a 3-year equity grant of $Z. If base adjustment isn\'t possible this cycle, I\'ll accept an accelerated equity grant plus a structured review in 9 months.',
    walkAwayLine: 'I have conversations active with two PE-backed hospitality groups and an REIT CXO search at meaningfully higher total comp. I\'d prefer to continue the work we\'ve started, but the compensation gap needs to close.',
  },
  food_beverage_director: {
    strongOpener: 'After growing F&B revenue by [X%], achieving [cost-per-cover of $Y], and delivering [GSS F&B score / Michelin-adjacent recognition], I\'d like to align my compensation with senior F&B Directors at comparable full-service properties.',
    leverageContext: 'Cornell SHA 2026 hospitality compensation data shows F&B Directors at full-service luxury properties earn $130K-$165K with bonus potential of 15-25%. My beverage program (retail capture rate Y%, COGS Z%) and event revenue ($Xm) are above brand benchmark. Replacing me mid-season would cost at least $40K-$60K in search fees plus 4-6 months of reduced F&B performance.',
    countersScript: 'I\'m asking for $X base, a 20% bonus target tied to F&B EBITDA and GSS scores, and a professional development budget for WSET Level 3 or ACF CCA. If base isn\'t adjustable this quarter, I\'ll accept a guaranteed mid-year review with pre-agreed market adjustment.',
    walkAwayLine: 'I\'ve received an approach from [Four Seasons / Waldorf Astoria / luxury independent group] at a significantly higher package. I\'ve invested in this F&B program and would prefer to stay, but the gap is meaningful.',
  },
  airline_operations_manager: {
    strongOpener: 'Following my OTP improvement initiative — [X percentage points improvement on Y routes, $Zm recovered in connection revenue] — I\'d like to discuss aligning my compensation with senior airline operations managers at comparable carriers.',
    leverageContext: 'Bureau of Labor Statistics 2026 + IATA compensation surveys show airline ops managers at major carriers earn $115K-$145K base at this seniority level. Post-COVID fleet expansion means my replacement would take 3-5 months to source and 6 months to fully onboard into hub operations. My schedule reliability track record is a direct revenue driver.',
    countersScript: 'I\'m asking for $X base (peer 75th percentile), annual bonus of Y% tied to OTP/D:0 targets, and certification budget for IATA Diploma renewal and ACI training. I\'m also requesting priority consideration for the [hub / station director] vacancy.',
    walkAwayLine: 'I\'ve had conversations with [Delta / United / American / Emirates] operations recruiting at higher base. The flight benefits here are valuable to me — but the base compensation gap needs to close for me to turn down those conversations.',
  },
  hospitality_technology_manager: {
    strongOpener: 'Having delivered [OPERA Cloud migration across X properties / channel manager integration saving $Yk in OTA commissions / POS consolidation to Toast/Micros], I\'d like to align my compensation with the 2026 hospitality IT market.',
    leverageContext: 'Hospitality technology managers are the most understaffed segment in hotel management company hiring right now. Vendors like Oracle Hospitality and Agilysys recruit experienced operators at $120K-$145K for implementation roles. My institutional knowledge of our specific tech stack (PMS/POS/RMS/CRS integrations) would take 6-12 months to rebuild.',
    countersScript: 'I\'m asking for $X base (matching Oracle Hospitality/Agilysys salary for equivalent experience), a certification budget of $3,000/year for Oracle OPERA and Amadeus recertifications, and a remote/hybrid flexibility arrangement for non-property-critical weeks.',
    walkAwayLine: 'I have an approach from [Oracle Hospitality / Agilysys / Amadeus] for a solutions consultant role at $Xk above my current base plus equity. I\'d prefer the operator path here but cannot ignore that gap.',
  },
  spa_wellness_director: {
    strongOpener: 'After achieving [retail capture rate of X%], [treatment room yield of Y%], and delivering [GSS spa score / ISPA award / revenue growth of Z%], I\'d like to discuss aligning my compensation with spa directors at comparable luxury properties.',
    leverageContext: 'ISPA 2026 Spa Director Compensation Survey shows directors at Forbes 5-Star properties with comparable revenue ($Xm spa revenue) earn $110K-$135K base. My ISPA CSD credential and revenue performance put me in the top quartile of that peer group. Replacing me with a CSD-credentialed director takes 3-5 months in this tight labor market.',
    countersScript: 'I\'m asking for $X base, a performance bonus of Y% tied to spa EBITDA and treatment room yield, and budget for the ISPA Annual Conference ($2,500) and Global Wellness Institute membership ($450).',
    walkAwayLine: 'I\'ve been approached for a Spa Director opening at [Four Seasons / Aman / Ritz-Carlton] at a meaningfully higher package. I\'ve built strong guest loyalty here and would prefer to stay, but I need to see market-rate movement.',
  },
  hotel_operations_manager: {
    strongOpener: 'With RevPAR index of [X vs. competitive set], GSS overall satisfaction at [Y percentile in brand ranking], and [cross-departmental P&L accountability / capital project you led], I\'d like to discuss my path toward the GM track and corresponding compensation alignment.',
    leverageContext: 'AHLEI 2026 compensation data shows hotel operations managers at full-service branded properties with CHA certification earn $95K-$118K at my seniority level. I\'m below that range despite brand-above-average metrics. Aimbridge and Interstate are actively recruiting at $105K-$125K for operations directors with my profile.',
    countersScript: 'I\'m asking for $X base (matching mid-market for CHA-credentialed ops directors), a formal GM development program nomination with a timeline commitment, and AHLEI certification budget ($850 for CHA). If the GM track isn\'t available here within 18 months, I need base compensation to compensate for that ceiling.',
    walkAwayLine: 'I\'ve had conversations with Aimbridge Hospitality\'s GM development program and [Marriott / Hilton] EDP recruitment. The GM pipeline here matters to me — but the combination of comp and timeline needs to work.',
  },
  travel_agent_specialist: {
    strongOpener: 'As a [Virtuoso-affiliated / ASTA VTA-certified / GBTA-credentialed] luxury and corporate travel specialist, my client portfolio generates $Xm in annual bookings with [Y% repeat rate]. I\'d like to align my comp structure with what this book of business commands.',
    leverageContext: 'Luxury and corporate travel specialists who own a loyal client portfolio are the only protected segment in the travel advisor market. My [X clients] generate an estimated $Y in annual commissions. This book of business follows the advisor, not the agency — it has real market value. Virtuoso member agencies recruit advisors with my profile at base + higher commission splits than I\'m currently receiving.',
    countersScript: 'I\'m asking for either a base increase to $X or a commission split improvement to Y% on luxury bookings, plus a Virtuoso membership application sponsorship and ASTA annual conference budget ($1,800). The client relationships I\'ve built are the asset — I need my comp to reflect that.',
    walkAwayLine: 'I\'ve had a direct approach from a Virtuoso member agency offering a better split and full book portability. I\'d prefer the stability here, but the financial difference is meaningful.',
  },
  concierge_specialist: {
    strongOpener: 'As a [Les Clefs d\'Or member / Les Clefs d\'Or applicant with X sponsors confirmed] with [Y years at Forbes 5-Star properties], I\'d like to align my compensation with the luxury concierge market in [city].',
    leverageContext: 'Les Clefs d\'Or-qualified concierges at comparable luxury properties in [city] earn $72K-$90K base plus significant gratuities. My hyper-local access network — [X Michelin restaurant direct contacts, Y private venue relationships, Z priority allocations] — is impossible to rebuild quickly. The guest loyalty data (Y% return guests who request me specifically) demonstrates my direct revenue contribution.',
    countersScript: 'I\'m asking for $X base, Les Clefs d\'Or membership dues sponsorship ($250/year), and a professional development budget for regional chapter events. If a full base adjustment isn\'t possible, I\'d accept a documented review tied to my Les Clefs d\'Or acceptance timeline.',
    walkAwayLine: 'There is a Head Concierge opening at [Ritz-Carlton / Aman / Four Seasons] currently being filled at a higher package. My guest relationships here matter to me, but I cannot sustain a gap this large.',
  },
};
