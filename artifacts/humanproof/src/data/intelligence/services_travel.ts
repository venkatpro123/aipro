// ═══════════════════════════════════════════════════════════════════════════════
// services_travel.ts — Travel & Hospitality Intelligence Module
// 6 unique roles — distinct from all other modules
// ═══════════════════════════════════════════════════════════════════════════════
import { CareerIntelligence } from './types.ts';

export const SERVICES_TRAVEL_INTELLIGENCE: Record<string, CareerIntelligence> = {
  trav_agent: {
    displayRole: 'Travel Agent / Travel Consultant',
    summary: 'High disruption in standard bookings; resilience only in complex, high-value, and crisis itinerary work.',
    skills: {
      obsolete: [
        { skill: 'Standard flight and hotel search and booking', riskScore: 97, riskType: 'Automatable', horizon: '1yr', reason: 'AI travel agents (Google Trips AI, Layla, Booking AI) handle end-to-end standard booking with natural language input.', aiReplacement: 'Full', aiTool: 'Google Trips AI, Layla AI, Booking.com AI' },
        { skill: 'Basic itinerary creation from template', riskScore: 94, riskType: 'Automatable', horizon: '1yr', reason: 'AI tools generate complete itineraries from destination + duration + preference input in seconds.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Standard loyalty program management and points optimization', riskScore: 76, riskType: 'Augmented', horizon: '2yr', reason: 'AI loyalty tools automatically optimize point usage, identify transfer opportunities, and alert on expiry.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Complex Multi-Destination Planning for Special Needs', whySafe: 'Planning trips for travelers with medical conditions, accessibility requirements, dietary restrictions, or unusual destinations requires human judgment, local knowledge, and real vendor relationships AI cannot replicate.', longTermValue: 95, difficulty: 'High' },
        { skill: 'Crisis and Disruption Management', whySafe: 'When flights cancel, hotels close, or political instability erupts — the agent who has relationships with airlines, hotels, and embassies gets clients home. AI cannot make the human calls that resolve real travel crises.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Luxury & Specialist Travel Designer', riskReduction: 55, skillGap: 'High-net-worth client relations, Niche destination expertise, Crisis management protocols', transitionDifficulty: 'Medium', industryMapping: ['Luxury Travel', 'Corporate Travel Management'], salaryDelta: '+30-100%', timeToTransition: '12 months' },
      { role: 'Corporate Travel Manager', riskReduction: 40, skillGap: 'Travel program management, Supplier negotiation, Policy design', transitionDifficulty: 'Medium', industryMapping: ['Enterprise', 'TMCs (Travel Management Companies)'], salaryDelta: '+20-60%', timeToTransition: '18 months' },
    ],
    inactionScenario: 'Travel agents who focus on standard bookings will be fully replaced by AI tools within 2 years. The survivable niche is luxury, adventure, medical, and corporate travel — where relationships, local knowledge, and crisis resolution make all the difference.',
    riskTrend: [{ year: 2024, riskScore: 58, label: 'Now' }, { year: 2025, riskScore: 68, label: '+1yr' }, { year: 2026, riskScore: 76, label: '+2yr' }, { year: 2027, riskScore: 82, label: '+3yr' }, { year: 2028, riskScore: 87, label: '+4yr' }],
    confidenceScore: 96,
    contextTags: ['travel', 'high-risk', 'action-required', 'pivot-window', 'automation-zone'],
    evolutionHorizon: '2026',
  },

  trav_hotel_mgr: {
    displayRole: 'Hotel Manager / General Manager',
    summary: 'High resilience in leadership and guest experience; disruption in revenue management and back-office operations.',
    skills: {
      obsolete: [
        { skill: 'Manual revenue management pricing decisions', riskScore: 92, riskType: 'Automatable', horizon: '1yr', reason: 'AI revenue management systems (Duetto, IDeaS) dynamically price rooms across all channels in real-time.', aiReplacement: 'Full', aiTool: 'Duetto, IDeaS, Atomize' },
        { skill: 'Standard guest communication template responses', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI messaging platforms (Revinate, Zingle) automatically respond to guest requests across all channels.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Standard staff scheduling and shift management', riskScore: 74, riskType: 'Augmented', horizon: '2yr', reason: 'AI workforce management tools auto-generate optimal schedules from occupancy forecasts and labor rules.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Guest Experience Recovery and Service Excellence', whySafe: 'When something goes wrong for a guest — a honeymoon ruined, a business trip in crisis — the manager who can personally intervene, listen, and make it right creates loyalty AI messaging cannot.', longTermValue: 98, difficulty: 'High' },
        { skill: 'Team Culture and Staff Development', whySafe: 'Building and sustaining the hospitality culture that makes a hotel excellent — through coaching, recognition, and modeling the right behaviors — is irreducibly human leadership.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Regional Director of Operations', riskReduction: 30, skillGap: 'Multi-property P&L oversight, Brand standards governance, Executive stakeholder management', transitionDifficulty: 'Hard', industryMapping: ['Hotel Groups', 'Hospitality REITs'], salaryDelta: '+40-100%', timeToTransition: '36 months' },
      { role: 'Hotel Operations Consultant / Turnaround Specialist', riskReduction: 35, skillGap: 'Financial analysis, Performance benchmarking, Culture transformation methodology', transitionDifficulty: 'Medium', industryMapping: ['Consulting', 'Private Equity Hospitality'], salaryDelta: '+30-80%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'Hotel managers who do not develop AI revenue management literacy will cede their commercial judgment to algorithms they cannot interpret or challenge. The human leadership role is safe — the commercial acumen must be updated.',
    riskTrend: [{ year: 2024, riskScore: 22, label: 'Now' }, { year: 2025, riskScore: 26, label: '+1yr' }, { year: 2026, riskScore: 30, label: '+2yr' }, { year: 2027, riskScore: 33, label: '+3yr' }, { year: 2028, riskScore: 36, label: '+4yr' }],
    confidenceScore: 95,
    contextTags: ['travel', 'hospitality', 'ai-resilient', 'leadership-premium', 'commercial-risk'],
    evolutionHorizon: '2029',
  },

  trav_guide: {
    displayRole: 'Tour Guide / Local Experience Guide',
    summary: 'High resilience for authentic, in-person, relationship-based experiences; disruption in standardized, scripted touring.',
    skills: {
      obsolete: [
        { skill: 'Scripted standard tour delivery of public landmark information', riskScore: 88, riskType: 'Automatable', horizon: '2yr', reason: 'AI audio guides and AR apps (Google Lens tours, Rick Steves app) deliver standard landmark information on demand.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Standard tourist FAQ and logistics coordination responses', riskScore: 72, riskType: 'Augmented', horizon: '2yr', reason: 'AI travel assistants handle standard logistics questions, transport options, and entry requirements.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Authentic Local Storytelling and Cultural Interpretation', whySafe: 'The lived experience of a local guide — the family story behind a neighborhood, the untold history of a street, the cultural nuances that change how a visitor understands a place — cannot be replicated by AI drawing from public sources.', longTermValue: 97, difficulty: 'Medium' },
        { skill: 'Adaptive Group Experience Facilitation', whySafe: 'Reading the energy of a diverse group, adapting pacing and depth to who is engaged and who is lost, creating moments of genuine connection between strangers — this is irreducibly human facilitation.', longTermValue: 95, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Specialist Experience Designer (Cultural/Adventure Tourism)', riskReduction: 45, skillGap: 'Experience design methodology, Business development, Online platform presence', transitionDifficulty: 'Medium', industryMapping: ['Boutique Tour Operators', 'Airbnb Experiences'], salaryDelta: '+20-80%', timeToTransition: '12 months' },
      { role: 'Cultural Tourism Content Creator', riskReduction: 40, skillGap: 'Video content production, Social media strategy, Monetization on digital platforms', transitionDifficulty: 'Low', industryMapping: ['YouTube', 'Social Media', 'Travel Brands'], salaryDelta: '+0-150% (highly variable)', timeToTransition: '6 months' },
    ],
    inactionScenario: 'Tour guides offering only scripted landmark information will be replaced by AI audio guides and AR apps. Survival requires moving up-market to authentic, bespoke, relationship-based experiences that travelers choose precisely because a human is irreplaceable.',
    riskTrend: [{ year: 2024, riskScore: 35, label: 'Now' }, { year: 2025, riskScore: 42, label: '+1yr' }, { year: 2026, riskScore: 50, label: '+2yr' }, { year: 2027, riskScore: 57, label: '+3yr' }, { year: 2028, riskScore: 62, label: '+4yr' }],
    confidenceScore: 93,
    contextTags: ['travel', 'moderate-risk', 'human-touch', 'authentic-experience', 'pivot-window'],
    evolutionHorizon: '2027',
  },

  trav_airline_ops: {
    displayRole: 'Airline Operations / Ground Operations Staff',
    summary: 'High disruption in routine processing; resilience in safety-critical, high-pressure, and passenger-facing crisis management.',
    skills: {
      obsolete: [
        { skill: 'Standard check-in processing and boarding pass issuance', riskScore: 97, riskType: 'Automatable', horizon: '1yr', reason: 'Self-service kiosks, mobile apps, and biometric gates handle standard check-in end-to-end.', aiReplacement: 'Full' },
        { skill: 'Routine flight status and delay notification communications', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'Automated systems send real-time notifications and proactively rebook disrupted passengers.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Standard passenger rebooking for routine disruptions', riskScore: 80, riskType: 'Augmented', horizon: '2yr', reason: 'AI disruption management systems (Amadeus AI, SITA AI) auto-rebook passengers and optimize recovery.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'High-Stakes Passenger De-Escalation', whySafe: 'Managing a stranded, distressed, or dangerous passenger in a live airport environment — where physical presence, tone of voice, and de-escalation judgment matter — requires human staff with authority.', longTermValue: 96, difficulty: 'High' },
        { skill: 'Safety-Critical Ground Operations Judgment', whySafe: 'Making the call on whether a flight is safe to board under ambiguous conditions — extreme weather, equipment anomaly, distressed crew — requires licensed human authority with accountability.', longTermValue: 99, difficulty: 'Very High' },
      ],
    },
    careerPaths: [
      { role: 'Station Manager / Airport Operations Manager', riskReduction: 38, skillGap: 'Multi-function operations oversight, Budget management, Regulatory compliance', transitionDifficulty: 'Medium', industryMapping: ['Airlines', 'Airport Authorities', 'Ground Handlers'], salaryDelta: '+30-70%', timeToTransition: '24 months' },
      { role: 'Aviation Safety Officer', riskReduction: 50, skillGap: 'Aviation safety regulations, Safety management systems (SMS), Incident investigation', transitionDifficulty: 'Medium', industryMapping: ['Airlines', 'Aviation Regulators', 'Ground Handlers'], salaryDelta: '+20-50%', timeToTransition: '18 months' },
    ],
    inactionScenario: 'Airline operations staff in routine processing roles will be largely automated. The survivable positions are safety oversight, passenger experience recovery, and complex disruption management — where human judgment and authority remain essential.',
    riskTrend: [{ year: 2024, riskScore: 55, label: 'Now' }, { year: 2025, riskScore: 64, label: '+1yr' }, { year: 2026, riskScore: 72, label: '+2yr' }, { year: 2027, riskScore: 78, label: '+3yr' }, { year: 2028, riskScore: 83, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['travel', 'high-risk', 'safety-critical', 'action-required', 'automation-zone'],
    evolutionHorizon: '2026',
  },

  trav_event_planner: {
    displayRole: 'Event Planner / Event Manager',
    summary: 'Moderate disruption in logistics and vendor coordination; high resilience in creative direction and on-the-ground execution.',
    skills: {
      obsolete: [
        { skill: 'Vendor research and shortlisting from standard criteria', riskScore: 90, riskType: 'Automatable', horizon: '1yr', reason: 'AI event platforms (Cvent AI, Splash AI) automatically source and shortlist vendors from database matching.', aiReplacement: 'Full' },
        { skill: 'Standard attendee communication workflows', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI event platforms auto-send personalized invitations, reminders, confirmations, and follow-ups.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Budget tracking and standard reconciliation', riskScore: 75, riskType: 'Augmented', horizon: '2yr', reason: 'AI event management platforms auto-track spend against budget categories and flag variances in real-time.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Creative Vision and Client Brief Interpretation', whySafe: 'Understanding what a client truly wants — not just what they said — and translating a vague brief into a coherent event experience requires human creative intuition and client relationship.', longTermValue: 97, difficulty: 'High' },
        { skill: 'Real-Time Problem Solving on Event Day', whySafe: 'When the caterer is late, the speaker cancels, or the AV system fails 10 minutes before show time — the event manager who improvises, delegates, and maintains calm is irreplaceable.', longTermValue: 97, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Senior Event Strategy Director', riskReduction: 40, skillGap: 'Brand experience strategy, C-suite stakeholder management, Multi-market event oversight', transitionDifficulty: 'Hard', industryMapping: ['Agencies', 'Corporations', 'Conference Organizers'], salaryDelta: '+40-100%', timeToTransition: '36 months' },
      { role: 'Experiential Marketing Lead', riskReduction: 45, skillGap: 'Brand strategy, Audience activation design, ROI measurement frameworks', transitionDifficulty: 'Medium', industryMapping: ['Marketing Agencies', 'Consumer Brands'], salaryDelta: '+30-80%', timeToTransition: '18 months' },
    ],
    inactionScenario: 'Event planners who rely on logistics coordination as their primary value will be automated out. The survivable positioning is creative director and experiential strategist — where the human vision and real-time judgment are the product.',
    riskTrend: [{ year: 2024, riskScore: 38, label: 'Now' }, { year: 2025, riskScore: 46, label: '+1yr' }, { year: 2026, riskScore: 54, label: '+2yr' }, { year: 2027, riskScore: 60, label: '+3yr' }, { year: 2028, riskScore: 65, label: '+4yr' }],
    confidenceScore: 93,
    contextTags: ['travel', 'moderate-risk', 'creative', 'pivot-window', 'human-touch'],
    evolutionHorizon: '2027',
  },

  trav_concierge: {
    displayRole: 'Hotel Concierge / Luxury Concierge',
    summary: 'Very high resilience for high-touch, relationship-driven luxury service; moderate disruption for standard recommendation queries.',
    skills: {
      obsolete: [
        { skill: 'Standard restaurant and activity recommendations', riskScore: 88, riskType: 'Automatable', horizon: '1yr', reason: 'AI concierge tools (Angie Hospitality AI, Alice) automatically respond to standard recommendations 24/7.', aiReplacement: 'Full' },
        { skill: 'Routine booking confirmations and logistics queries', riskScore: 85, riskType: 'Automatable', horizon: '1yr', reason: 'AI messaging systems handle standard logistics questions and confirmation requests instantly.', aiReplacement: 'Full' },
      ],
      at_risk: [
        { skill: 'Standard guest preference tracking and profiling', riskScore: 70, riskType: 'Augmented', horizon: '2yr', reason: 'AI guest profile systems automatically record preferences from past stays and surface them for returning guests.', aiReplacement: 'Partial' },
      ],
      safe: [
        { skill: 'Bespoke Request Fulfillment for Ultra-High-Net-Worth Guests', whySafe: 'Arranging private jet access, securing impossible restaurant reservations, organizing surprise proposals — these require a personal network and creative problem-solving that AI cannot replicate.', longTermValue: 99, difficulty: 'Very High' },
        { skill: 'Trusted Advisor Relationship with Repeat Guests', whySafe: 'The long-term personal relationship with returning guests — knowing their preferences, their stories, their families — creates loyalty worth far more than any recommendation engine can generate.', longTermValue: 98, difficulty: 'High' },
      ],
    },
    careerPaths: [
      { role: 'Head Concierge / Chief Concierge (Les Clefs d\'Or)', riskReduction: 25, skillGap: 'Les Clefs d\'Or certification, Property leadership, Team coaching', transitionDifficulty: 'Hard', industryMapping: ['Luxury Hotels', 'Private Members Clubs'], salaryDelta: '+30-80%', timeToTransition: '36 months' },
      { role: 'Lifestyle Manager (Private Client Services)', riskReduction: 40, skillGap: 'UHNW client relations, Personal assistant skills, Lifestyle service network', transitionDifficulty: 'Hard', industryMapping: ['Private Banks', 'Family Offices', 'Luxury Brands'], salaryDelta: '+50-150%', timeToTransition: '24 months' },
    ],
    inactionScenario: 'Concierges who handle only standard requests will be replaced by AI messaging tools. The irreplaceable value is the personal network that unlocks what cannot be booked online, and the trusted relationship with returning guests that no app can replicate.',
    riskTrend: [{ year: 2024, riskScore: 28, label: 'Now' }, { year: 2025, riskScore: 33, label: '+1yr' }, { year: 2026, riskScore: 38, label: '+2yr' }, { year: 2027, riskScore: 42, label: '+3yr' }, { year: 2028, riskScore: 46, label: '+4yr' }],
    confidenceScore: 94,
    contextTags: ['travel', 'hospitality', 'ai-resilient', 'human-touch', 'luxury', 'relationship-premium'],
    evolutionHorizon: '2030',
  },
};
