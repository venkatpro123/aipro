// cloud_platform_actions.ts — v37.0 Multi-Industry Role Intelligence
// Phase 3: Cloud / Platform / Data Engineering specializations (15 roles)

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

// ── CLOUD / PLATFORM / DATA ROLES ─────────────────────────────────────────────

export const ACTION_DB_CLOUD_PLATFORM: Record<string, BracketPool> = {

  kubernetes_engineer: pool(
    {
      title: 'Earn the CKA + CKS Certification Stack Within 90 Days',
      description: 'The Certified Kubernetes Administrator (CKA, $395) plus Certified Kubernetes Security Specialist (CKS, $395) are the highest-leverage credentials for K8s engineers — together they unlock $40,000–$70,000 in salary delta within 12 months. The CKS prerequisite is an active CKA. Use Killer.sh (free with exam voucher) and Mumshad Mannambeth\'s Udemy course as primary prep. Enterprise hiring managers explicitly filter on CKS for any cluster handling regulated workloads (PCI-DSS, HIPAA, FedRAMP). Book your CKA exam this week.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '14 days — register CKA', priority: 'Critical',
    },
    {
      title: 'Lead a Production Multi-Cluster Service Mesh Migration on Your Resume',
      description: 'Mid-level K8s engineers who can document a real Istio, Linkerd, or Cilium service-mesh rollout across 3+ clusters command $30,000–$50,000 over generalist SREs. Propose a service mesh PoC this sprint using Cilium 1.15 (eBPF-native, no sidecars) — it ships mTLS, L7 policy, and Hubble observability out of the box. Document the latency reduction (typically 15–25% vs Envoy sidecar) and present at your next architecture review. This becomes the lead bullet on your resume and the central artifact in your next interview loop.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build and Open-Source a Crossplane Composition or ArgoCD ApplicationSet',
      description: 'Senior K8s engineers differentiate through public GitOps artifacts. Publish a Crossplane Composition (e.g., a Composite Resource that provisions a fully-configured EKS cluster + IRSA + ALB controller + Karpenter in one CR) or an ArgoCD ApplicationSet generator for multi-tenant cluster fleets. This signals platform-engineering maturity that pulls Staff/Principal-level offers at Datadog, Snowflake, Stripe ($280,000–$420,000 TC). Pair with a blog post documenting the design tradeoffs.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Deploy a Karpenter + Spot Instance Cost Optimization Project',
      description: 'Karpenter (AWS) or Cluster Autoscaler with spot pools (GCP/Azure) routinely cuts EKS/GKE compute spend 40–65%. Pick the noisiest workload in your cluster, instrument it with Goldilocks for right-sizing recommendations, then deploy Karpenter NodePools with diversified spot capacity. Document the dollar savings in a 1-page memo to your engineering director. FinOps-fluent K8s engineers are the #1 talent shortage at every cloud-native company — this single project is worth a promotion cycle.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 28, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Subscribe to Kube Weekly + Run a Local Kind Cluster for Continuous Practice',
      description: 'K8s evolves faster than any major platform — quarterly releases ship breaking changes in PSA, gateway-api, and topology spread. Subscribe to KubeWeekly, Last Week in Kubernetes Development (lwkd.info), and CNCF TechTalks. Maintain a local Kind or k3d cluster for hands-on testing of new features before they hit production. Engineers who stay current on Kubernetes 1.30+ features (sidecar containers GA, ValidatingAdmissionPolicy CEL, in-place pod resize) bypass entire interview rounds.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  service_mesh_engineer: pool(
    {
      title: 'Complete Istio Certified Associate (ICA) and Build a Multi-Mesh Federation Demo',
      description: 'The Istio Certified Associate ($250, Linux Foundation) is the only vendor-recognized service mesh credential and is required for senior service-mesh hiring at Solo.io, Tetrate, and Buoyant. Pair certification with a multi-mesh federation demo: connect two clusters via east-west gateway, exchange root CAs via SPIFFE, and demonstrate cross-cluster mTLS. This portfolio piece is the gating artifact for $180,000–$260,000 service-mesh specialist roles.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Migrate One Production Service from Sidecar to Ambient Mesh (Istio) or Cilium eBPF',
      description: 'Ambient mode (Istio 1.22+) and Cilium service mesh eliminate the sidecar tax — typically 200–400Mi memory and 0.1–0.3 CPU per pod. Mid-level engineers who have executed a real sidecar-to-ambient migration are extremely rare. Pick a non-critical namespace, enable ambient mode via waypoint proxies, validate L7 policy parity, and benchmark p99 latency. Document the cluster-wide resource reclaim ($50,000–$200,000/year for a 500-pod fleet) and present to your platform engineering director.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Author a Gateway API + EnvoyFilter Migration Playbook for Your Org',
      description: 'Senior service-mesh engineers are paid to make architectural decisions, not write YAML. Author a 6-page playbook documenting your org\'s migration path from VirtualService/DestinationRule (deprecated soon) to Gateway API + GAMMA. Include traffic splitting, header-based routing, and progressive rollout patterns. Circulate to platform engineering, SRE, and application leads. This becomes your central deliverable in calibration cycles and the proof point in your next Staff/Principal interview.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Instrument Service Mesh with OpenTelemetry + Tempo + Grafana for Full Distributed Tracing',
      description: 'Service-mesh engineers who own end-to-end observability earn $25,000–$45,000 more than mesh-only specialists. Deploy the OpenTelemetry Collector as a DaemonSet, configure W3C trace context propagation across mesh hops, ship spans to Grafana Tempo, and build a SLO dashboard tracking p99 latency per service edge. This combines two of the three highest-demand platform skills (mesh + observability) into a single portfolio narrative.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Join CNCF Istio TOC Slack and Contribute to One Upstream Issue',
      description: 'Upstream contributions to Istio, Linkerd, or Cilium projects (even a docs PR or test fix) are the single most powerful signal for principal-level mesh hiring. Join the cncf-istio Slack, watch the TOC meeting recordings, and pick one good-first-issue from the istio/istio repo. A merged PR makes you searchable on LinkedIn by every recruiter at Solo.io, Tetrate, and Google Cloud Service Mesh.',
      layerFocus: 'L3 · Network', riskReductionPct: 20, deadline: '21 days', priority: 'Medium',
    },
  ),

  observability_engineer: pool(
    {
      title: 'Earn the OpenTelemetry Certified Associate Credential (When GA in 2026)',
      description: 'The CNCF OpenTelemetry Certified Associate is the first vendor-neutral observability credential and is the explicit hiring signal for Honeycomb, Lightstep, Grafana Labs, and Datadog observability platform teams. Pre-register on cncf.io/training and complete the LFS148 course ($299). OTel is now the de-facto standard — engineers without OTel fluency are being phased out of observability roles at scale.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Migrate Your Stack From Application Logs to Structured Events + Tracing',
      description: 'Mid-level observability engineers are paid to kill log volume. Audit your top-10 log producers, replace ad-hoc log lines with OpenTelemetry spans + structured events (Honeycomb-style), and document the cost reduction. Typical 60–80% log volume cut translates to $200,000–$1.2M/year in Datadog/Splunk savings on a mid-size fleet. This is the single highest-ROI observability project and a guaranteed promotion lever.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build an SLO Platform with Sloth + Grafana + AlertManager for Your Top 20 Services',
      description: 'Senior observability engineers own the SLO contract between platform and product teams. Deploy Sloth (slok.dev) to generate Prometheus SLO rules from declarative YAML, wire burn-rate alerts via AlertManager, and present a quarterly SLO health review to engineering leadership. SLO-platform owners are the most protected observability role — they sit at the intersection of reliability, product, and exec reporting.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Become Fluent in eBPF-Based Profiling with Parca / Pyroscope',
      description: 'Continuous profiling is the next frontier — engineers fluent in Parca (CNCF Sandbox) or Pyroscope (Grafana) command $30,000+ premium over traditional APM specialists. Deploy Parca-agent as a DaemonSet, capture CPU profiles across your fleet, and identify your top-5 hot paths. Document the optimization wins. This positions you for the emerging Performance Engineering specialty at companies like Polar Signals, Grafana, and Sentry.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Join the Honeycomb Pollinators Slack + Run a Lunch-and-Learn on Observability 2.0',
      description: 'Charity Majors\' "Observability 2.0" framing (high-cardinality, high-dimensionality, structured events) is now the dominant intellectual current in the space. Join the Honeycomb Pollinators community, attend o11ycon, and run an internal lunch-and-learn translating these ideas for your org. Thought leadership in observability is heavily rewarded — Honeycomb and Lightstep recruit principal-level engineers directly from community contributors.',
      layerFocus: 'L3 · Network', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
    },
  ),

  chaos_engineer: pool(
    {
      title: 'Build a GameDay Program Using Chaos Mesh or LitmusChaos',
      description: 'Junior chaos engineers earn their stripes by running production-safe GameDays. Deploy Chaos Mesh (CNCF Incubating) or LitmusChaos in a staging cluster, design 5 chaos experiments (pod-kill, network-delay, cpu-stress, dns-error, time-skew), and run a monthly GameDay with a service team. Document the bugs found, the SLO violations exposed, and the runbook gaps closed. A 6-month GameDay program log is the strongest junior portfolio piece in chaos engineering.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Lead a Failure Injection Initiative Tied to a Specific SLO Burn-Rate',
      description: 'Mid-level chaos engineers connect chaos to dollars. Pick one high-priority SLO (e.g., checkout 99.9% availability), identify the three most fragile dependencies via dependency mapping, and run targeted failure injections (Gremlin or AWS FIS) on each. Quantify the SLO burn-rate impact and document the resilience gaps closed. This converts chaos engineering from a "fun lab" into a board-reportable reliability program.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Author Your Org\'s Resilience Engineering Playbook',
      description: 'Senior chaos engineers are paid to codify resilience thinking. Author a 10-page playbook covering: pre-mortem methodology, dependency mapping, blast-radius taxonomy, GameDay templates, error-budget governance, and incident-replay protocols. Reference NASA STPA, Westrum culture model, and How Complex Systems Fail (Cook). Distribute via internal eng wiki and present at SRECon or DevOps Enterprise Summit. Resilience leadership positions you for Principal SRE roles at $300,000–$450,000 TC.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Get the AWS Certified Advanced Networking — Specialty Credential',
      description: 'Chaos engineers must understand the network primitives they are perturbing. The AWS Advanced Networking Specialty ($300) covers Transit Gateway, Direct Connect, VPC peering, Route53 failover, and PrivateLink — the exact failure modes you simulate. Pair with deep AZ-failover and region-failover labs. This combination makes you the on-call expert during real incidents, dramatically reducing your layoff exposure.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '60 days', priority: 'High',
    },
    {
      title: 'Subscribe to The Morning Paper + Resilience Roundup Newsletter',
      description: 'Chaos engineering is a research-heavy discipline. Subscribe to Adrian Colyer\'s archive, Lorin Hochstein\'s Resilience Roundup, and the LFI Slack (Learning From Incidents). Read one paper per week — STAMP, FRAM, or any of the post-incident retrospectives published by Adaptive Capacity Labs. This keeps you ahead of the curve and positions you for the small but well-paid resilience research roles at Netflix, Adaptive Capacity Labs, and Jepsen.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  gitops_engineer: pool(
    {
      title: 'Earn the GitOps Certified Associate (Argo) + Build a Multi-Cluster ApplicationSet',
      description: 'The Argo GitOps Certified Associate ($250) is the only vendor-recognized GitOps credential. Pair certification with a real ApplicationSet generator that targets 5+ clusters with PR-driven promotions. Document the deployment frequency improvement (typically 4–6× over Jenkins-based CI/CD). This combination is the gating artifact for $160,000–$240,000 GitOps specialist roles at Akuity, Codefresh, and CNCF-aligned enterprises.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Lead a Migration from Imperative kubectl/Helm to Pure GitOps with Flux or Argo',
      description: 'Mid-level GitOps engineers earn their leverage by killing kubectl in production. Audit your team\'s deploy flow, identify the imperative steps (helm upgrade, kubectl apply, ad-hoc scripts), and replace them with Argo CD Sync Waves + Helm + Kustomize overlays. Enforce via policy: production cluster has only argocd ServiceAccount with write access. Document the audit-trail completeness gain (typically 100% from ~30%) — a SOC 2 / ISO 27001 audit-killer.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build a Progressive Delivery Platform with Argo Rollouts + Flagger',
      description: 'Senior GitOps engineers own the delivery contract. Deploy Argo Rollouts (canary, blue-green) wired to Prometheus AnalysisTemplates that auto-promote based on SLO compliance. Document the change-failure-rate reduction (typically 60–80%) per DORA metrics. Progressive delivery owners are the rarest specialists in platform engineering — they sit at the intersection of GitOps, observability, and SRE, and command $220,000–$320,000 TC.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Implement Policy-as-Code with OPA Gatekeeper or Kyverno in Your GitOps Pipeline',
      description: 'GitOps without policy enforcement is not enterprise-grade. Deploy Kyverno (simpler) or OPA Gatekeeper (more flexible), author 10 policies covering: required labels, image registry allowlist, resource limits, network policy mandatory, no privileged containers. Wire policies into your Argo pre-sync hook. This makes you the security-and-delivery double-threat — extremely promotable.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Follow the CNCF App Delivery TAG + Contribute to Argo or Flux',
      description: 'The CNCF Technical Advisory Group for App Delivery (formerly CDF) sets the direction for GitOps standards. Watch their public meetings, follow the Argo and Flux release notes, and contribute at least one PR (docs, examples, or test) to either project. Upstream contributions are the principal-level signal recruiters use to filter GitOps candidates.',
      layerFocus: 'L3 · Network', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
    },
  ),

  database_reliability_engineer: pool(
    {
      title: 'Earn the AWS Database Specialty + PostgreSQL CDP Credential',
      description: 'Junior DBREs need both cloud-native and Postgres credentials. AWS Certified Database Specialty ($300) covers RDS, Aurora, DynamoDB, ElastiCache, DocumentDB. Pair with the EnterpriseDB Certified PostgreSQL DBA ($250). Together they signal full-stack database competence across managed services and engine internals. Time-to-hire for DBREs averages 60 days — these credentials cut that to 21 days for entry-level roles at $130,000–$170,000.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Lead a Postgres Major-Version Upgrade Using pg_upgrade with Logical Replication Fallback',
      description: 'Mid-level DBREs prove themselves with zero-downtime major version upgrades. Plan and execute a Postgres 14-to-16 upgrade using pglogical or built-in logical replication: stand up the new version, replicate, validate, cutover with < 30s downtime. Document the planning runbook, rollback strategy, and lessons learned. A real production upgrade on your resume opens senior DBRE roles at Stripe, Shopify, and Notion at $200,000–$280,000 TC.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build a Database Observability Stack with pganalyze + Datadog DBM + pg_stat_statements',
      description: 'Senior DBREs own the query-level cost story. Deploy pganalyze ($500–$2,000/mo) or Datadog Database Monitoring, instrument pg_stat_statements + auto_explain, and identify your top-20 query patterns. Document the optimization wins (typically 30–60% query latency reduction on top-10 hot paths). Database performance ownership is the most protected SRE specialty — every company needs it, supply is permanently constrained.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Stand Up a Logical Replication-Based DR Strategy with Cross-Region Failover',
      description: 'Multi-region disaster recovery is the most demanded DBRE skill in 2026. Build a cross-region Postgres DR using logical replication (or Aurora Global Database, Cloud SQL HA, Cosmos DB multi-master). Run a quarterly DR drill with documented RTO/RPO. DBREs who own DR architecture are board-reportable assets — they survive every layoff cycle.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '60 days', priority: 'High',
    },
    {
      title: 'Subscribe to Postgres Weekly + Follow CMU Database Group Lectures',
      description: 'Postgres evolves fast (yearly major releases) and academic database research drives industry practice. Subscribe to Postgres Weekly, watch CMU 15-445 / 15-721 lectures (Andy Pavlo, free on YouTube), and read one paper from CIDR or VLDB per quarter. This positions you for the rare research-flavored DBRE roles at Snowflake, Databricks, and Cockroach Labs.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  data_engineer: pool(
    {
      title: 'Earn the dbt Analytics Engineering Certification + Build a Public dbt Project',
      description: 'The dbt Analytics Engineering Certification ($200) is the highest-leverage credential for modern data engineers — it filters in/out at Snowflake, Databricks, Fivetran, and every data-team-led startup. Pair certification with a public GitHub dbt project against a real-world dataset (e.g., NYC TLC, GA4 BigQuery sample). Include exposures, snapshots, dbt-utils macros, and dbt-elementary observability. This portfolio piece converts junior interviews to offers at $130,000–$170,000.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Migrate One Critical Pipeline from Airflow PythonOperator to a Native Lakehouse Pattern',
      description: 'Mid-level data engineers earn their next bracket by killing brittle Python glue code. Pick one production pipeline still using Airflow PythonOperators, refactor to a native pattern: dbt for transformations, Airbyte/Fivetran for ingestion, Airflow only for orchestration. Document the runtime reduction (typically 40–70%) and the failure-rate drop. This is the canonical "modern data stack" migration story that opens senior data engineering roles at $180,000–$240,000.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build a Streaming Pipeline with Kafka + Flink + Iceberg (or Snowpipe Streaming)',
      description: 'Senior data engineers are paid to move from batch to streaming. Stand up a real streaming pipeline: Kafka ingestion, Flink stateful processing with exactly-once semantics, Iceberg sink with time-travel queries. Alternatively use Snowpipe Streaming + Dynamic Tables for a managed equivalent. Streaming-fluent data engineers are the rarest senior specialists — they command $220,000–$320,000 TC at Confluent, Datadog, Stripe, and Netflix.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Implement Data Contract Enforcement with dbt + Great Expectations + Recce',
      description: 'Data contracts are the next big shift in data engineering. Implement column-level contracts in dbt (model contracts), validation gates via Great Expectations or Soda, and impact analysis via Recce on PRs. Document the data-incident reduction (typically 50–70% in 6 months). Contract-fluent engineers are explicitly recruited by Convoy, Stripe, and Airbnb data platform teams.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Follow the Locally Optimistic Slack + Read Designing Data-Intensive Applications',
      description: 'The Locally Optimistic Slack (locallyoptimistic.com) is the central community for analytics engineering. Pair with Martin Kleppmann\'s Designing Data-Intensive Applications — the gold-standard reference for distributed data systems. These two together give you both the community signal and the depth signal needed for principal-level data engineering hiring at Brooklyn Data, dbt Labs, and Snowflake.',
      layerFocus: 'L3 · Network', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
    },
  ),

  data_platform_engineer: pool(
    {
      title: 'Earn the Databricks Certified Data Engineer Professional Credential',
      description: 'The Databricks Certified Data Engineer Professional ($200) is the most market-signal-rich data platform credential — it filters in at Databricks, Apple, Comcast, JPMorgan, and every Lakehouse-aligned enterprise. Cover Delta Lake internals, Unity Catalog, Photon, and Auto Loader. Combined with a portfolio Delta Lake project, this credential converts entry-level platform interviews to $140,000–$180,000 offers.',
      layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Build a Self-Service Data Platform Using Backstage + dbt Cloud + Datahub',
      description: 'Mid-level data platform engineers build, not just maintain. Deploy a self-service portal using Backstage (Spotify, CNCF) with dbt Cloud API integration for one-click model deploys and DataHub (LinkedIn open-source) for lineage and discovery. Document the time-to-first-pipeline improvement (typically 2 weeks → 2 hours). Self-service platforms are the highest-leverage internal-tooling investment — owning one is a guaranteed promotion path.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Lead a Lakehouse Architecture Migration (Hudi / Iceberg / Delta)',
      description: 'Senior data platform engineers own the architectural decision: Iceberg (most open, AWS-aligned), Delta Lake (Databricks-aligned), or Hudi (Uber/streaming-heavy). Author a decision memo for your org covering catalog (Glue, Unity, Nessie, Polaris), compute interoperability, ACID semantics, and partition evolution. Lead the migration of one critical domain (Bronze → Silver → Gold). Lakehouse architects command $240,000–$340,000 TC at Tabular, Onehouse, Databricks, and Snowflake.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Implement Cost Allocation and FinOps Reporting on Your Data Warehouse',
      description: 'Snowflake/BigQuery/Databricks spend at most companies is now the #1 cloud cost line. Build a per-team, per-pipeline cost attribution dashboard using Snowflake QUERY_HISTORY + warehouse metering or BigQuery INFORMATION_SCHEMA.JOBS_BY_PROJECT. Identify the top 10 highest-cost queries, propose optimizations, and document the savings. FinOps-fluent platform engineers are immediately promoted in the current cost-cutting cycle.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 30, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Subscribe to Joe Reis\' Practical Data Modeling + Chad Sanderson\'s Data Products',
      description: 'Joe Reis (Practical Data Modeling) and Chad Sanderson (Data Products) are the two most influential thinkers in modern data platforms. Subscribe to both substacks, attend their workshops when available, and apply their frameworks (semantic layer, data products, contract enforcement) to your platform. Thought-leadership-aligned platform engineers are recruited directly by Tabular, Onehouse, and Convoy.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  cloud_finops_analyst: pool(
    {
      title: 'Earn the FinOps Certified Practitioner + Build a Cost Anomaly Detection Workflow',
      description: 'The FinOps Certified Practitioner ($350, FinOps Foundation) is the gating credential — every enterprise FinOps role explicitly requires it. Pair certification with a real cost anomaly workflow: ingest AWS Cost and Usage Report (CUR) into Athena or Snowflake, build a Prophet or Anomaly Detector model on per-service daily spend, and alert on > 2-sigma deviations. This combination converts entry-level interviews to $110,000–$140,000 FinOps analyst offers.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Deliver a $1M+ Annualized Cost Savings Initiative and Document It',
      description: 'Mid-level FinOps analysts are measured in dollars saved. Identify the top three savings opportunities — Savings Plans / Reserved Instances, idle resource cleanup, oversized EBS volumes, S3 lifecycle policies — and execute one to delivery. A documented $1M+ annualized savings on your resume is the single strongest signal for senior FinOps roles at $150,000–$200,000 at Apptio, CloudHealth (VMware), Vantage, and CloudZero.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 38, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build a Unit Economics Dashboard Tying Cloud Spend to Business Metrics',
      description: 'Senior FinOps analysts move from "cost reporting" to "unit economics." Build a dashboard showing cost-per-customer, cost-per-transaction, cost-per-pipeline-run. Use AWS CUR + Snowflake/BigQuery cost data + business event data joined in Looker or Tableau. Present a quarterly unit economics review to the CFO and VP Engineering. FinOps analysts who report to the CFO are the most protected role in cloud cost management — they are board-visible, $170,000–$220,000 TC.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 40, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Master a Major FinOps Platform — CloudHealth, Apptio Cloudability, or Vantage',
      description: 'Each enterprise FinOps platform has its own DSL, tagging strategy, and report builder. Pick the one your org uses (or the most popular in your target market — Apptio Cloudability for Fortune 500, Vantage for mid-market) and become the in-house expert. Platform-specific expertise is what differentiates a generalist FinOps analyst from the Lead FinOps role.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Join the FinOps Foundation Slack + Attend FinOps X Conference',
      description: 'The FinOps Foundation Slack (8,000+ members) is the central community. Attend FinOps X (annual conference, San Diego) — recruiters from every Fortune 500 are present. Volunteer for a FinOps Foundation working group (e.g., Container FinOps, AI FinOps). Community visibility is the fastest path to senior FinOps roles.',
      layerFocus: 'L3 · Network', riskReductionPct: 22, deadline: '21 days', priority: 'Medium',
    },
  ),

  edge_computing_engineer: pool(
    {
      title: 'Earn the Cloudflare Certified Developer + Build a Workers/Durable Objects Project',
      description: 'The Cloudflare Certified Developer credential plus a real Workers + Durable Objects + R2 project is the fastest path into edge engineering. Build a stateful edge app (e.g., real-time collab cursor, edge-aware rate limiter) and deploy globally. Edge engineers are extremely rare — Cloudflare, Fastly, Vercel, and Netlify all hire on this exact skill profile at $140,000–$180,000 for early-career roles.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Lead an Edge Migration of One Latency-Sensitive Workload',
      description: 'Mid-level edge engineers prove themselves by migrating a real workload. Pick a latency-sensitive path (auth, A/B test assignment, geo-routing, content personalization) and move it from origin to Cloudflare Workers or Fastly Compute@Edge. Document the p99 latency improvement (typically 200ms → 30ms) and the origin load reduction. This portfolio piece is the explicit hiring artifact for senior edge roles at $190,000–$260,000.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build Expertise in WebAssembly + Wasmtime / Wasmer for Edge Compute',
      description: 'Senior edge engineers must be Wasm-fluent. Wasm is the universal runtime for next-gen edge (Fastly Compute@Edge, Fermyon Spin, Cosmonic). Build a Rust → Wasm component using WIT and deploy on Fastly or Fermyon Cloud. Wasm-fluent engineers are the rarest specialists in the cloud space — they command $250,000–$340,000 at Fastly, Fermyon, Cosmonic, and Cloudflare.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Implement Edge Observability with OpenTelemetry + Logpush + Tail Workers',
      description: 'Edge observability is its own discipline — traditional APM does not work at the edge. Configure Cloudflare Logpush to S3, build Tail Workers for real-time debugging, and emit OpenTelemetry spans from Workers via the otel-cf-workers SDK. Document the time-to-resolution improvement on edge incidents. Edge observability ownership is a fast path to senior roles.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Subscribe to Bytecode Alliance Updates + Follow Edge Computing Twitter',
      description: 'The Bytecode Alliance (Mozilla, Fastly, Microsoft, Intel) drives Wasm Component Model standards. Follow their blog, watch WasmCon talks, and follow leading edge voices (Sunil Pai, Erica Pisani, Steve Klabnik, Lin Clark). Edge computing is too fast-moving for textbooks — community signal is the primary knowledge channel.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  multi_cloud_architect: pool(
    {
      title: 'Earn All Three Tier-1 Cloud Architecture Credentials Within 12 Months',
      description: 'AWS Solutions Architect Professional ($300) + Google Cloud Professional Cloud Architect ($200) + Azure Solutions Architect Expert (AZ-305, $165) — earning all three within 12 months is the gating credential for multi-cloud architect roles at $250,000–$400,000 TC. No other credential combination opens this tier of compensation. Map them out on a 12-month study calendar: AWS first (most market signal), GCP second, Azure third.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '12 months — start AWS now', priority: 'Critical',
    },
    {
      title: 'Lead a Real Multi-Cloud Architecture Decision with a Written Trade-Off Analysis',
      description: 'Mid-level multi-cloud architects deliver decisions, not diagrams. Pick a real architectural choice (e.g., where to run the data warehouse, where to run the ML training fleet, where to put the customer data store) and author a 6-page trade-off analysis covering: cost model, latency, regulatory posture, vendor lock-in, team expertise, exit strategy. Present to engineering leadership. This memo is the single most powerful artifact in your Principal Architect interview loop.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Build a Multi-Cloud Landing Zone with Terraform + Crossplane',
      description: 'Senior multi-cloud architects own the landing zone. Build a Terraform foundation across AWS Control Tower + GCP Organization + Azure Management Groups, then layer Crossplane Compositions for unified provisioning. Document the time-to-new-account reduction (typically 2 weeks → 1 day) and the policy enforcement gain. Landing zone architects are the highest-paid specialists in the cloud space — $300,000–$450,000 TC at HashiCorp, Snowflake, Stripe, and every Fortune 500.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Develop Disaster Recovery Patterns for Cross-Cloud Failover',
      description: 'Cross-cloud DR is the rarest and most valuable multi-cloud skill. Design a real DR architecture: primary in AWS, warm standby in GCP, with cross-cloud replication via DataStream/Pub-Sub/EventBridge bridges. Run a quarterly cross-cloud failover drill. This positions you as the resilience leader for board-level reporting — extremely protected role.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 32, deadline: '90 days', priority: 'High',
    },
    {
      title: 'Subscribe to The New Stack + Read Cloud Native Patterns by Cornelia Davis',
      description: 'The New Stack (thenewstack.io) is the central publication for cloud-native architecture. Pair with Cornelia Davis\' Cloud Native Patterns (Manning) — the gold-standard textbook for cloud architecture. Multi-cloud architects who reference these in design reviews are immediately credible.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: '7 days', priority: 'Medium',
    },
  ),

  aws_solutions_architect: pool(
    {
      title: 'Earn the AWS Solutions Architect Professional Certification This Quarter',
      description: 'The AWS Certified Solutions Architect Professional ($300) is the highest-signal AWS credential — it is explicitly required for senior architect roles at AWS Professional Services, AWS partners (Slalom, Onica, 2nd Watch), and every AWS-aligned enterprise. Pass rate is ~50%, so plan a 12-week study path using Adrian Cantrill\'s course ($40 / lifetime) + Tutorials Dojo practice exams ($15). This credential alone is worth $25,000–$40,000 in salary uplift.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Deliver a Real Well-Architected Framework Review for Your Org',
      description: 'Mid-level AWS SAs prove themselves through real WAFR engagements. Pick one critical workload, run a full Well-Architected Framework review across the six pillars (Operational Excellence, Security, Reliability, Performance, Cost, Sustainability), and deliver a remediation roadmap. AWS WAFR-fluent architects are explicitly preferred at AWS partners and Fortune 500 cloud teams — $190,000–$260,000 TC.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Build a Reference Architecture Library + Publish on AWS Builders Library',
      description: 'Senior AWS architects deliver reusable patterns. Build a curated reference architecture library covering your org\'s top-10 workload patterns (3-tier web, event-driven, batch, ML serving, data lake, etc.) using AWS CDK or Terraform. Publish (with permission) one pattern to AWS Builders Library or your engineering blog. Public AWS thought leadership is the explicit recruiting filter for AWS Principal SA roles at $300,000–$400,000 TC.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Specialize in One AWS Specialty — Security, ML, Networking, or Database',
      description: 'AWS Specialty certifications (Security Specialty, ML Specialty, Advanced Networking, Database Specialty — each $300) are the differentiators above SA Pro. Pick the specialty most relevant to your role and target market. AWS architects with two specialties command 20–30% premium over single-cert peers.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '90 days', priority: 'High',
    },
    {
      title: 'Subscribe to AWS Heroes Blog + Attend AWS re:Invent or AWS Summit',
      description: 'AWS Heroes (heroes.aws) are the community thought leaders — their blogs (Jeremy Daly, Yan Cui, Adrian Hornsby) set the architectural agenda. Attend AWS re:Invent (Las Vegas, December) or a regional Summit. AWS community visibility is the path to AWS Hero status, which is the highest-prestige AWS career signal.',
      layerFocus: 'L3 · Network', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
    },
  ),

  gcp_solutions_architect: pool(
    {
      title: 'Earn the GCP Professional Cloud Architect Certification This Quarter',
      description: 'The Google Cloud Professional Cloud Architect ($200) is the gating credential for GCP-aligned architect roles at Google Cloud Professional Services, GCP partners (SADA, Cloud Ace, DoiT International), and every GCP-aligned enterprise. The exam emphasizes case studies (Mountkirk Games, EHR Healthcare). Use Coursera\'s official GCP path + Whizlabs practice tests. Pass-rate is ~45%, plan a 10-week study path.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Build a Real Anthos or GKE Enterprise Multi-Cluster Project',
      description: 'Mid-level GCP architects differentiate through Anthos / GKE Enterprise fluency. Stand up a multi-cluster GKE Enterprise project: Config Sync for GitOps, Policy Controller for OPA, Service Mesh (managed Istio), and Multi-Cluster Ingress. Document the operational improvement. Anthos-fluent architects are extremely rare and explicitly recruited at $200,000–$280,000.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Lead a BigQuery + Dataform + Looker Modern Data Stack Implementation',
      description: 'Senior GCP architects own data architecture. Lead a BigQuery + Dataform (now part of BigQuery) + Looker implementation: enterprise data warehouse, dbt-equivalent transformations via Dataform, and semantic-layer reporting via Looker (LookML). GCP\'s data stack is the strongest in the cloud — architects fluent here are the most protected in the GCP ecosystem.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Specialize in GCP Vertex AI for ML Architecture Roles',
      description: 'Vertex AI is GCP\'s strongest differentiator. Earn the GCP Professional ML Engineer ($200) and build a real Vertex AI pipeline (Vertex Pipelines, Model Registry, Feature Store, Vertex Endpoints). GCP ML architects are the highest-paid specialty in the GCP ecosystem — $230,000–$320,000 TC at Google Cloud, SADA, DoiT, and AI-aligned enterprises.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'High',
    },
    {
      title: 'Join the Google Cloud Innovators Program + Follow GCP Architecture Center',
      description: 'Google Cloud Innovators (cloud.google.com/innovators) is the official community program — membership unlocks early access to features and direct contact with product teams. Pair with the GCP Architecture Center (cloud.google.com/architecture) — Google\'s curated reference patterns. Innovator-program members are the explicit recruiting pool for Google Cloud customer engineering.',
      layerFocus: 'L3 · Network', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
    },
  ),

  azure_solutions_architect: pool(
    {
      title: 'Earn the Azure Solutions Architect Expert (AZ-305) Within 90 Days',
      description: 'The Microsoft Certified: Azure Solutions Architect Expert (AZ-305, $165) is the gating credential for Azure-aligned architect roles at Microsoft Consulting Services, Microsoft partners (Avanade, Insight, Hitachi Solutions), and every Microsoft-aligned enterprise. AZ-104 (Azure Administrator) is the prerequisite. Use John Savill\'s Azure Master Class on YouTube (free, best-in-class) + MeasureUp practice tests. This certification is non-negotiable for Azure architect hiring.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Lead an Azure Landing Zone Deployment with Microsoft Cloud Adoption Framework',
      description: 'Mid-level Azure architects prove themselves with real CAF Landing Zone deployments. Deploy an enterprise-scale landing zone using Azure Verified Modules (AVM) + Bicep, applying CAF (Cloud Adoption Framework) governance: Management Groups, Azure Policy, Azure Blueprints (now Template Specs), and Defender for Cloud. Document the deployment. CAF-fluent architects are the most protected Azure specialty in 2026.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build a Real Azure OpenAI + Azure AI Foundry Architecture',
      description: 'Senior Azure architects must own the AI architecture story. Build a reference architecture for Azure OpenAI: Private Endpoints, Azure AI Search for RAG, Azure AI Foundry for orchestration, Azure Container Apps for the application layer. Microsoft is investing heavily in this stack — Azure AI architects are recruited at $230,000–$340,000 TC at Microsoft, Avanade, Accenture, and Microsoft-aligned enterprises.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Earn an Azure Specialty — Azure Security Engineer (AZ-500) or Azure Data Engineer (DP-203)',
      description: 'Azure Specialty certifications differentiate above SA Expert. AZ-500 (Security) is the highest-demand specialty in 2026 due to enterprise compliance focus. DP-203 (Data Engineer) opens Synapse / Microsoft Fabric architect roles. Pick one, earn it within 6 months. Two-cert Azure architects command 20–30% premium.',
      layerFocus: 'L3 · Skills', riskReductionPct: 25, deadline: '90 days', priority: 'High',
    },
    {
      title: 'Subscribe to Azure Friday + Follow Microsoft Tech Community',
      description: 'Azure Friday (Scott Hanselman) and the Microsoft Tech Community are the central thought-leadership channels. Pair with John Savill\'s YouTube channel — the most-watched Azure educator. Active community presence opens Microsoft MVP nomination, which is the highest-prestige Azure career signal.',
      layerFocus: 'L3 · Network', riskReductionPct: 18, deadline: '21 days', priority: 'Medium',
    },
  ),

  internal_developer_platform_engineer: pool(
    {
      title: 'Deploy Backstage as Your Internal Developer Portal',
      description: 'Backstage (Spotify, CNCF Incubating) is the de-facto standard internal developer portal. Deploy a Backstage instance with the Software Catalog, TechDocs, and Software Templates plugins. Onboard 5 services and 3 templates (e.g., new microservice, new ML pipeline, new frontend app). Backstage-fluent IDP engineers are explicitly recruited at $150,000–$200,000 for entry-level platform roles at Spotify, HashiCorp, and every CNCF-aligned company.',
      layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Build a Self-Service Provisioning Workflow with Crossplane or Port',
      description: 'Mid-level IDP engineers own self-service provisioning. Build a workflow where a developer files a Backstage form (or Port action) and a Crossplane Composition provisions: AWS RDS instance, IAM role with IRSA, secrets in External Secrets Operator, and a sample app deployment. Document the time-to-first-deploy improvement (typically 3 weeks → 30 minutes). This is the canonical "platform as product" deliverable.',
      layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Run a Developer Experience Survey and Publish a Quarterly Platform Roadmap',
      description: 'Senior IDP engineers treat developers as customers. Run a quarterly DX survey (SPACE framework or DORA-aligned), measure cognitive load, deployment frequency, and time-to-first-PR. Publish a quarterly platform roadmap with documented OKRs. IDP leaders who report DX metrics to engineering leadership are the most protected platform role — they directly impact engineering productivity, which is board-visible.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Implement Platform Engineering DORA + SPACE Metrics Dashboards',
      description: 'Instrument your platform with DORA metrics (deployment frequency, lead time, change failure rate, MTTR) using Sleuth, LinearB, or DX. Pair with SPACE framework qualitative measures (satisfaction, performance, activity, collaboration, efficiency). IDP engineers fluent in DORA/SPACE are explicitly recruited at HashiCorp, Spotify, and every platform-engineering-led enterprise at $200,000–$280,000.',
      layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Subscribe to PlatformEngineering.org + Read Team Topologies',
      description: 'PlatformEngineering.org is the central community for IDP practitioners — join the Slack and attend PlatformCon (annual, free, online). Pair with Team Topologies (Matthew Skelton, Manuel Pais) — the foundational text on platform team design. These two together provide both the community signal and the depth signal for principal IDP roles.',
      layerFocus: 'L3 · Network', riskReductionPct: 20, deadline: '21 days', priority: 'Medium',
    },
  ),

};

// ── ALIAS ADDITIONS ───────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_CLOUD_PLATFORM: Record<string, { canonicalKey: string; displayRole: string }> = {
  // Kubernetes Engineer variants
  'kubernetes engineer': { canonicalKey: 'kubernetes_engineer', displayRole: 'Kubernetes Engineer' },
  'k8s engineer': { canonicalKey: 'kubernetes_engineer', displayRole: 'Kubernetes (K8s) Engineer' },
  'kubernetes administrator': { canonicalKey: 'kubernetes_engineer', displayRole: 'Kubernetes Administrator' },
  'k8s administrator': { canonicalKey: 'kubernetes_engineer', displayRole: 'K8s Administrator' },
  'cluster engineer': { canonicalKey: 'kubernetes_engineer', displayRole: 'Cluster Engineer' },
  'container platform engineer': { canonicalKey: 'kubernetes_engineer', displayRole: 'Container Platform Engineer' },
  'kubernetes specialist': { canonicalKey: 'kubernetes_engineer', displayRole: 'Kubernetes Specialist' },

  // Service Mesh Engineer variants
  'service mesh engineer': { canonicalKey: 'service_mesh_engineer', displayRole: 'Service Mesh Engineer' },
  'istio engineer': { canonicalKey: 'service_mesh_engineer', displayRole: 'Istio Engineer' },
  'linkerd engineer': { canonicalKey: 'service_mesh_engineer', displayRole: 'Linkerd Engineer' },
  'cilium engineer': { canonicalKey: 'service_mesh_engineer', displayRole: 'Cilium Engineer' },
  'service mesh architect': { canonicalKey: 'service_mesh_engineer', displayRole: 'Service Mesh Architect' },
  'mesh specialist': { canonicalKey: 'service_mesh_engineer', displayRole: 'Service Mesh Specialist' },

  // Observability Engineer variants
  'observability engineer': { canonicalKey: 'observability_engineer', displayRole: 'Observability Engineer' },
  'o11y engineer': { canonicalKey: 'observability_engineer', displayRole: 'Observability (o11y) Engineer' },
  'monitoring engineer': { canonicalKey: 'observability_engineer', displayRole: 'Monitoring Engineer' },
  'telemetry engineer': { canonicalKey: 'observability_engineer', displayRole: 'Telemetry Engineer' },
  'apm engineer': { canonicalKey: 'observability_engineer', displayRole: 'APM Engineer' },
  'opentelemetry engineer': { canonicalKey: 'observability_engineer', displayRole: 'OpenTelemetry Engineer' },
  'sre observability': { canonicalKey: 'observability_engineer', displayRole: 'SRE — Observability' },

  // Chaos Engineer variants
  'chaos engineer': { canonicalKey: 'chaos_engineer', displayRole: 'Chaos Engineer' },
  'resilience engineer': { canonicalKey: 'chaos_engineer', displayRole: 'Resilience Engineer' },
  'reliability engineer chaos': { canonicalKey: 'chaos_engineer', displayRole: 'Reliability Engineer (Chaos)' },
  'failure testing engineer': { canonicalKey: 'chaos_engineer', displayRole: 'Failure Testing Engineer' },
  'chaos engineering specialist': { canonicalKey: 'chaos_engineer', displayRole: 'Chaos Engineering Specialist' },

  // GitOps Engineer variants
  'gitops engineer': { canonicalKey: 'gitops_engineer', displayRole: 'GitOps Engineer' },
  'argocd engineer': { canonicalKey: 'gitops_engineer', displayRole: 'Argo CD Engineer' },
  'flux engineer': { canonicalKey: 'gitops_engineer', displayRole: 'Flux Engineer' },
  'continuous delivery engineer': { canonicalKey: 'gitops_engineer', displayRole: 'Continuous Delivery Engineer' },
  'cd engineer': { canonicalKey: 'gitops_engineer', displayRole: 'CD Engineer' },
  'gitops specialist': { canonicalKey: 'gitops_engineer', displayRole: 'GitOps Specialist' },

  // Database Reliability Engineer variants
  'database reliability engineer': { canonicalKey: 'database_reliability_engineer', displayRole: 'Database Reliability Engineer (DBRE)' },
  'dbre': { canonicalKey: 'database_reliability_engineer', displayRole: 'Database Reliability Engineer (DBRE)' },
  'database engineer': { canonicalKey: 'database_reliability_engineer', displayRole: 'Database Engineer' },
  'database sre': { canonicalKey: 'database_reliability_engineer', displayRole: 'Database SRE' },
  'postgres dba': { canonicalKey: 'database_reliability_engineer', displayRole: 'Postgres DBA' },
  // v40.0 FIX-TEST-1: Removed 'database administrator' and 'dba' overrides that
  // were silently shadowing the base alias map (which routes "Database Administrator"
  // → sw_dba, the canonical traditional DBA role). Users typing "Database Administrator"
  // expect classic DBA actions, not SRE-style reliability actions. The specific
  // 'database sre' and 'postgres dba' aliases above remain for users who explicitly
  // describe themselves as reliability-focused. The 'database reliability engineer'
  // alias at line 492 already covers the explicit DBRE case.

  // Data Engineer variants
  'data engineer': { canonicalKey: 'data_engineer', displayRole: 'Data Engineer' },
  // 'analytics engineer' / 'dbt engineer' route to the dedicated analytics_engineer
  // canonical key (own ACTION_DB pool in actionPersonalizationEngine.ts) — this
  // module previously shadowed the correct base roleResolution.ts mapping with
  // 'data_engineer', making the analytics_engineer pool unreachable by title.
  'analytics engineer': { canonicalKey: 'analytics_engineer', displayRole: 'Analytics Engineer' },
  'etl engineer': { canonicalKey: 'data_engineer', displayRole: 'ETL Engineer' },
  'elt engineer': { canonicalKey: 'data_engineer', displayRole: 'ELT Engineer' },
  'data pipeline engineer': { canonicalKey: 'data_engineer', displayRole: 'Data Pipeline Engineer' },
  'dbt engineer': { canonicalKey: 'analytics_engineer', displayRole: 'dbt Engineer' },
  'snowflake engineer': { canonicalKey: 'data_engineer', displayRole: 'Snowflake Engineer' },

  // Data Platform Engineer variants
  'data platform engineer': { canonicalKey: 'data_platform_engineer', displayRole: 'Data Platform Engineer' },
  'lakehouse engineer': { canonicalKey: 'data_platform_engineer', displayRole: 'Lakehouse Engineer' },
  'data infrastructure engineer': { canonicalKey: 'data_platform_engineer', displayRole: 'Data Infrastructure Engineer' },
  'data platform architect': { canonicalKey: 'data_platform_engineer', displayRole: 'Data Platform Architect' },
  'databricks engineer': { canonicalKey: 'data_platform_engineer', displayRole: 'Databricks Engineer' },

  // FinOps variants
  'cloud finops analyst': { canonicalKey: 'cloud_finops_analyst', displayRole: 'Cloud FinOps Analyst' },
  'finops analyst': { canonicalKey: 'cloud_finops_analyst', displayRole: 'FinOps Analyst' },
  'cloud cost analyst': { canonicalKey: 'cloud_finops_analyst', displayRole: 'Cloud Cost Analyst' },
  'cloud financial analyst': { canonicalKey: 'cloud_finops_analyst', displayRole: 'Cloud Financial Analyst' },
  'cloud cost engineer': { canonicalKey: 'cloud_finops_analyst', displayRole: 'Cloud Cost Engineer' },
  'finops engineer': { canonicalKey: 'cloud_finops_analyst', displayRole: 'FinOps Engineer' },
  'finops practitioner': { canonicalKey: 'cloud_finops_analyst', displayRole: 'FinOps Practitioner' },

  // Edge Computing variants
  'edge computing engineer': { canonicalKey: 'edge_computing_engineer', displayRole: 'Edge Computing Engineer' },
  'edge engineer': { canonicalKey: 'edge_computing_engineer', displayRole: 'Edge Engineer' },
  'cloudflare workers engineer': { canonicalKey: 'edge_computing_engineer', displayRole: 'Cloudflare Workers Engineer' },
  'cdn engineer': { canonicalKey: 'edge_computing_engineer', displayRole: 'CDN Engineer' },
  'wasm engineer': { canonicalKey: 'edge_computing_engineer', displayRole: 'WebAssembly Engineer' },

  // Multi-Cloud variants
  'multi cloud architect': { canonicalKey: 'multi_cloud_architect', displayRole: 'Multi-Cloud Architect' },
  'multi-cloud architect': { canonicalKey: 'multi_cloud_architect', displayRole: 'Multi-Cloud Architect' },
  'hybrid cloud architect': { canonicalKey: 'multi_cloud_architect', displayRole: 'Hybrid Cloud Architect' },
  'enterprise cloud architect': { canonicalKey: 'multi_cloud_architect', displayRole: 'Enterprise Cloud Architect' },
  'principal cloud architect': { canonicalKey: 'multi_cloud_architect', displayRole: 'Principal Cloud Architect' },
  'chief cloud architect': { canonicalKey: 'multi_cloud_architect', displayRole: 'Chief Cloud Architect' },

  // AWS Solutions Architect variants
  'aws solutions architect': { canonicalKey: 'aws_solutions_architect', displayRole: 'AWS Solutions Architect' },
  'aws architect': { canonicalKey: 'aws_solutions_architect', displayRole: 'AWS Architect' },
  'aws cloud architect': { canonicalKey: 'aws_solutions_architect', displayRole: 'AWS Cloud Architect' },
  'amazon web services architect': { canonicalKey: 'aws_solutions_architect', displayRole: 'AWS Architect' },
  'aws sa': { canonicalKey: 'aws_solutions_architect', displayRole: 'AWS Solutions Architect' },

  // GCP Solutions Architect variants
  'gcp solutions architect': { canonicalKey: 'gcp_solutions_architect', displayRole: 'GCP Solutions Architect' },
  'gcp architect': { canonicalKey: 'gcp_solutions_architect', displayRole: 'GCP Architect' },
  'google cloud architect': { canonicalKey: 'gcp_solutions_architect', displayRole: 'Google Cloud Architect' },
  'google cloud platform architect': { canonicalKey: 'gcp_solutions_architect', displayRole: 'Google Cloud Platform Architect' },

  // Azure Solutions Architect variants
  'azure solutions architect': { canonicalKey: 'azure_solutions_architect', displayRole: 'Azure Solutions Architect' },
  'azure architect': { canonicalKey: 'azure_solutions_architect', displayRole: 'Azure Architect' },
  'microsoft azure architect': { canonicalKey: 'azure_solutions_architect', displayRole: 'Microsoft Azure Architect' },
  'azure cloud architect': { canonicalKey: 'azure_solutions_architect', displayRole: 'Azure Cloud Architect' },

  // IDP variants
  'internal developer platform engineer': { canonicalKey: 'internal_developer_platform_engineer', displayRole: 'Internal Developer Platform Engineer' },
  // v40.0 FIX-TEST-2: Removed 'platform engineer' override that was shadowing the
  // base alias map (which routes "Platform Engineer" → platform_engineer, the
  // canonical group). The IDP-specific roles below ('idp engineer', 'backstage
  // engineer', 'developer experience engineer') remain for users who explicitly
  // identify with the internal developer platform niche.
  'idp engineer': { canonicalKey: 'internal_developer_platform_engineer', displayRole: 'IDP Engineer' },
  'developer experience engineer': { canonicalKey: 'internal_developer_platform_engineer', displayRole: 'Developer Experience (DX) Engineer' },
  'dx engineer': { canonicalKey: 'internal_developer_platform_engineer', displayRole: 'DX Engineer' },
  'backstage engineer': { canonicalKey: 'internal_developer_platform_engineer', displayRole: 'Backstage Engineer' },
  'platform product engineer': { canonicalKey: 'internal_developer_platform_engineer', displayRole: 'Platform Product Engineer' },
};

// ── CANONICAL → ACTION GROUP ADDITIONS ────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_CLOUD_PLATFORM: Record<string, string> = {
  kubernetes_engineer: 'kubernetes_engineer',
  service_mesh_engineer: 'service_mesh_engineer',
  observability_engineer: 'observability_engineer',
  chaos_engineer: 'chaos_engineer',
  gitops_engineer: 'gitops_engineer',
  database_reliability_engineer: 'database_reliability_engineer',
  data_engineer: 'data_engineer',
  data_platform_engineer: 'data_platform_engineer',
  cloud_finops_analyst: 'cloud_finops_analyst',
  edge_computing_engineer: 'edge_computing_engineer',
  multi_cloud_architect: 'multi_cloud_architect',
  aws_solutions_architect: 'aws_solutions_architect',
  gcp_solutions_architect: 'gcp_solutions_architect',
  azure_solutions_architect: 'azure_solutions_architect',
  internal_developer_platform_engineer: 'internal_developer_platform_engineer',
};

// ── DEMAND ADDITIONS ──────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_CLOUD_PLATFORM: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  kubernetes_engineer: {
    roleKey: 'kubernetes_engineer', roleName: 'Kubernetes Engineer',
    demandIndex: 86, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 24,
    topHiringLocations: ['San Francisco CA', 'Seattle WA', 'New York NY', 'Austin TX', 'Remote US'],
    aiSubstitutionRisk: 0.15, dataQuarter: '2026-Q1',
    calibrationNote: 'Acute K8s talent shortage; every Fortune 500 has K8s in production. AI assists with YAML but architecture remains human.',
  },
  service_mesh_engineer: {
    roleKey: 'service_mesh_engineer', roleName: 'Service Mesh Engineer',
    demandIndex: 78, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 65, yoyJobOpeningsChange: 18,
    topHiringLocations: ['San Francisco CA', 'Seattle WA', 'Austin TX', 'Boston MA', 'Remote US'],
    aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1',
    calibrationNote: 'Narrow specialty; explicit hiring at Solo.io, Tetrate, Buoyant + enterprise cloud-native teams. Limited supply.',
  },
  observability_engineer: {
    roleKey: 'observability_engineer', roleName: 'Observability Engineer',
    demandIndex: 82, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 50, yoyJobOpeningsChange: 22,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Austin TX', 'Remote US'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'OpenTelemetry adoption surging; cost-driven migration from APM SaaS creating in-house observability roles.',
  },
  chaos_engineer: {
    roleKey: 'chaos_engineer', roleName: 'Chaos Engineer',
    demandIndex: 72, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 72, yoyJobOpeningsChange: 15,
    topHiringLocations: ['San Francisco CA', 'Seattle WA', 'New York NY', 'Remote US', 'London UK'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'Niche but well-paid specialty; explicitly hired at Netflix, Stripe, Datadog, Gremlin. Hard-to-hire role.',
  },
  gitops_engineer: {
    roleKey: 'gitops_engineer', roleName: 'GitOps Engineer',
    demandIndex: 79, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 52, yoyJobOpeningsChange: 19,
    topHiringLocations: ['San Francisco CA', 'Seattle WA', 'Austin TX', 'Boston MA', 'Remote US'],
    aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1',
    calibrationNote: 'Argo CD + Flux now standard; SOC 2 / FedRAMP audits driving GitOps adoption. Strong enterprise demand.',
  },
  database_reliability_engineer: {
    roleKey: 'database_reliability_engineer', roleName: 'Database Reliability Engineer (DBRE)',
    demandIndex: 76, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 68, yoyJobOpeningsChange: 14,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Austin TX', 'Remote US'],
    aiSubstitutionRisk: 0.13, dataQuarter: '2026-Q1',
    calibrationNote: 'Permanent supply constraint; DBRE skills require years of Postgres/MySQL internals depth. AI assists but cannot replace.',
  },
  data_engineer: {
    roleKey: 'data_engineer', roleName: 'Data Engineer',
    demandIndex: 84, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 48, yoyJobOpeningsChange: 21,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Austin TX', 'Remote US'],
    aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1',
    calibrationNote: 'dbt + modern data stack expansion; LLMs accelerate SQL/Python authoring but architecture and contracts remain human.',
  },
  data_platform_engineer: {
    roleKey: 'data_platform_engineer', roleName: 'Data Platform Engineer',
    demandIndex: 80, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 58, yoyJobOpeningsChange: 18,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Austin TX', 'Remote US'],
    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1',
    calibrationNote: 'Lakehouse architecture race (Iceberg vs Delta vs Hudi) creating dedicated platform roles. High leverage, low supply.',
  },
  cloud_finops_analyst: {
    roleKey: 'cloud_finops_analyst', roleName: 'Cloud FinOps Analyst',
    demandIndex: 87, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 45, yoyJobOpeningsChange: 32,
    topHiringLocations: ['New York NY', 'San Francisco CA', 'Seattle WA', 'Atlanta GA', 'Remote US'],
    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1',
    calibrationNote: 'Acute shortage; 2024-2026 cost-cutting cycle making FinOps a board-level priority. Every CFO is hiring.',
  },
  edge_computing_engineer: {
    roleKey: 'edge_computing_engineer', roleName: 'Edge Computing Engineer',
    demandIndex: 75, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 60, yoyJobOpeningsChange: 22,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Austin TX', 'Remote US', 'London UK'],
    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1',
    calibrationNote: 'Cloudflare/Fastly/Vercel expansion + Wasm Component Model maturity. Narrow but well-paid frontier specialty.',
  },
  multi_cloud_architect: {
    roleKey: 'multi_cloud_architect', roleName: 'Multi-Cloud Architect',
    demandIndex: 83, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 85, yoyJobOpeningsChange: 17,
    topHiringLocations: ['New York NY', 'San Francisco CA', 'Seattle WA', 'Chicago IL', 'Remote US'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'Regulatory diversification + vendor-lock-in concerns driving multi-cloud strategy at Fortune 500. Very hard-to-hire.',
  },
  aws_solutions_architect: {
    roleKey: 'aws_solutions_architect', roleName: 'AWS Solutions Architect',
    demandIndex: 81, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 50, yoyJobOpeningsChange: 16,
    topHiringLocations: ['Seattle WA', 'San Francisco CA', 'Northern Virginia', 'New York NY', 'Remote US'],
    aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1',
    calibrationNote: 'AWS remains dominant cloud (~32% market share); architect demand stable+rising across AWS partners and enterprises.',
  },
  gcp_solutions_architect: {
    roleKey: 'gcp_solutions_architect', roleName: 'GCP Solutions Architect',
    demandIndex: 77, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 60, yoyJobOpeningsChange: 19,
    topHiringLocations: ['Mountain View CA', 'San Francisco CA', 'Seattle WA', 'New York NY', 'Remote US'],
    aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1',
    calibrationNote: 'GCP growth accelerating (Vertex AI, BigQuery dominance); supply of GCP-deep architects lags AWS by 3-5x.',
  },
  azure_solutions_architect: {
    roleKey: 'azure_solutions_architect', roleName: 'Azure Solutions Architect',
    demandIndex: 79, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 18,
    topHiringLocations: ['Redmond WA', 'New York NY', 'Chicago IL', 'Dallas TX', 'Remote US'],
    aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1',
    calibrationNote: 'Azure adoption strong in regulated industries (finance, healthcare, government); Azure AI tailwind from OpenAI partnership.',
  },
  internal_developer_platform_engineer: {
    roleKey: 'internal_developer_platform_engineer', roleName: 'Internal Developer Platform Engineer',
    demandIndex: 82, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 25,
    topHiringLocations: ['San Francisco CA', 'Seattle WA', 'New York NY', 'Austin TX', 'Remote US'],
    aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1',
    calibrationNote: 'Platform engineering replacing DevOps as the discipline; explicit IDP hiring at Spotify, HashiCorp, Humanitec, Port.',
  },
};

// ── COMPENSATION ADDITIONS ─────────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_CLOUD_PLATFORM: Record<string, Record<string, number>> = {
  kubernetes_engineer: { '0-2': 140_000, '2-5': 170_000, '5-10': 205_000, '10-15': 235_000, '15+': 260_000 },
  service_mesh_engineer: { '0-2': 150_000, '2-5': 185_000, '5-10': 225_000, '10-15': 260_000, '15+': 290_000 },
  observability_engineer: { '0-2': 135_000, '2-5': 165_000, '5-10': 200_000, '10-15': 235_000, '15+': 260_000 },
  chaos_engineer: { '0-2': 140_000, '2-5': 175_000, '5-10': 215_000, '10-15': 255_000, '15+': 290_000 },
  gitops_engineer: { '0-2': 135_000, '2-5': 165_000, '5-10': 200_000, '10-15': 230_000, '15+': 255_000 },
  database_reliability_engineer: { '0-2': 145_000, '2-5': 180_000, '5-10': 220_000, '10-15': 260_000, '15+': 295_000 },
  data_engineer: { '0-2': 130_000, '2-5': 160_000, '5-10': 195_000, '10-15': 225_000, '15+': 245_000 },
  data_platform_engineer: { '0-2': 145_000, '2-5': 180_000, '5-10': 220_000, '10-15': 255_000, '15+': 285_000 },
  cloud_finops_analyst: { '0-2': 110_000, '2-5': 135_000, '5-10': 160_000, '10-15': 178_000, '15+': 195_000 },
  edge_computing_engineer: { '0-2': 140_000, '2-5': 175_000, '5-10': 215_000, '10-15': 255_000, '15+': 290_000 },
  multi_cloud_architect: { '0-2': 180_000, '2-5': 220_000, '5-10': 265_000, '10-15': 305_000, '15+': 345_000 },
  aws_solutions_architect: { '0-2': 155_000, '2-5': 190_000, '5-10': 230_000, '10-15': 270_000, '15+': 305_000 },
  gcp_solutions_architect: { '0-2': 155_000, '2-5': 190_000, '5-10': 230_000, '10-15': 270_000, '15+': 305_000 },
  azure_solutions_architect: { '0-2': 150_000, '2-5': 185_000, '5-10': 225_000, '10-15': 265_000, '15+': 295_000 },
  internal_developer_platform_engineer: { '0-2': 150_000, '2-5': 185_000, '5-10': 225_000, '10-15': 260_000, '15+': 290_000 },
};

// ── NEGOTIATION SCRIPT ADDITIONS ──────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_CLOUD_PLATFORM: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  kubernetes_engineer: {
    strongOpener: 'I\'d like to discuss my compensation in the context of the production K8s footprint I currently own: $X clusters, $Y nodes, $Z critical workloads — and the on-call burden that comes with it.',
    leverageContext: 'CKA + CKS engineers with my production experience are receiving offers at $190,000–$240,000 from Datadog, Snowflake, and Stripe. The Karpenter migration I led last quarter saved this org $X annually — a documented business outcome.',
    countersScript: 'I\'m requesting a base adjustment to $X plus an on-call differential of $1,500/month for primary on-call weeks. I\'d also like clarity on the path to Staff Engineer and the criteria for promotion.',
    walkAwayLine: 'I have two active interview loops at competing cloud-native companies. I\'d prefer to stay given my context on our cluster architecture, but the compensation gap is significant enough to require resolution.',
  },
  service_mesh_engineer: {
    strongOpener: 'I\'m one of fewer than 200 engineers globally with production Istio + Cilium dual expertise. I\'d like to discuss compensation aligned with that scarcity and the recent ambient-mesh migration outcomes.',
    leverageContext: 'My ambient mesh migration reclaimed $X in sidecar resource cost annually and reduced p99 service-edge latency by 22%. Solo.io and Tetrate are actively recruiting principal-level mesh engineers at $280,000–$340,000 TC.',
    countersScript: 'I\'m requesting a total comp adjustment to $X with a meaningful equity refresh. I\'d also like designation as the technical owner of service mesh strategy — that title clarification matters for my external market positioning.',
    walkAwayLine: 'I\'ve been approached by Tetrate and Solo.io directly. I\'m committed to this team\'s mesh roadmap, but I need compensation that reflects what specialists at my level command in the broader market.',
  },
  observability_engineer: {
    strongOpener: 'The OpenTelemetry migration I led has cut our Datadog spend by $X annually while improving incident MTTR by Y%. I\'d like to discuss compensation aligned with that delivered cost-and-reliability impact.',
    leverageContext: 'Honeycomb, Grafana Labs, and Chronosphere are explicitly recruiting OTel-fluent engineers at $200,000–$260,000. My SLO platform deployment is the kind of artifact that converts immediately into an outside offer.',
    countersScript: 'I\'m asking for a base adjustment to $X and a documented commitment to fund my conference attendance (KubeCon, o11ycon) — community visibility is part of how I maintain depth in this space.',
    walkAwayLine: 'I have early conversations with Grafana Labs and Chronosphere recruiters. I\'d prefer to keep building here, but the compensation gap matters.',
  },
  database_reliability_engineer: {
    strongOpener: 'The Postgres major-version upgrade I executed with zero customer-visible downtime is the kind of work that carries irreversible value. I\'d like to discuss compensation aligned with that contribution.',
    leverageContext: 'Production DBREs with my Postgres internals depth and proven DR architecture are commanding $230,000–$290,000 at Stripe, Notion, and Shopify. My pganalyze optimization work cut our top-10 query cost by $X.',
    countersScript: 'I\'m requesting a base adjustment to $X and an additional on-call differential reflecting the 24/7 nature of database incident response. I\'d also like a clear staff-engineer promotion timeline.',
    walkAwayLine: 'Database talent is permanently constrained — my LinkedIn inbox proves it. I value our team, but I need the compensation to reflect market reality for DBREs with production major-upgrade experience.',
  },
  data_engineer: {
    strongOpener: 'The streaming pipeline I built has unlocked $X in real-time use cases and reduced batch latency by Y hours. I\'d like to discuss compensation aligned with that delivered business impact.',
    leverageContext: 'Senior data engineers with Kafka + Flink + Iceberg production experience are receiving offers at $200,000–$260,000 from Confluent, Stripe, and Netflix. dbt + streaming together is the rarest profile in the market.',
    countersScript: 'I\'m asking for a base increase to $X plus a Snowflake compute budget that lets me prototype freely — that operational autonomy is part of the role definition I\'m requesting.',
    walkAwayLine: 'I\'ve had active conversations with Confluent and Stripe. I\'m open to staying because I believe in our data roadmap, but the gap must be addressed.',
  },
  data_platform_engineer: {
    strongOpener: 'The lakehouse migration I led established our Iceberg foundation and unlocked cross-tool interoperability. I\'d like to discuss compensation aligned with that architectural contribution.',
    leverageContext: 'Tabular, Onehouse, and Databricks are aggressively hiring lakehouse architects at $240,000–$320,000 TC. My Backstage self-service portal cut our team\'s time-to-first-pipeline from 3 weeks to 2 hours.',
    countersScript: 'I\'m requesting a total comp adjustment to $X including equity refresh. I\'d also like designation as the technical lead for our data platform — that title supports both my external positioning and internal decision authority.',
    walkAwayLine: 'I\'ve had introductory conversations with Tabular and Onehouse. The market for lakehouse-fluent platform engineers is unusually tight — I expect the compensation discussion to reflect that.',
  },
  cloud_finops_analyst: {
    strongOpener: 'My FinOps initiatives have delivered $X in documented annualized savings this year. I\'d like to discuss compensation that reflects that direct cost-reduction impact.',
    leverageContext: 'Senior FinOps analysts with $1M+ savings track records are commanding $170,000–$220,000 at Apptio, CloudHealth (VMware), Vantage, and CloudZero. Every Fortune 500 CFO is hiring FinOps right now — supply is acute.',
    countersScript: 'I\'m asking for a base adjustment to $X plus a performance bonus tied to documented cost savings delivered — that bonus structure aligns my compensation with the value I create.',
    walkAwayLine: 'I have active recruiter conversations with Vantage and CloudZero. I\'d prefer to stay given my context on our cloud spend, but the compensation gap is large.',
  },
  multi_cloud_architect: {
    strongOpener: 'I currently hold all three Tier-1 cloud architecture credentials and own our multi-cloud landing zone strategy. I\'d like to discuss compensation aligned with that scope.',
    leverageContext: 'Multi-cloud architects with AWS Pro + GCP PCA + Azure Expert and real cross-cloud DR experience are receiving offers at $300,000–$420,000 TC at HashiCorp, Snowflake, Stripe, and Fortune 500 enterprise cloud teams.',
    countersScript: 'I\'m requesting a total compensation adjustment to $X including a meaningful equity refresh. I\'d also like a clear path to Distinguished Engineer or Principal Architect within 18 months.',
    walkAwayLine: 'I have offers from two Fortune 500 cloud teams at the $350,000+ TC range. I\'m committed to our architecture roadmap, but I cannot leave market value on the table indefinitely.',
  },
  aws_solutions_architect: {
    strongOpener: 'I hold the AWS Solutions Architect Professional plus the Security Specialty and have delivered N Well-Architected Reviews this year. I\'d like to discuss compensation aligned with that scope.',
    leverageContext: 'AWS Pro + Specialty SAs with real WAFR experience are commanding $220,000–$290,000 at AWS Professional Services, Slalom, and Onica. My reference architecture library has become the de-facto standard for net-new workloads.',
    countersScript: 'I\'m asking for a base adjustment to $X plus AWS re:Invent attendance and time to pursue the third Specialty certification — both of which strengthen my contribution back to this team.',
    walkAwayLine: 'I\'ve had recent recruiter contact from Slalom and AWS Professional Services. The AWS architect market is heated — I\'m hoping we can resolve this internally.',
  },
  internal_developer_platform_engineer: {
    strongOpener: 'The Backstage portal and Crossplane self-service workflow I built cut our org-wide time-to-first-deploy from 3 weeks to 30 minutes — a documented productivity win across N engineering teams.',
    leverageContext: 'Platform engineers with Backstage + Crossplane production experience and proven DORA metric ownership are commanding $220,000–$290,000 at Spotify, HashiCorp, Humanitec, and Port. Platform engineering is the discipline replacing DevOps — supply is tight.',
    countersScript: 'I\'m requesting a base adjustment to $X plus a clear designation as the technical owner of our internal developer platform. PlatformCon attendance funding would also support my continued depth in this space.',
    walkAwayLine: 'I\'ve been in early conversations with Humanitec and Port. I believe in our platform roadmap, but the compensation needs to reflect the rarity of this skill profile.',
  },
};
