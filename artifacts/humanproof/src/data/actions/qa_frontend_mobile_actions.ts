// qa_frontend_mobile_actions.ts — v37.0 Multi-Industry Role Intelligence
// Phase 3: QA Engineering (5 roles) + Frontend/Mobile Specializations (5 roles) = 10 explicit role groups

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

// ── QA + FRONTEND/MOBILE ROLES ────────────────────────────────────────────────

export const ACTION_DB_QA_FRONTEND_MOBILE: Record<string, BracketPool> = {

  qa_automation_engineer: pool(
    {
      title: 'Publish a Playwright + Cypress E2E Framework Repository This Week',
      description: 'Hiring managers screening QA Automation candidates increasingly require evidence of authored frameworks, not just script execution. Build a public GitHub repo demonstrating: (1) a Playwright TypeScript project with Page Object Model, fixture-based test data, and parallel sharding across 4 workers; (2) a parallel Cypress 13 setup with cy.session() auth caching and component testing for a React app; (3) a CI workflow (GitHub Actions) that uploads HTML reports and trace.zip artifacts on failure. Pin the repo to your profile. This single asset converts 40–60% more recruiter screens to onsite loops.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Convert Selenium 4 Suite to Playwright and Document 40%+ Runtime Reduction',
      description: 'Most enterprise QA teams still maintain legacy Selenium 4 + Java suites that take 35–90 minutes per regression run. Lead a proof-of-concept migration of one critical user journey to Playwright with auto-waiting, network mocking via page.route(), and trace viewer integration. Document the wall-clock reduction (typically 40–65%) and flaky-test rate drop in a Confluence page or internal blog. This artifact is the single most valuable interview talking point for senior QA Automation roles in 2026 — every shop is mid-migration.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Own the End-to-End Test Pipeline as a SET (Software Engineer in Test) Role',
      description: 'Senior QA Automation engineers who own the test infrastructure (Playwright Grid on Kubernetes, BrowserStack/LambdaTest orchestration, Allure or ReportPortal dashboards, flake-quarantine bots) are 3× harder to lay off than scripters. Pitch your manager a 90-day plan to: (1) move tests to ephemeral Docker runners; (2) introduce visual regression via Percy or Applitools; (3) instrument flake-detection with a quarantine workflow that auto-files Jira tickets. Title-change to SET or Test Infrastructure Engineer; comp band jumps 20–35%.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Add API Test Automation (REST Assured / Postman / Pact) to Your Resume',
      description: 'Pure UI automation roles are the most exposed to AI substitution — Copilot, Codium AI, and Mabl can generate baseline Playwright specs from Figma. Combine UI tests with contract testing (Pact for consumer-driven contracts), REST Assured for Java shops, or Postman Collections + Newman in CI. Engineers who own both the API and UI test pyramid are protected. Take the Postman Skills Expert certification (free, 4 hours) and add three Pact contracts to your portfolio repo.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 25, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Earn ISTQB Advanced Test Automation Engineer Certification',
      description: 'ISTQB CTAL-TAE ($229 exam, ~40 hours prep) is the only globally recognized credential that maps to Senior QA Automation comp bands. Combined with hands-on Playwright/Cypress evidence, it adds $8,000–$15,000 to base offers and unlocks contractor rates of $85–$130/hour. Study the official syllabus and book the exam within 30 days.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
  ),

  performance_test_engineer: pool(
    {
      title: 'Run a k6 Load Test on Production-Like Traffic and Publish the SLO Report',
      description: 'Performance Test Engineers who can present a real load-test artifact (k6 Cloud or k6 OSS run, 10K virtual users, p95/p99 latency graphs, throughput vs error-rate curves) are interview-instant-hires. This week: build a k6 script using ramping-arrival-rate executor, integrate with Grafana k6 Cloud or Prometheus + Tempo, and document the SLO breach point. Publish to GitHub with anonymized data. This is the single most valuable artifact for $150K+ Performance Engineer roles in 2026.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Migrate One Critical Endpoint from JMeter to Gatling or k6',
      description: 'JMeter is end-of-life in most modern shops; Gatling (Scala/Java DSL) and k6 (JavaScript DSL) are the 2026 standards. Lead a migration of your highest-traffic API endpoint from JMeter to k6 with InfluxDB + Grafana dashboards. Document the resource-usage reduction (k6 typically uses 1/5th the load generators of JMeter for equivalent VUs) and CI integration. This builds the case for a Performance Engineering platform role at $165–$195K.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Own Continuous Performance Testing in CI with Performance Budgets',
      description: 'Senior Performance Engineers earn the title by owning the org-wide perf gate: Lighthouse CI for frontend Web Vitals (LCP < 2.5s, CLS < 0.1, INP < 200ms), k6 thresholds in GitHub Actions/GitLab CI that fail PRs breaching p99 > 800ms, and SLO dashboards in Datadog or New Relic. Pitch a 60-day plan to wire perf budgets into 3 critical services. The output — a single PR-blocking gate that prevents perf regressions — is worth $30–50K in comp uplift and removes you from layoff lists entirely.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 40, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Add Chaos Engineering Tools (Gremlin / Litmus / Chaos Mesh) to Portfolio',
      description: 'Modern performance engineering converges with reliability engineering. Run a Gremlin Free or Litmus experiment in your homelab: inject 200ms latency on your DB connection while running a k6 load test, capture the cascade failure in Jaeger traces, and document the recovery time. This combined Perf + SRE skill positions you for Staff Performance Engineer or SRE roles at $190–$240K.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 28, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Profile a Real Java/Node Application with Flame Graphs (async-profiler / clinic.js)',
      description: 'Performance Test Engineers who only run load tests are commoditized. The premium is on engineers who can read flame graphs from async-profiler (JVM) or clinic.js Doctor + Flame (Node.js), identify hot methods, and recommend code-level fixes. Take a public OSS project, profile it under load, and write a tuning case study. This artifact converts mid-band to senior-band offers ($140K → $180K).',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '30 days', priority: 'Medium',
    },
  ),

  chaos_qa_engineer: pool(
    {
      title: 'Publish a GameDay Playbook Using Chaos Mesh or AWS FIS This Week',
      description: 'Chaos QA Engineers are a scarce specialty (under 4,000 worldwide in 2026). The fastest way to credentialize is to design a GameDay: pick a target service, inject 3 failure modes (pod-kill via Chaos Mesh, network partition via toxiproxy, AZ-failure via AWS FIS), and document the blast radius + MTTR in a public playbook. Reference Netflix Chaos Monkey origin and Principles of Chaos Engineering. This single artifact converts your title from QA Engineer to Resilience/Chaos Engineer and unlocks $170–$220K offers at fintech, AdTech, and observability companies.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Run Steady-State Hypothesis Experiments with Litmus in a Staging Cluster',
      description: 'Mid-level Chaos QA Engineers earn the senior title by moving from manual GameDays to automated continuous chaos. Deploy LitmusChaos on your staging Kubernetes cluster, define a steady-state hypothesis (e.g., "checkout p99 < 600ms"), and schedule daily pod-delete + cpu-hog experiments via the Litmus Chaos Hub. Wire results to Grafana dashboards and Slack alerts. Document a quarter of reliability data: this is interview platinum.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Become the Org-Wide Reliability Engineering Lead with FMEA + Error Budget Ownership',
      description: 'Senior Chaos Engineers transition into Resilience or SRE leadership by owning org-wide FMEA (Failure Mode and Effects Analysis), error budgets, and post-incident retrospectives. Propose a quarterly GameDay cadence covering all Tier-1 services, with Gremlin or Chaos Mesh experiments mapped to runbooks. Combined with on-call rotation leadership, this is a $200–$280K role at FAANG-tier and unicorn fintech firms.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Get AWS Certified Solutions Architect + Chaos Engineering Practitioner Certs',
      description: 'AWS SAA-C03 ($150, ~80 hours prep) plus the free Verica Chaos Engineering Practitioner course are the two credentials that map to senior Chaos titles. SAA proves you understand multi-AZ + multi-region failure domains; Verica proves you understand the methodology. Together they unlock $180K+ offers at cloud-native shops.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'High',
    },
    {
      title: 'Author One Public Incident Post-Mortem with Chaos Findings',
      description: 'Public, well-written post-mortems following Google SRE format (impact, timeline, root cause, lessons, action items) are the highest-signal portfolio item for resilience roles. Take a real production incident at your current org (anonymize names), pair it with a chaos experiment that would have caught it, and publish on Medium or your blog. Two of these and recruiters DM you weekly.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 18, deadline: '30 days', priority: 'Medium',
    },
  ),

  mobile_qa_engineer: pool(
    {
      title: 'Build an Appium + Detox + BrowserStack Mobile Test Lab This Week',
      description: 'Mobile QA hiring in 2026 demands proof you can run automated tests on real devices. Build a public repo combining: (1) Appium 2.x with the UiAutomator2 + XCUITest drivers for Android/iOS cross-platform tests; (2) Detox for a React Native sample app (grey-box, faster than Appium for RN); (3) a BrowserStack App Automate or Sauce Labs Real Device Cloud integration covering 6 device profiles (Pixel 8, Galaxy S24, iPhone 15 Pro, iPad Air, low-end Moto G, OnePlus). Wire to GitHub Actions matrix. This is the single highest-signal portfolio asset for Mobile QA Engineer roles at $110–$160K.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Own App Store / Play Store Release Quality Gates with a Pre-Release Test Suite',
      description: 'Mid-level Mobile QA Engineers earn senior status by owning the pre-release gate: a TestFlight + Firebase App Distribution rollout that runs Detox/Espresso smoke tests, monkey-test crash discovery (Android Monkey, iOS Crashlytics canary), and a 200-device matrix on BrowserStack/Firebase Test Lab. Pitch your team a release checklist that blocks store submission unless the gate passes. This positions you as the single person between bad code and 1-star reviews — layoff-proof.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Become the Mobile Performance + Accessibility Owner with XCUITest + Espresso + Accessibility Scanner',
      description: 'Senior Mobile QA Engineers differentiate by owning performance (Android Profiler, Instruments Time Profiler, frame-drop tracking via systrace and JankStats) and accessibility (TalkBack, VoiceOver, axe DevTools for Mobile, Google Accessibility Scanner). Author a Mobile Quality Charter covering both. This expands your remit beyond functional QA and supports a $160–$200K senior or Staff Mobile QA title.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Add Real-User Monitoring (Firebase Crashlytics + Sentry + Datadog RUM) Skills',
      description: 'Modern Mobile QA bridges pre-release testing with post-release monitoring. Integrate Firebase Crashlytics, Sentry Mobile, and Datadog Mobile RUM in a sample app. Define crash-free user-session SLOs (>99.5%) and an ANR/Hang rate budget. The engineer who watches the dashboards on launch day is the engineer leadership protects.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 25, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Earn the ISTQB Mobile Application Testing Specialist Certification',
      description: 'ISTQB Mobile Application Testing ($199, ~25 hours prep) is the only ISTQB cert specifically validating mobile context: network conditions, fragmentation, gestures, push notifications, and app lifecycle. Combined with Appium/Detox portfolio evidence, it adds $7–12K to base offers and is required by several enterprise QA orgs (banks, insurers).',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '45 days', priority: 'Medium',
    },
  ),

  accessibility_engineer: pool(
    {
      title: 'Audit Your Company\'s Top Funnel Pages with axe-core + WAVE and Publish the Report',
      description: 'Accessibility Engineers (a11y Engineers) are scarce (~6,000 senior practitioners in the US). The fastest path to the title is to deliver a WCAG 2.2 AA audit using axe DevTools, WAVE, and Lighthouse Accessibility on your company\'s checkout funnel or signup flow. Document violations by severity, link each to WCAG SC numbers, and propose code fixes. This single artifact — done in 5 days — converts to a Senior Accessibility Engineer role at $145–$190K and opens consulting at $200–$300/hour.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Earn IAAP CPACC + WAS Certifications and Add Them to Your Title',
      description: 'IAAP CPACC ($385, ~60 hours prep) + WAS ($385, ~80 hours prep) are the two credentials that distinguish a hobbyist a11y advocate from a Certified Accessibility Engineer. Together they unlock the IAAP CPABE designation. Combined with an audit portfolio, these credentials command $160–$220K base + retainer consulting at major enterprises facing ADA Title III litigation exposure.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '120 days', priority: 'Critical',
    },
    {
      title: 'Own the Accessibility Engineering Function: Linting, CI Gates, Design System Compliance',
      description: 'Senior Accessibility Engineers earn $200K+ by becoming the org-wide a11y owner: eslint-plugin-jsx-a11y in CI, axe-core/playwright integration in E2E suites that block PRs on new violations, Storybook a11y addon for design-system component coverage, and ARC Toolkit + NVDA/JAWS test plans for screen-reader coverage. Pitch a 90-day plan to your CTO. ADA Title III + EU EAA 2025 enforcement make this a layoff-proof role.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Build a Public Screen-Reader Test Plan Library (NVDA + JAWS + VoiceOver)',
      description: 'Automated tools catch ~30% of WCAG issues; the other 70% requires manual screen-reader testing. Author public test plans for NVDA (Windows), JAWS (Windows), VoiceOver (macOS/iOS), and TalkBack (Android) covering: focus order, form announcements, live region behavior, and custom widget patterns (combobox, treegrid, dialog). This positions you as the consultant of choice for Fortune 500 a11y programs.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 28, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Speak at axe-con or a11yCamp and Publish on Smashing Magazine or A List Apart',
      description: 'The accessibility community is small, tight, and hires through reputation. Submit a CFP for axe-con (free, virtual, Deque), a11yTO Camp, or M-Enabling Summit. Publish a piece on Smashing Magazine or A List Apart covering a specific a11y pattern you mastered. Two published pieces + one conference talk and you become inbound-only for senior roles.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 22, deadline: '90 days', priority: 'Medium',
    },
  ),

  frontend_performance_engineer: pool(
    {
      title: 'Publish a Web Vitals Optimization Case Study Hitting LCP < 1.5s This Week',
      description: 'Frontend Performance Engineer is a scarce specialty role ($150–$230K). The interview filter is a real, public case study showing measurable Core Web Vitals improvements. Take a slow public site (a public Lighthouse score < 60), fork it, and deliver: (1) LCP < 1.5s via image optimization, fetchpriority="high", and Server Components / RSC migration; (2) CLS < 0.05 via reserved aspect ratios; (3) INP < 150ms via React 19 concurrent rendering and useDeferredValue. Publish before/after WebPageTest filmstrips. This converts to senior offers within 30 days.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Migrate a Critical Route to React 19 Server Components + Next.js 15 App Router',
      description: 'Mid-level Frontend Performance Engineers level up by leading a Server Components migration. Convert one Next.js 14 Pages Router route to Next.js 15 App Router with React 19 RSC, use streaming with Suspense boundaries, and document the JS-bundle reduction (typically 40–70%) and TTFB improvement. This artifact is the highest-signal portfolio piece for Staff Frontend Performance roles at $190–$240K.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Own the Org-Wide Performance Budget with Lighthouse CI + Calibre + SpeedCurve',
      description: 'Senior Frontend Performance Engineers are layoff-proof because they own the revenue-protecting performance gate. Wire Lighthouse CI to your PR pipeline blocking merges if LCP regresses > 200ms, integrate Calibre or SpeedCurve for real-device weekly trends, and instrument web-vitals.js + Datadog RUM for field data. Present a $X-per-100ms-LCP revenue model from your analytics team. This caps your value at $30–60K above peer bands.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Master Chrome DevTools Performance Panel + WebPageTest Waterfall Analysis',
      description: 'The premium on Frontend Performance Engineers is the ability to read a Performance Panel flame chart, identify long tasks > 50ms, and trace them to specific React render cycles via React DevTools Profiler. Author a public guide showing how you debugged one real INP regression to a specific useEffect cascade. This skill cannot be Copilot-generated and commands $180K+ instantly.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Contribute to web.dev, Web Performance Working Group, or Speak at performance.now()',
      description: 'The Web Performance community recruits on reputation. Contribute a case study to web.dev (Google) or DebugBear blog, attend the W3C Web Performance Working Group as an Invited Expert, or submit a CFP for performance.now() (Amsterdam) or PerfNow. One contribution and you become inbound-only at Vercel, Cloudflare, Shopify, and Akamai-tier shops.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 25, deadline: '90 days', priority: 'Medium',
    },
  ),

  webgl_engineer: pool(
    {
      title: 'Ship a Public Three.js + WebGL2 Demo with Custom GLSL Shaders This Week',
      description: 'WebGL/3D Engineers are an ultra-scarce specialty (under 2,500 practitioners worldwide in 2026, base $160–$260K). The interview filter is a demonstrably hard 3D demo: a Three.js r170+ scene with a custom GLSL fragment shader (e.g., volumetric rendering, SDF raymarching, deferred lighting), 60fps on a Pixel 8 / iPhone 15, and a Lighthouse score > 80. Deploy to Vercel or itch.io with the source on GitHub. This single artifact converts to Senior 3D/WebGL Engineer offers at Spline, Figma, Rive, Polycam, or Unity/Unreal web teams within 14 days.',
      layerFocus: 'L3 · Skills', riskReductionPct: 42, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Build a WebGPU Prototype and Publish a Benchmark vs WebGL2',
      description: 'WebGPU shipped in Chromium and Safari TP in 2025; 2026 is the year senior 3D web engineers master it. Port one Three.js demo to a WebGPU compute-shader pipeline (using TSL or the raw WebGPU API), benchmark draw calls per frame vs WebGL2, and publish to your blog. WebGPU-skilled engineers are paid $200–$280K at Adobe (Firefly Web), Figma, Rive, and Spline as of Q1 2026.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Own a Real-Time 3D Pipeline End-to-End: glTF + Draco + Basis + Meshopt + WebGL2/WebGPU',
      description: 'Senior WebGL Engineers earn $220–$280K by owning the full pipeline: glTF 2.0 export from Blender/Maya, KTX2 + Basis Universal texture compression, Draco geometry compression, meshoptimizer for vertex caching, and runtime LOD selection. Build a sample asset pipeline with Three.js GLTFLoader + KTX2Loader and document a 70%+ payload reduction. This is the single most valuable artifact for Staff/Principal 3D Web roles.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 45, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Contribute a PR to Three.js, Babylon.js, or Construct: Get a Maintainer Comment',
      description: 'The 3D web community is tiny — fewer than 50 active Three.js core contributors. One merged PR to three.js (mr.doob), babylon.js (Microsoft), or pmndrs/drei + react-three-fiber and you become inbound-only. Even a single approved bug fix triggers recruiter DMs at Spline, Rive, Figma, Adobe, and Unity Weta Tools. Pick one open issue this week.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 35, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Master GLSL + Shader Math (Inigo Quilez tutorials + The Book of Shaders)',
      description: 'AI cannot generate competent GLSL or HLSL shaders for novel visuals — this is the most AI-resistant skill on the web platform. Complete Inigo Quilez\'s SDF tutorials, work through The Book of Shaders, and publish 3 ShaderToy entries. These cannot be Copilot-generated; recruiters check ShaderToy profiles directly when hiring for 3D roles.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Medium',
    },
  ),

  ios_engineer_senior: pool(
    {
      title: 'Ship a Public Swift 6 + Swift UI App to TestFlight This Week',
      description: 'Senior iOS Engineers ($170–$280K) are interviewed against a public app, not a resume. Build and ship a minimum-viable iOS app using Swift 6, Swift UI 5 (iOS 18 SDK), structured concurrency (async/await + actors), Swift Data persistence, and a widget extension. Deploy to TestFlight with public link. Senior iOS hiring managers at Apple, Snap, Robinhood, and Spotify will not advance candidates without an App Store / TestFlight link. This single artifact is the difference between $150K and $220K offers.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Migrate One UIKit View Controller to Swift UI + The Composable Architecture (TCA)',
      description: 'Most production iOS apps in 2026 are mid-migration from UIKit to Swift UI. Senior iOS Engineers who can show before/after PRs converting a complex UIKit screen (e.g., a feed view with custom UICollectionViewLayout) to Swift UI with TCA or The Observation framework command $230K+. Pick one complex screen in an open-source iOS app (Wikipedia iOS, DuckDuckGo iOS, Signal iOS) and publish the migration PR as a portfolio piece.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Own the App Store Optimization + Crash-Free Rate KPIs (Crashlytics + MetricKit + Xcode Organizer)',
      description: 'Senior iOS Engineers are layoff-proof when they own user-facing KPIs: App Store rating (target > 4.6), crash-free user sessions (> 99.7% via Crashlytics + MetricKit + Xcode Organizer crash logs), and Hang Rate (< 0.1% via MetricKit MXHangDiagnostic). Pitch a 60-day quality program covering review-response SLAs, in-app review prompts (SKStoreReviewController), and a weekly crash triage. This expands your role beyond IC engineer.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build a Vision Pro / VisionOS App with Reality Composer Pro + RealityKit',
      description: 'Vision Pro / visionOS is the fastest-growing iOS specialization in 2026 — fewer than 1,200 senior visionOS engineers exist worldwide. Build a sample spatial app using RealityKit + Reality Composer Pro, integrate hand tracking via ARKit, and publish to Vision Pro App Store TestFlight. Senior visionOS engineers at Apple, Snap, Niantic, Disney, and Unity earn $250–$340K. The barrier to entry will close by end of 2026.',
      layerFocus: 'L3 · Role Adjacency', riskReductionPct: 38, deadline: '90 days', priority: 'High',
    },
    {
      title: 'Contribute to Swift Open Source (Swift Evolution, SwiftLint, SwiftFormat, Alamofire)',
      description: 'The Swift open-source community recruits on reputation. One merged PR to Swift Evolution, SwiftLint, SwiftFormat, Alamofire, or RxSwift makes you findable by recruiters from Apple, Spotify, Lyft, and Reddit iOS teams. Pick one open issue tagged "good first issue" and submit a PR within 30 days.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
  ),

  android_engineer_senior: pool(
    {
      title: 'Ship a Public Jetpack Compose + Kotlin 2.0 App to Play Store Internal Testing This Week',
      description: 'Senior Android Engineers ($165–$270K) are screened on Play Store / internal testing track presence, not resumes. Build and ship a minimum-viable Android app using Kotlin 2.0, Jetpack Compose 1.7, Compose Material 3, Hilt DI, Room + DataStore, KMP-ready architecture, and a Wear OS or Tile companion. Deploy to Play Store Internal Testing track with public install link. Senior Android hiring managers at Google, Meta, Reddit, and Snap will not progress candidates without a live install link.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Migrate a View System Screen to Jetpack Compose + Adopt Kotlin Multiplatform (KMP) Sharing',
      description: 'Most production Android apps in 2026 are mid-migration from View XML to Compose, and considering KMP for shared business logic with iOS. Senior Android Engineers who can show: (1) a before/after PR migrating a RecyclerView-heavy screen to LazyColumn + Compose; (2) a KMP shared module wiring to both Android (Compose) and iOS (Swift UI) command $220K+ instantly.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Own App Quality KPIs: Crash-Free Rate + ANR Rate + Baseline Profiles + Macrobenchmark',
      description: 'Senior Android Engineers are protected from layoff when they own measurable quality KPIs: crash-free user sessions > 99.6% (Firebase Crashlytics + Play Console Vitals), ANR rate < 0.47% bad behavior threshold, and startup latency < 800ms cold start. Generate a Baseline Profile via Macrobenchmark, integrate into release, and document the startup-time reduction (typically 20–30%). This single artifact unlocks Staff Android Engineer at $240–$290K.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Master Hermes / R8 / Profile-Guided Optimization for Production Apps',
      description: 'Senior Android Engineers earn the title by understanding the build pipeline deeply: R8 full-mode minification, Profile-Guided Optimization (PGO) via Baseline Profiles, App Bundle dynamic delivery, and Play Asset Delivery. Author a public guide showing how you reduced your APK size 35% with R8 + R8 resource shrinking + dynamic features. This skill is hand-built; AI cannot generate it.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Contribute to AndroidX, Compose-Multiplatform, or Square OkHttp/Retrofit',
      description: 'The Android open-source community recruits on reputation. One merged PR to AndroidX (jetpack libraries), JetBrains Compose-Multiplatform, Square OkHttp / Retrofit / Moshi, or Coil image-loading library puts you on Google, Meta, Reddit, and Lyft recruiter dashboards. Pick one open issue this week.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
  ),

  react_native_engineer: pool(
    {
      title: 'Ship a Public Expo SDK 52 + React Native 0.76 New-Architecture App This Week',
      description: 'React Native Engineers ($130–$220K) are screened on public Expo / TestFlight / Play Store links demonstrating familiarity with the New Architecture (Fabric + TurboModules + Hermes). Build a sample app with Expo SDK 52, React Native 0.76 New Architecture, expo-router file-based routing, Reanimated 3, Skia, and one custom TurboModule. Publish via EAS Build to TestFlight + Play Internal Testing. This single artifact is the difference between $130K and $190K offers.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Author a Native Module Bridging iOS Swift + Android Kotlin via TurboModules / Expo Modules API',
      description: 'Mid-level RN Engineers are commoditized; the premium goes to engineers who can write native modules in Swift + Kotlin and bridge them via TurboModules or the Expo Modules API. Pick one missing capability (e.g., HealthKit on iOS + Health Connect on Android), write the native modules, expose them via Expo Modules API, and publish to NPM. This skill alone moves comp from $150K to $200K+.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Own the EAS Build + Code Push + OTA Pipeline End-to-End',
      description: 'Senior RN Engineers protect their role by owning the release pipeline: EAS Build for native binaries, EAS Update or Microsoft CodePush for OTA JavaScript updates, EAS Submit for App Store + Play Store automation, and Sentry + Firebase Crashlytics for both JS and native crash tracking. Document a release runbook that lets a product manager ship safely. This expands your remit from IC to release engineer at $180–$220K.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 40, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Master Hermes Engine + JSI + Reanimated 3 Worklets for 60fps Performance',
      description: 'React Native\'s performance ceiling is set by Hermes (JS engine), JSI (synchronous native bridge), and Reanimated 3 (UI-thread animations via worklets). Author a sample app with a 120fps ProMotion-aware Reanimated 3 gesture handler, profile it via Flipper + Hermes profiler, and publish the optimization case study. This skill ladder commands $200K+.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Contribute to React Native Core, Expo, Reanimated, or Shopify Restyle',
      description: 'The React Native community recruits on reputation. One merged PR to facebook/react-native, expo/expo, software-mansion/react-native-reanimated, or shopify/restyle makes you findable by Meta, Shopify, Microsoft, Discord, and Coinbase RN teams. Pick one open issue this week.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 22, deadline: '45 days', priority: 'Medium',
    },
  ),

};

// ── ALIAS ADDITIONS ───────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_QA_FRONTEND_MOBILE: Record<string, { canonicalKey: string; displayRole: string }> = {
  // QA Automation
  'qa automation engineer': { canonicalKey: 'qa_automation_engineer', displayRole: 'QA Automation Engineer' },
  'qa automation': { canonicalKey: 'qa_automation_engineer', displayRole: 'QA Automation Engineer' },
  'test automation engineer': { canonicalKey: 'qa_automation_engineer', displayRole: 'Test Automation Engineer' },
  'sdet': { canonicalKey: 'qa_automation_engineer', displayRole: 'SDET (Software Development Engineer in Test)' },
  'software development engineer in test': { canonicalKey: 'qa_automation_engineer', displayRole: 'SDET' },
  'set': { canonicalKey: 'qa_automation_engineer', displayRole: 'Software Engineer in Test' },
  'automation qa': { canonicalKey: 'qa_automation_engineer', displayRole: 'Automation QA' },
  'playwright engineer': { canonicalKey: 'qa_automation_engineer', displayRole: 'Playwright Test Engineer' },
  // Performance Test
  'performance test engineer': { canonicalKey: 'performance_test_engineer', displayRole: 'Performance Test Engineer' },
  'performance engineer': { canonicalKey: 'performance_test_engineer', displayRole: 'Performance Engineer' },
  'load test engineer': { canonicalKey: 'performance_test_engineer', displayRole: 'Load Test Engineer' },
  'performance qa': { canonicalKey: 'performance_test_engineer', displayRole: 'Performance QA Engineer' },
  'k6 engineer': { canonicalKey: 'performance_test_engineer', displayRole: 'k6 Performance Engineer' },
  'jmeter engineer': { canonicalKey: 'performance_test_engineer', displayRole: 'JMeter Engineer' },
  // Chaos QA
  'chaos engineer': { canonicalKey: 'chaos_qa_engineer', displayRole: 'Chaos Engineer' },
  'chaos qa engineer': { canonicalKey: 'chaos_qa_engineer', displayRole: 'Chaos QA Engineer' },
  'resilience engineer': { canonicalKey: 'chaos_qa_engineer', displayRole: 'Resilience Engineer' },
  'reliability engineer': { canonicalKey: 'chaos_qa_engineer', displayRole: 'Reliability Engineer' },
  'site reliability tester': { canonicalKey: 'chaos_qa_engineer', displayRole: 'Site Reliability Test Engineer' },
  // Mobile QA
  'mobile qa engineer': { canonicalKey: 'mobile_qa_engineer', displayRole: 'Mobile QA Engineer' },
  'mobile test engineer': { canonicalKey: 'mobile_qa_engineer', displayRole: 'Mobile Test Engineer' },
  'mobile automation engineer': { canonicalKey: 'mobile_qa_engineer', displayRole: 'Mobile Automation Engineer' },
  'appium engineer': { canonicalKey: 'mobile_qa_engineer', displayRole: 'Appium Test Engineer' },
  'ios qa': { canonicalKey: 'mobile_qa_engineer', displayRole: 'iOS QA Engineer' },
  'android qa': { canonicalKey: 'mobile_qa_engineer', displayRole: 'Android QA Engineer' },
  // Accessibility
  'accessibility engineer': { canonicalKey: 'accessibility_engineer', displayRole: 'Accessibility Engineer' },
  'a11y engineer': { canonicalKey: 'accessibility_engineer', displayRole: 'Accessibility (a11y) Engineer' },
  'accessibility specialist': { canonicalKey: 'accessibility_engineer', displayRole: 'Accessibility Specialist' },
  'accessibility consultant': { canonicalKey: 'accessibility_engineer', displayRole: 'Accessibility Consultant' },
  'wcag specialist': { canonicalKey: 'accessibility_engineer', displayRole: 'WCAG Compliance Specialist' },
  'ada compliance engineer': { canonicalKey: 'accessibility_engineer', displayRole: 'ADA Compliance Engineer' },
  // Frontend Performance
  'frontend performance engineer': { canonicalKey: 'frontend_performance_engineer', displayRole: 'Frontend Performance Engineer' },
  'web performance engineer': { canonicalKey: 'frontend_performance_engineer', displayRole: 'Web Performance Engineer' },
  'core web vitals engineer': { canonicalKey: 'frontend_performance_engineer', displayRole: 'Core Web Vitals Engineer' },
  'frontend perf engineer': { canonicalKey: 'frontend_performance_engineer', displayRole: 'Frontend Perf Engineer' },
  'speed engineer': { canonicalKey: 'frontend_performance_engineer', displayRole: 'Site Speed Engineer' },
  // WebGL
  'webgl engineer': { canonicalKey: 'webgl_engineer', displayRole: 'WebGL Engineer' },
  'webgl developer': { canonicalKey: 'webgl_engineer', displayRole: 'WebGL Developer' },
  '3d web engineer': { canonicalKey: 'webgl_engineer', displayRole: '3D Web Engineer' },
  'three.js engineer': { canonicalKey: 'webgl_engineer', displayRole: 'Three.js Engineer' },
  'threejs developer': { canonicalKey: 'webgl_engineer', displayRole: 'Three.js Developer' },
  'webgpu engineer': { canonicalKey: 'webgl_engineer', displayRole: 'WebGPU Engineer' },
  'graphics engineer web': { canonicalKey: 'webgl_engineer', displayRole: 'Web Graphics Engineer' },
  'shader engineer': { canonicalKey: 'webgl_engineer', displayRole: 'Shader Engineer' },
  // iOS Senior
  'ios engineer': { canonicalKey: 'ios_engineer_senior', displayRole: 'iOS Engineer' },
  'senior ios engineer': { canonicalKey: 'ios_engineer_senior', displayRole: 'Senior iOS Engineer' },
  'ios developer': { canonicalKey: 'ios_engineer_senior', displayRole: 'iOS Developer' },
  'swift engineer': { canonicalKey: 'ios_engineer_senior', displayRole: 'Swift Engineer' },
  'swiftui engineer': { canonicalKey: 'ios_engineer_senior', displayRole: 'Swift UI Engineer' },
  'visionos engineer': { canonicalKey: 'ios_engineer_senior', displayRole: 'visionOS Engineer' },
  'vision pro engineer': { canonicalKey: 'ios_engineer_senior', displayRole: 'Vision Pro Engineer' },
  // Android Senior
  'android engineer': { canonicalKey: 'android_engineer_senior', displayRole: 'Android Engineer' },
  'senior android engineer': { canonicalKey: 'android_engineer_senior', displayRole: 'Senior Android Engineer' },
  'android developer': { canonicalKey: 'android_engineer_senior', displayRole: 'Android Developer' },
  'kotlin engineer': { canonicalKey: 'android_engineer_senior', displayRole: 'Kotlin Engineer' },
  'jetpack compose engineer': { canonicalKey: 'android_engineer_senior', displayRole: 'Jetpack Compose Engineer' },
  'kmp engineer': { canonicalKey: 'android_engineer_senior', displayRole: 'Kotlin Multiplatform Engineer' },
  // React Native
  'react native engineer': { canonicalKey: 'react_native_engineer', displayRole: 'React Native Engineer' },
  'react native developer': { canonicalKey: 'react_native_engineer', displayRole: 'React Native Developer' },
  'rn engineer': { canonicalKey: 'react_native_engineer', displayRole: 'React Native Engineer' },
  'expo engineer': { canonicalKey: 'react_native_engineer', displayRole: 'Expo / React Native Engineer' },
  'cross platform mobile engineer': { canonicalKey: 'react_native_engineer', displayRole: 'Cross-Platform Mobile Engineer' },
  'hybrid mobile engineer': { canonicalKey: 'react_native_engineer', displayRole: 'Hybrid Mobile Engineer' },
};

// ── CANONICAL → ACTION GROUP ADDITIONS ────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_QA_FRONTEND_MOBILE: Record<string, string> = {
  qa_automation_engineer: 'qa_automation_engineer',
  performance_test_engineer: 'performance_test_engineer',
  chaos_qa_engineer: 'chaos_qa_engineer',
  mobile_qa_engineer: 'mobile_qa_engineer',
  accessibility_engineer: 'accessibility_engineer',
  frontend_performance_engineer: 'frontend_performance_engineer',
  webgl_engineer: 'webgl_engineer',
  ios_engineer_senior: 'ios_engineer_senior',
  android_engineer_senior: 'android_engineer_senior',
  react_native_engineer: 'react_native_engineer',
};

// ── DEMAND ADDITIONS ──────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_QA_FRONTEND_MOBILE: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: 'rising' | 'stable' | 'falling';
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  qa_automation_engineer: {
    roleKey: 'qa_automation_engineer', roleName: 'QA Automation Engineer / SDET',
    demandIndex: 80, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 32, yoyJobOpeningsChange: 14,
    topHiringLocations: ['San Francisco CA', 'Seattle WA', 'Austin TX', 'New York NY', 'Boston MA'],
    aiSubstitutionRisk: 0.34, dataQuarter: '2026-Q1',
    calibrationNote: 'AI test generators (Mabl, Codium AI, GitHub Copilot) accelerating script authoring; SDET/SET roles owning test infrastructure protected, pure scripters compressed.',
  },
  performance_test_engineer: {
    roleKey: 'performance_test_engineer', roleName: 'Performance Test Engineer',
    demandIndex: 76, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 45, yoyJobOpeningsChange: 12,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Austin TX', 'Chicago IL'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'k6 + Gatling adoption replacing JMeter; engineers who own perf budgets in CI command 25% premium. SLO-ownership skill highly protected.',
  },
  chaos_qa_engineer: {
    roleKey: 'chaos_qa_engineer', roleName: 'Chaos / Resilience Engineer',
    demandIndex: 74, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 62, yoyJobOpeningsChange: 24,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Austin TX', 'Remote'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'Scarce specialty (<4,000 practitioners). Fintech + observability companies driving demand. Chaos Mesh / Litmus / Gremlin / AWS FIS skills command 30–45% premium over generalist QA.',
  },
  mobile_qa_engineer: {
    roleKey: 'mobile_qa_engineer', roleName: 'Mobile QA Engineer',
    demandIndex: 72, demandTrend: 'stable', jobOpeningsTrend: 'stable', salaryTrend: 'rising',
    timeToFillDays: 38, yoyJobOpeningsChange: 8,
    topHiringLocations: ['San Francisco CA', 'Seattle WA', 'New York NY', 'Austin TX', 'Los Angeles CA'],
    aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1',
    calibrationNote: 'Appium + Detox + BrowserStack/Sauce Labs stack required. Manual mobile QA compressed; automation-owning engineers protected. App Store/Play Store release-gate owners highest-paid.',
  },
  accessibility_engineer: {
    roleKey: 'accessibility_engineer', roleName: 'Accessibility (a11y) Engineer',
    demandIndex: 78, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 58, yoyJobOpeningsChange: 30,
    topHiringLocations: ['Washington DC', 'San Francisco CA', 'New York NY', 'Remote', 'Seattle WA'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'ADA Title III litigation + EU EAA 2025 enforcement driving demand. IAAP CPACC + WAS certified engineers under 6,000 in US; consulting rates $200–$300/hr.',
  },
  frontend_performance_engineer: {
    roleKey: 'frontend_performance_engineer', roleName: 'Frontend Performance Engineer',
    demandIndex: 79, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 20,
    topHiringLocations: ['San Francisco CA', 'Seattle WA', 'New York NY', 'Austin TX', 'Remote'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Core Web Vitals tied to SEO + revenue. React 19 Server Components + Next.js 15 App Router migrations driving demand. Lighthouse CI + Datadog RUM owners commanding $190K+.',
  },
  webgl_engineer: {
    roleKey: 'webgl_engineer', roleName: 'WebGL / 3D Web Engineer',
    demandIndex: 82, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 75, yoyJobOpeningsChange: 28,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Los Angeles CA', 'Seattle WA', 'Remote'],
    aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1',
    calibrationNote: 'Ultra-scarce specialty (<2,500 worldwide). WebGPU adoption + Figma/Spline/Rive demand + Vision Pro web shaders driving compensation surge. GLSL/HLSL skill AI-resistant.',
  },
  ios_engineer_senior: {
    roleKey: 'ios_engineer_senior', roleName: 'Senior iOS Engineer',
    demandIndex: 84, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 52, yoyJobOpeningsChange: 16,
    topHiringLocations: ['Cupertino CA', 'San Francisco CA', 'Seattle WA', 'New York NY', 'Austin TX'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Swift 6 + Swift UI + visionOS specialty driving premium. Senior engineers with shipped App Store apps + crash-free SLO ownership command $220–$280K. visionOS specialists scarce.',
  },
  android_engineer_senior: {
    roleKey: 'android_engineer_senior', roleName: 'Senior Android Engineer',
    demandIndex: 82, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 50, yoyJobOpeningsChange: 14,
    topHiringLocations: ['Mountain View CA', 'San Francisco CA', 'Seattle WA', 'New York NY', 'Austin TX'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Jetpack Compose + Kotlin 2.0 + KMP specialty driving premium. Senior engineers with Play Store track record + ANR/Vitals ownership command $210–$270K. KMP-ready engineers scarce.',
  },
  react_native_engineer: {
    roleKey: 'react_native_engineer', roleName: 'React Native Engineer',
    demandIndex: 72, demandTrend: 'stable', jobOpeningsTrend: 'rising', salaryTrend: 'stable',
    timeToFillDays: 35, yoyJobOpeningsChange: 9,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Austin TX', 'Seattle WA', 'Remote'],
    aiSubstitutionRisk: 0.24, dataQuarter: '2026-Q1',
    calibrationNote: 'New Architecture (Fabric + TurboModules + Hermes) skill required for senior bands. Native-module-authoring engineers command premium; JS-only RN engineers commoditized.',
  },
};

// ── COMPENSATION ADDITIONS ─────────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_QA_FRONTEND_MOBILE: Record<string, Record<string, number>> = {
  qa_automation_engineer: { '0-2': 95_000, '2-5': 118_000, '5-10': 142_000, '10-15': 162_000, '15+': 180_000 },
  performance_test_engineer: { '0-2': 110_000, '2-5': 135_000, '5-10': 160_000, '10-15': 180_000, '15+': 195_000 },
  chaos_qa_engineer: { '0-2': 130_000, '2-5': 165_000, '5-10': 205_000, '10-15': 240_000, '15+': 275_000 },
  mobile_qa_engineer: { '0-2': 95_000, '2-5': 118_000, '5-10': 142_000, '10-15': 165_000, '15+': 185_000 },
  accessibility_engineer: { '0-2': 105_000, '2-5': 135_000, '5-10': 168_000, '10-15': 195_000, '15+': 220_000 },
  frontend_performance_engineer: { '0-2': 130_000, '2-5': 162_000, '5-10': 195_000, '10-15': 222_000, '15+': 245_000 },
  webgl_engineer: { '0-2': 140_000, '2-5': 175_000, '5-10': 215_000, '10-15': 245_000, '15+': 270_000 },
  ios_engineer_senior: { '0-2': 145_000, '2-5': 180_000, '5-10': 225_000, '10-15': 260_000, '15+': 290_000 },
  android_engineer_senior: { '0-2': 142_000, '2-5': 175_000, '5-10': 220_000, '10-15': 255_000, '15+': 285_000 },
  react_native_engineer: { '0-2': 120_000, '2-5': 148_000, '5-10': 178_000, '10-15': 205_000, '15+': 225_000 },
};

// ── NEGOTIATION SCRIPT ADDITIONS ──────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_QA_FRONTEND_MOBILE: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  qa_automation_engineer: {
    strongOpener: 'In the last quarter I authored the Playwright framework that now runs 4,200+ tests in 11 minutes (down from 47 minutes on Selenium), with flaky-test rate dropping from 8.3% to 1.1%. I\'d like to discuss whether my compensation reflects that wall-clock and developer-velocity contribution.',
    leverageContext: 'The test infrastructure I own gates every PR for 6 product teams. A replacement SDET would need 90+ days of ramp on the framework, fixtures, and BrowserStack/CI orchestration. Recruiting market rate for SDETs with my Playwright + TypeScript + CI ownership is currently $155–$180K base.',
    countersScript: 'I\'m requesting a base adjustment to $X, plus a Staff SDET title progression discussion. Alternatively, an equity refresh + test infrastructure platform charter formalizes the scope I already own.',
    walkAwayLine: 'I have two offers in hand from companies that explicitly want SDETs to own their Playwright migration end-to-end — both at $25–35K above my current comp. I\'d prefer to stay if the band aligns.',
  },
  performance_test_engineer: {
    strongOpener: 'The performance budget I implemented in CI has caught 14 regressions before production this year — each one avoidable revenue loss. I\'d like to discuss whether my compensation reflects that revenue-protection role.',
    leverageContext: 'Our analytics team estimates each 100ms of LCP improvement is worth ~$X in conversion. The k6 + Gatling + Lighthouse CI gates I own prevent regressions across 11 services. A replacement would need 4–6 months to rebuild the dashboards, thresholds, and SLO definitions.',
    countersScript: 'I\'m asking for a base adjustment to $X (Staff Performance Engineer band) plus a clearer mandate to drive perf engineering across mobile + backend. I\'ve also benchmarked against Vercel, Cloudflare, and Datadog comp packages.',
    walkAwayLine: 'I\'ve been actively recruited by an observability vendor and a CDN platform — both at $190K+ base with sign-on. I\'d prefer to stay because I\'ve built this performance program from scratch — but the gap needs to close.',
  },
  chaos_qa_engineer: {
    strongOpener: 'The GameDay program I established has shifted 14 reliability gaps from production incidents to staging discoveries — preventing what we estimated as $X in avoided downtime cost. I\'d like to discuss whether my compensation reflects that resilience contribution.',
    leverageContext: 'The Chaos Mesh experiments + Litmus continuous-chaos pipeline I own are unique in our organization. Fewer than 4,000 senior Chaos / Resilience Engineers exist worldwide; Verica, Gremlin, and AWS Resilience Hub teams are recruiting at $220–$280K. My GameDay playbooks are now referenced by 3 other product teams.',
    countersScript: 'I\'m requesting a base adjustment to $X plus a Staff Resilience Engineer title and a formal seat on the incident review committee. I\'d also like resourcing for a quarterly external GameDay led by Gremlin or Verica.',
    walkAwayLine: 'I have active conversations with two observability vendors and a fintech that wants me to own their resilience program end-to-end — at $235K base. I\'d prefer to stay if I can keep building here at market.',
  },
  mobile_qa_engineer: {
    strongOpener: 'The pre-release gate I own has held our App Store rating at 4.7+ and our Play Store crash-free rate above 99.6% for the past 3 quarters. I\'d like to discuss whether my compensation reflects that store-rating and quality-KPI ownership.',
    leverageContext: 'App store rating drops directly impact paid acquisition CAC — a 0.2-star drop in rating typically increases CAC by 18–25%. The Appium + Detox + BrowserStack matrix I built tests on 18 device profiles before every release. A 1-star review surge from a missed crash would cost $X in incremental ad spend.',
    countersScript: 'I\'m requesting a base adjustment to $X plus a Mobile Quality Lead title that formalizes the cross-team release-gate ownership I already exercise. Senior Mobile QA at companies with similar app revenue benchmark at $165–$185K.',
    walkAwayLine: 'I have offers from two consumer mobile companies that explicitly want Mobile QA leads to own their Appium + Firebase Test Lab + Crashlytics gates — at $170K+ base with sign-on. I\'d prefer to stay if compensation aligns.',
  },
  accessibility_engineer: {
    strongOpener: 'In the last 18 months I\'ve reduced our WCAG 2.2 AA violations from 412 to 23, closed 3 inbound ADA Title III demand letters at zero settlement cost, and built an a11y CI gate that prevents regressions. I\'d like to discuss whether my compensation reflects that legal-risk and inclusion contribution.',
    leverageContext: 'A single ADA Title III lawsuit settlement averages $50–$150K (Seyfarth Shaw 2025 report). The IAAP CPACC + WAS certifications I hold place me among fewer than 6,000 certified accessibility engineers in the US. Independent a11y consulting at my level bills $200–$300/hour ($380–$580K full utilization).',
    countersScript: 'I\'m requesting a base adjustment to $X plus a Principal Accessibility Engineer title and a formal seat on the design system governance. I\'d also like budget for an external Deque or Level Access audit annually to validate our internal program.',
    walkAwayLine: 'I have an active conversation with a Fortune 500 retailer post-DOJ-settlement that wants me to lead their accessibility program at $215K base + a consulting carve-out. I\'d prefer to stay if we can match.',
  },
  frontend_performance_engineer: {
    strongOpener: 'The Web Vitals optimization program I led shipped LCP from 3.2s to 1.4s and INP from 340ms to 110ms on our highest-traffic funnel. Analytics estimates this drove $X in incremental annual conversion. I\'d like to discuss whether my compensation reflects that revenue impact.',
    leverageContext: 'The Lighthouse CI + Datadog RUM + Calibre tooling I own prevents perf regressions on every PR across 6 frontend teams. Engineers with my React 19 Server Components + Next.js 15 App Router migration experience are being recruited at $210–$245K by Vercel, Shopify, Cloudflare, and Stripe.',
    countersScript: 'I\'m asking for a base adjustment to $X plus a Staff Frontend Performance title that formalizes the org-wide perf-budget ownership I already drive. Equity refresh aligned to the Staff band is appropriate given the scope.',
    walkAwayLine: 'I have an active offer from a CDN-adjacent platform at $228K base + $130K equity annual — explicitly to own their customer-facing site speed. I\'d prefer to stay because I built this perf program, but the gap needs to close.',
  },
  webgl_engineer: {
    strongOpener: 'The 3D rendering pipeline I architected ships 60fps on Pixel 8 and iPhone 15, with a 70% glTF + KTX2 + Draco payload reduction over the prior implementation. There are fewer than 2,500 engineers worldwide who can ship this — I\'d like to discuss whether my compensation reflects that scarcity.',
    leverageContext: 'WebGL/WebGPU + custom GLSL shader skill is the most AI-resistant frontend specialty — Copilot cannot generate competent shader math. I\'ve contributed PRs to three.js / pmndrs ecosystem and maintain a ShaderToy presence recruiters check directly. Spline, Rive, Figma, and Adobe Firefly Web are recruiting at $230–$290K.',
    countersScript: 'I\'m requesting a base adjustment to $X plus a Staff Graphics Engineer title and a clearer mandate on the WebGPU migration. Equity should reflect that my output is the single largest visual-quality differentiator in the product.',
    walkAwayLine: 'I have an offer from a 3D creative-tool company at $265K base + meaningful equity — for the same work I do here. I\'d prefer to stay if compensation aligns to the global scarcity of this skill.',
  },
  ios_engineer_senior: {
    strongOpener: 'I\'ve shipped 14 production releases this year holding our crash-free user-session rate at 99.78% and contributing to a 4.7 App Store rating. The Vision Pro spatial app I built is in 15K user TestFlight rotation. I\'d like to discuss whether my compensation reflects that App Store track record.',
    leverageContext: 'Senior iOS engineers with a public App Store track record + visionOS / RealityKit experience are scarcer than the broader iOS pool — fewer than 1,200 senior visionOS engineers exist as of Q1 2026. Apple, Snap, Spotify, Robinhood, and Niantic are recruiting in the $240–$300K base range with significant sign-on.',
    countersScript: 'I\'m asking for a base adjustment to $X plus a Staff iOS Engineer title and a refreshed equity grant. I\'d also like a formal mandate to lead the visionOS spatial app roadmap — the area where my skill differential is largest.',
    walkAwayLine: 'I\'ve had two recruiter conversations advance to onsite at $265K+ base — both for visionOS-heavy roles. I\'d prefer to stay if the compensation and scope reflect what the market is paying for senior iOS engineers with shipped Vision Pro work.',
  },
  android_engineer_senior: {
    strongOpener: 'I\'ve shipped 11 production releases this year holding our crash-free user-session rate at 99.71% and ANR rate at 0.18% (well below the 0.47% bad-behavior threshold). The Baseline Profile work I led reduced cold-start time by 28%. I\'d like to discuss whether my compensation reflects that Play Store track record.',
    leverageContext: 'Senior Android engineers with Jetpack Compose + Kotlin 2.0 + KMP experience + Play Vitals ownership are in shortage — Google, Meta, Reddit, Lyft, and Discord are recruiting in the $230–$280K base range. The R8 + Baseline Profile + Macrobenchmark work I own is platform-level expertise.',
    countersScript: 'I\'m requesting a base adjustment to $X plus a Staff Android Engineer title. Equity refresh aligned to the Staff band reflects that the build-pipeline and quality KPIs I own gate every Play Store release.',
    walkAwayLine: 'I have an offer from a competing consumer Android team at $258K base + meaningful equity — explicitly for the Compose + KMP + Vitals work I do here. I\'d prefer to stay if we can align comp to senior Android market rates.',
  },
  react_native_engineer: {
    strongOpener: 'I built the TurboModule native bridge for HealthKit + Health Connect that now powers 40% of our retention features. The EAS Build + EAS Update pipeline I own ships OTA updates to 2.1M users with zero downtime. I\'d like to discuss whether my compensation reflects that native-module and release-pipeline ownership.',
    leverageContext: 'Mid-band React Native engineers are commoditized, but engineers who write native modules in Swift + Kotlin and own the EAS Build pipeline are rare. Meta, Shopify, Microsoft, Discord, Coinbase, and Mercari are recruiting at $190–$220K base for senior RN engineers with native-module authorship.',
    countersScript: 'I\'m asking for a base adjustment to $X plus a Senior or Staff Mobile Platform Engineer title that formalizes the cross-platform infrastructure I already own. Equity refresh aligned to that scope is appropriate.',
    walkAwayLine: 'I have an offer from a fintech that wants me to own their RN platform end-to-end — native modules, EAS pipeline, and Reanimated 3 performance — at $205K base + sign-on. I\'d prefer to stay if compensation aligns to senior cross-platform mobile market rates.',
  },
};
