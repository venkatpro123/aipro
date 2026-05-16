// cybersecurity_actions.ts — v38.0 Phase 1A
// 25 Cybersecurity / InfoSec roles — cybersecurity is the highest-demand, lowest-attrition
// sector in tech: chronic 4M+ unfilled positions globally (ISC2 2026 Workforce Study).

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
  { title: 'Join 2 Active Cybersecurity Communities for Pipeline Intelligence', description: 'Sign up for the SANS Internet Storm Center handler community and join the DEF CON Discord. Senior security professionals in these communities share unfilled role intel 30-60 days before public posting. Active community participation also accelerates the OSCP/CISSP study process — peers will share their lab walkthroughs and exam tips. Comment on at least 2 threads per week.', layerFocus: 'L4 · Network', riskReductionPct: 14, deadline: '14 days', priority: 'Medium' },
  { title: 'Build a Personal Threat Research Pipeline on GitHub', description: 'Publish a public GitHub repo with weekly malware analysis writeups (use VirusTotal samples), Sigma detection rules, or AWS misconfig demos. Recruiters at CrowdStrike, Mandiant, Wiz scan GitHub for active practitioners — a populated repo with 12+ writeups generates 5-8 recruiter contacts per quarter. Choose your specialty (offensive, defensive, cloud) and commit to 1 substantial post/month.', layerFocus: 'L3 · Visibility', riskReductionPct: 18, deadline: '30 days', priority: 'Medium' },
  { title: 'Pursue an Industry-Recognized Certification (CISSP/OSCP/CCSP)', description: 'CISSP adds $15K-$25K to median compensation (ISC2 2026 salary survey). OSCP is the de facto offensive credential ($20K-$30K premium at top firms). CCSP for cloud security architects. Budget: $749 exam + 4-6 months study. Use the Mike Chapple CISSP course or Offensive Security PEN-200 for OSCP. Schedule the exam at registration to force the deadline.', layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '6 months — register now', priority: 'High' },
  { title: 'Register on HackerOne and Bugcrowd as a Researcher', description: 'Even passive bug bounty researcher profiles generate inbound recruiter contacts. A single $5K+ bounty on the HackerOne leaderboard is more credible than 3 years of tier-1 SOC work to most hiring managers. Start with public programs (GitLab, Shopify, US Department of Defense) — the entry bar is far lower than people assume.', layerFocus: 'L3 · Reputation', riskReductionPct: 16, deadline: '7 days', priority: 'Medium' },
  { title: 'Audit Your LinkedIn Profile for Specific Technologies, Not Buzzwords', description: 'Recruiters search by specific technology (Splunk SPL, Wiz cloud, CrowdStrike Falcon, Defender for Endpoint, Burp Suite Pro, Cobalt Strike). Add each tool you have hands-on experience with. Add an "Open to security roles" signal so external recruiters can ping you. This single update typically triples recruiter outreach within 30 days.', layerFocus: 'L3 · Visibility', riskReductionPct: 12, deadline: '3 days', priority: 'Medium' },
);

// ── ACTION_DB_CYBERSECURITY ──────────────────────────────────────────────────

export const ACTION_DB_CYBERSECURITY: Record<string, BracketPool> = {

  cyber_threat_analyst: pool(
    { title: 'Earn the GIAC Cyber Threat Intelligence (GCTI) Certification', description: 'GCTI ($1,099 + SANS FOR578 course $8,790 OR self-study path) is the gold-standard credential for threat intel roles. Hiring managers at Mandiant, Recorded Future, and CrowdStrike specifically look for GCTI. Add $18K-$28K to base offer post-cert. Self-study path: read the F3EAD framework, practice on MISP open-source threat intel platform, study Mitre ATT&CK navigator.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '90 days — register exam', priority: 'Critical' },
    { title: 'Publish 3 Threat Reports on Your Own Infrastructure', description: 'Set up a personal blog (Hugo + Cloudflare Pages, free) and publish 3 threat reports analyzing campaigns active in your sector. Reference MITRE ATT&CK technique IDs (T1190, T1059, etc.), include YARA rules you authored, and add IOCs from VirusTotal. This portfolio piece converts a generic threat analyst into a thought-leader candidate worth $30K-$50K more.', layerFocus: 'L3 · Reputation', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Build Relationships with 5 Sector-ISAC Members', description: 'Sector-ISACs (FS-ISAC for finance, H-ISAC for health, MS-ISAC for state/local gov) are gated communities of threat analysts at the largest organizations. Senior threat analysts in your sector ISAC are the gateway to FAANG-equivalent threat intel roles (Google Cloud Security, Microsoft Defender Experts, Amazon Threat Intel). Get a referral path established.', layerFocus: 'L4 · Network', riskReductionPct: 28, deadline: '21 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  soc_analyst_tier_1: pool(
    { title: 'Schedule the Security+ Exam This Week and the CySA+ in 90 Days', description: 'Tier-1 SOC is the highest-displacement role in cybersecurity (AI is eating routine alert triage). Your only protection is fast progression to tier-2/tier-3 — which requires CySA+ ($392) or BTL1 ($299) within 6 months. Security+ is the entry bar; CySA+ is the tier-2 unlock. Both can be self-studied via Professor Messer (free) + Jason Dion practice exams ($25). Schedule now to force the deadline.', layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to 3 Tier-2 Incident Response Roles Immediately', description: 'AI is replacing 40-60% of tier-1 alert triage by 2028 (Gartner 2026). Tier-2 IR roles are protected by the need for human judgment on novel incidents. Apply to 3 tier-2 roles this week — even without 100% qualifications, the application starts hiring manager conversations that often lead to lateral moves within your current company. Use the SOC Analyst → IR Engineer track on the Hack The Box pathway as evidence.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '7 days', priority: 'Critical' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  soc_analyst_tier_2: pool(
    { title: 'Master Splunk SPL and Build a Detection Rule Portfolio', description: 'Tier-2 analysts who own detection engineering (write Splunk SPL, Sentinel KQL, or Sigma rules) earn 25-40% more than triage-focused tier-2s. Publish 10 detection rules on GitHub (e.g., for the latest CVEs or MITRE ATT&CK techniques). Use BOTSv3 dataset for practice. The Splunk Search Expert certification ($150) is the credential signal.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Transition to Detection Engineering Track', description: 'Detection engineering is the highest-demand SOC specialization in 2026 (60% YoY job posting growth). Pure detection engineer roles pay $130K-$190K base. Document your detection authoring on GitHub, contribute to the Sigma Rules public repository, and apply specifically to detection engineering roles at Datadog, Snyk, Wiz, Vanta — all hiring aggressively.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '30 days', priority: 'Critical' },
    { title: 'Get GCFA or GCIH for Senior IR Path', description: 'GCFA (forensics) or GCIH (incident handler) opens the path to senior IR engineer ($150K-$230K). Either is $1,099 + SANS FOR508/SEC504 course. The certs are the credential bar for Mandiant, CrowdStrike Falcon Complete, and Microsoft DART hiring.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '6 months', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  soc_analyst_tier_3: pool(
    { title: 'Negotiate a Detection Engineering Specialization', description: 'Tier-3 analysts are protected by the scarcity of detection engineering and threat hunting expertise. Formally negotiate a role-shift to detection engineering or threat hunting with your current manager — this is essentially impossible to backfill quickly. The role-shift conversion typically comes with a 15-20% salary bump and dramatic protection from layoffs.', layerFocus: 'L5 · Negotiation', riskReductionPct: 36, deadline: '21 days', priority: 'Critical' },
    { title: 'Publish at SANS DFIR Summit or Black Hat Briefings', description: 'A talk at a major conference (SANS DFIR Summit, Black Hat Briefings, FIRST Conference) marks you as a senior-level expert in the field. Submit a CFP this quarter — even rejection feedback is valuable. Acceptance opens immediate roles at $200K+ with companies like Mandiant Consulting, CrowdStrike Services, and IBM X-Force.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '90 days — CFP deadline', priority: 'Critical' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.senior.moderate[0],
  ),

  incident_response_engineer: pool(
    { title: 'Apply to 3 Top-Tier IR Consulting Firms', description: 'Mandiant Consulting, CrowdStrike Services, Kroll, Stroz Friedberg, and IBM X-Force IR are the top IR firms. Senior IR engineers at these firms earn $180K-$280K base + 15-25% bonus. Even if you stay at your current employer, the offer is leverage. Apply within 7 days. GCFA certification is the credential bar.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '7 days', priority: 'Critical' },
    { title: 'Build a Personal IR Playbook Library on GitHub', description: 'Publish a public GitHub repo with 10+ incident response playbooks (BEC, ransomware containment, AWS account compromise, Active Directory compromise, etc.). Reference SANS PICERL methodology, include forensic acquisition steps, and templated executive communications. This positions you as a force multiplier — IR managers desperately need playbook libraries.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '60 days', priority: 'Critical' },
    { title: 'Pursue GCFA + GREM for Forensic IR Path', description: 'GCFA (forensic analyst) + GREM (reverse engineering) opens deep forensic IR roles at $200K-$320K. Total cost ~$15K including SANS courses. Or self-study GCFA via SANS FOR508 OnDemand + DFIR memorization deck.', layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '6 months', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  penetration_tester: pool(
    { title: 'Earn OSWE or OSED for Advanced Specialization', description: 'OSCP is the entry bar; OSWE (web app advanced) or OSED (exploit dev) is the differentiator that opens $200K+ senior pentest roles. OSWE is $1,899 + 90 days lab + exam. Top firms (NCC Group, Bishop Fox, Synack) specifically recruit OSWE/OSED holders. Schedule the exam to force the deadline.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a Public CVE or Major Bug Bounty Record', description: 'Public CVE assignment (e.g., critical RCE in popular open-source software) is the single strongest signal in offensive security hiring. Alternatively, build a Top-100 HackerOne profile. Either creates inbound recruiter outreach at $200K+ for senior pentest roles at Bishop Fox, NCC Group, IOActive, Trail of Bits.', layerFocus: 'L3 · Reputation', riskReductionPct: 36, deadline: '6 months', priority: 'Critical' },
    { title: 'Apply to Boutique Offensive Security Firms', description: 'Boutique offensive firms (Bishop Fox, NCC Group, Synack Red Team, Trail of Bits, IOActive) pay 20-40% above mainstream consulting. Senior pentesters earn $180K-$280K + project bonuses. Apply within 14 days — these firms have continuous hiring funnels for proven OSCP+ talent.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  red_team_operator: pool(
    { title: 'Earn CRTO or OSEP for Adversary Emulation Credential', description: 'CRTO (Certified Red Team Operator) at $399 or OSEP at $1,899 is the credential bar for serious red team roles. Cobalt Strike experience + CRTO opens $200K-$300K roles at Mandiant Red Team, CrowdStrike OverWatch, IBM X-Force Red, and FAANG internal red teams.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a Custom C2 Framework or Major Tool Contribution', description: 'Publish a custom C2 framework or major contribution to Sliver / Mythic / Havoc on GitHub. Or develop a novel evasion technique with a writeup. Red team hiring at top firms specifically values demonstrated tool development capability — this is a 5-10x signal vs. cert holders.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to FAANG Internal Red Teams', description: 'Google PRT (Project Zero Red Team), Meta Red Team, AWS Pentest Team, Microsoft Red Team pay $250K-$400K total compensation including equity. They specifically recruit operators with custom tooling experience and DEF CON/Black Hat talks. Apply this month.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  purple_team_engineer: pool(
    { title: 'Build a Public Detection Engineering Portfolio', description: 'Publish 20+ Sigma detection rules on the public Sigma Rules GitHub repo, with documented testing via Atomic Red Team. Purple team engineers who own demonstrated detection coverage of MITRE ATT&CK gain immediate access to $170K-$240K roles at Datadog, Snyk, Vanta, Wiz, and FAANG internal security teams.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '60 days', priority: 'Critical' },
    { title: 'Master Atomic Red Team + Caldera for Adversary Emulation', description: 'Mastery of Atomic Red Team (red team tests) and Caldera (autonomous adversary emulation) is the unique purple team skill. Contribute test definitions to the Atomic Red Team repo. This becomes a credential for senior purple team / detection engineer roles.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  application_security_engineer: pool(
    { title: 'Earn the OSWE or AWAE for Senior AppSec Path', description: 'OSWE ($1,899) or BSCP (Burp Suite Certified Practitioner, $99) is the credential bar for senior AppSec. Top firms (Synopsys, Veracode, Checkmarx, NCC Group) specifically recruit OSWE holders for $190K-$280K roles. Self-study path: PortSwigger Web Security Academy + HackTheBox Academy AppSec paths.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Lead a Threat Modeling Initiative for 5+ Services', description: 'Document threat models (using STRIDE or OCTAVE) for 5+ services in your current employer. This becomes a portfolio piece for senior AppSec roles — "led threat modeling for 5 production services" is a 5x stronger signal than "performed code reviews."', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'High' },
    { title: 'Build a Bug Bounty Profile Focused on Web Apps', description: 'A Top-1000 HackerOne or Bugcrowd profile with web app vulnerabilities is the strongest signal for AppSec hiring at FAANG and security-first scaleups (Vercel, Anthropic, Stripe, Cloudflare). Average bounty: $500-$5,000. Top researchers earn $200K+/year just from bounties.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  cloud_security_architect: pool(
    { title: 'Earn AWS Certified Security Specialty + CCSP', description: 'AWS Security Specialty ($300) + CCSP ($599) is the gold-standard credential combo for cloud security architects. Adds $25K-$45K to base offer. Top firms (Wiz, Lacework, Orca Security, Palo Alto Prisma Cloud) specifically require this combo for senior cloud security architect roles at $200K-$340K.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a Public Cloud Security Reference Architecture', description: 'Publish a multi-cloud security reference architecture on GitHub (Terraform modules for AWS Control Tower, Azure Landing Zone, GCP Organization Policy). Include automated detection (CSPM rules), least-privilege IAM, and CIS benchmark compliance. This portfolio piece converts senior engineer → architect-track immediately.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to Cloud Security Vendor Roles', description: 'Wiz, Orca Security, Lacework, Cribl, Prisma Cloud are growing 80-200% YoY and aggressively hiring senior cloud security architects at $220K-$340K + equity. Senior architects with multi-cloud experience are in acute shortage.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  devsecops_engineer: pool(
    { title: 'Master the Modern DevSecOps Toolchain (Snyk, Wiz, Semgrep)', description: 'Hands-on expertise with Snyk (SCA), Wiz (CSPM), Semgrep (SAST), and Trivy (container) is the modern DevSecOps stack. Publish CI/CD pipeline configs on GitHub demonstrating shift-left security with these tools. Adds $20K-$35K to base offer at modern security-first companies.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Contribute to a Major Open-Source Policy-as-Code Project', description: 'Open-source contributions to Open Policy Agent (Rego policies), Kyverno, or Checkov rules establish DevSecOps expertise far better than certifications. Submit 5+ accepted PRs to one of these projects. This is a direct hiring signal at FAANG internal security and modern platform companies.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  identity_access_management_engineer: pool(
    { title: 'Master Okta + Microsoft Entra ID Advanced Configuration', description: 'Okta Certified Professional + Microsoft SC-300 ($165 each) is the credential bar. But the differentiator is hands-on advanced configuration — SCIM provisioning, custom auth policies, conditional access. Build a personal demo lab (free Okta developer + Azure free tier) and publish configs on GitHub.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    { title: 'Lead a Privileged Access Management (PAM) Initiative', description: 'PAM (CyberArk, BeyondTrust, Delinea) is the highest-impact IAM specialization. Senior PAM engineers earn $150K-$220K. If your current role doesn\'t include PAM, propose a 90-day project to roll out PAM for your most critical 50 accounts. This portfolio piece converts IAM admin → IAM architect.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  grc_analyst: pool(
    { title: 'Transition to a Technical GRC Role at a SaaS Vendor', description: 'GRC roles at SaaS vendors (Vanta, Drata, Secureframe, Hyperproof) pay 40-60% above traditional GRC. They specifically value GRC analysts with hands-on platform experience because they hire to expand their own products. Apply within 14 days. SOC 2 / ISO 27001 audit experience is the differentiator.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    { title: 'Earn the CISA or CISSP-ISSMP for Senior Path', description: 'CISA ($760) is the gold-standard audit credential. CISSP-ISSMP ($599) is the security management track. Either opens senior GRC roles at $130K-$180K. GRC is the highest-displacement security role (Vanta AI/Drata AI eating routine evidence collection) — pure compliance work is shrinking; technical GRC is growing.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '6 months', priority: 'Critical' },
    { title: 'Build a Cross-Framework Compliance Knowledge Base', description: 'Publish a public knowledge base mapping controls across SOC 2 / ISO 27001 / HIPAA / FedRAMP / PCI-DSS. This is the highest-value GRC skill: senior GRC professionals who understand framework crosswalks earn $160K-$220K and become indispensable during M&A or expansion.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  siem_engineer: pool(
    { title: 'Master Splunk SPL or Sentinel KQL at Expert Level', description: 'Splunk Search Expert ($150) or Microsoft SC-200 ($165) is the credential. But the differentiator is publishing 20+ public SPL/KQL queries on GitHub. SIEM engineers who own detection content (vs. just operations) earn $40K-$60K more.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '60 days', priority: 'Critical' },
    { title: 'Lead a SIEM Migration or Cost Optimization Project', description: 'A "migrated 500GB/day SIEM from Splunk to Sentinel saving $1.2M/year" portfolio piece converts a $130K SIEM engineer into a $180K-$220K SIEM architect role. Use Cribl or Splunk pipelines to reduce ingest cost. Document your work for portfolio.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '120 days', priority: 'High' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  forensics_analyst: pool(
    { title: 'Earn GCFA + GCFE for Forensic Specialization', description: 'GCFA + GCFE ($1,099 each + SANS FOR500/FOR508) is the gold-standard forensic credential combo. Total ~$15K. Opens senior forensic roles at Mandiant Consulting, CrowdStrike Services, Stroz Friedberg at $180K-$280K base.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '6 months', priority: 'Critical' },
    { title: 'Build an Expert Witness Capability', description: 'Senior forensic analysts can become expert witnesses at $500-$1,500/hour. Take a court testimony course (NIJ National Forensic Science Technology Center). Register with expert witness networks (SEAK, ForensisGroup). Even 2-3 cases/year add $20K-$40K supplemental income and dramatic career resilience.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  malware_analyst: pool(
    { title: 'Earn GREM for Reverse Engineering Credential', description: 'GREM ($1,099 + SANS FOR610) is the credential bar for senior malware analysts. Opens roles at Mandiant Advanced Practices, CrowdStrike OverWatch Elite, Microsoft DART at $200K-$320K base. Self-study path: x86_64 assembly + Ghidra labs + the Practical Malware Analysis book.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '6 months', priority: 'Critical' },
    { title: 'Publish 5+ Public Malware Analysis Writeups', description: 'Publish detailed reverse-engineering writeups on Medium / personal blog for 5+ malware families (recent ransomware, banker trojans, APT samples). Include Ghidra screenshots, unpacker scripts, and YARA rules. This portfolio is the highest-signal credential in malware analysis hiring.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  vulnerability_management_specialist: pool(
    { title: 'Pivot to Exposure Management at a Modern Vendor', description: 'Vulnerability management is being displaced by exposure management platforms (Wiz, Tenable, Qualys, Rapid7). Apply to Wiz, Tenable, Qualys product roles — they hire experienced VM specialists at $140K-$190K to drive product expansion. The pivot dramatically increases career resilience.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '14 days', priority: 'Critical' },
    { title: 'Develop Risk-Based Vulnerability Management Expertise', description: 'Pure CVSS-score-based VM is dying. Risk-based VM (using EPSS, CISA KEV, and business context) is the modern approach. Build a portfolio piece: "transformed 50,000-finding queue into 200 prioritized actions using EPSS + business context." This converts a $110K VM analyst into a $160K+ exposure manager.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '60 days', priority: 'High' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  security_compliance_manager: pool(
    { title: 'Lead a Multi-Framework Compliance Program (SOC 2 + ISO + HIPAA)', description: 'Compliance managers who own multi-framework programs are dramatically more valuable than single-framework specialists. Lead the next certification cycle for 2+ frameworks. Use Vanta/Drata as the tooling. This portfolio piece is the bridge to senior compliance director roles at $180K-$240K.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '180 days', priority: 'High' },
    { title: 'Build an Audit Defense Playbook', description: 'Publish (or maintain internally) an audit defense playbook — how to respond to auditor findings, manage evidence requests, and minimize control gaps. This becomes a portfolio piece for senior compliance roles. Add board reporting experience to qualify for compliance director.', layerFocus: 'L3 · Reputation', riskReductionPct: 26, deadline: '90 days', priority: 'High' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  ciso: pool(
    { title: 'Build Board-Level Cyber Risk Communication Skills', description: 'CISO compensation correlates more strongly with board communication ability than technical depth. Take the Carnegie Mellon Heinz CISO Executive Education ($8K) or Stanford CISO Program. Practice quarterly board reporting. Top CISOs at F500 companies earn $400K-$1.2M total comp.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Develop M&A Security Due Diligence Capability', description: 'CISOs who can lead security due diligence in M&A transactions earn 30-40% premium. Partner with corp dev or legal to participate in the next acquisition. This becomes a portfolio piece that opens CISO roles at acquisition-active companies (PE-backed scaleups, F500 with active M&A pipeline).', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '120 days', priority: 'Critical' },
    { title: 'Establish vCISO Practice as a Hedge', description: 'A part-time vCISO practice (2-3 SMB clients at $5K-$15K/month each) generates $200K-$500K supplemental income and provides total layoff insulation. Most CISO employment contracts permit board-approved external advisory work. Establish 1-2 vCISO clients while employed.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 35, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  vciso: pool(
    { title: 'Build a Repeatable vCISO Service Methodology', description: 'Top vCISO practices (Cynomi, NetSPI, Optiv Advisory) generate $40K-$80K per client/year. Build a repeatable service methodology — 30-day security assessment template, 90-day roadmap framework, monthly board reporting template. This creates the basis for charging premium rates and scaling beyond hourly billing.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Join 2 vCISO Marketplaces for Pipeline Generation', description: 'Cynomi, Tier 1 vCISO Network, and Optiv Bench pre-qualify vCISO opportunities. Joining as a senior practitioner generates 3-5 inbound leads/month. This eliminates the sales cycle burden of building a vCISO practice from scratch.', layerFocus: 'L5 · Network', riskReductionPct: 28, deadline: '30 days', priority: 'Critical' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  bug_bounty_researcher: pool(
    { title: 'Specialize in a High-Value Vulnerability Class', description: 'Top bug bounty researchers specialize: GraphQL injection, server-side prototype pollution, AWS IAM privilege escalation, OAuth flow bypasses, etc. Specialization 2-5x average bounty values. Choose your specialty based on personal interest and document deep technical writeups on it.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    { title: 'Apply to Live Hacking Events (h1-LHE, Bugcrowd Bash)', description: 'Live hacking events (HackerOne LHE, Bugcrowd Bash) feature $1M+ payout pools and direct access to top platforms. Top-100 platform researchers are invited; even an invite letter is a strong recruiter signal. Aim for an LHE invite within 12 months by climbing the public leaderboard.', layerFocus: 'L3 · Reputation', riskReductionPct: 28, deadline: '12 months', priority: 'High' },
    { title: 'Convert to a Salaried Security Research Role at a Big Tech Company', description: 'Top bug bounty researchers are recruited into salaried security research roles at Google Project Zero, Meta Red Team, AWS Pentest, Microsoft MSRC at $250K-$400K total compensation. The salary + benefits often exceed bounty income while providing stability.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '14 days', priority: 'Critical' },
    A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  cryptography_engineer: pool(
    { title: 'Specialize in Post-Quantum Cryptography (PQC) Migration', description: 'NIST PQC standardization (CRYSTALS-Kyber, CRYSTALS-Dilithium) is driving urgent demand for PQC migration expertise. Top firms (CloudFlare, AWS, Google) are hiring PQC engineers at $250K-$400K. Take Boneh\'s Coursera Crypto I/II + study NIST PQC standards. This is the highest-growth specialization in 2026.', layerFocus: 'L3 · Skills', riskReductionPct: 35, deadline: '180 days', priority: 'Critical' },
    { title: 'Contribute to a Major Cryptographic Library', description: 'Contributions to OpenSSL, BoringSSL, Tink, or libsodium establish elite-tier cryptography credentials. Submit 3+ accepted PRs (e.g., new cipher suite, side-channel mitigation, audit fixes). This portfolio is the bridge to staff-level cryptography roles at $300K+.', layerFocus: 'L3 · Reputation', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  zero_trust_architect: pool(
    { title: 'Lead a Production Zero Trust Network Access (ZTNA) Rollout', description: 'A "led ZTNA rollout for 5,000 users replacing legacy VPN" portfolio piece is the bridge to senior zero trust architect roles at $220K-$340K. Use Zscaler ZIA/ZPA, Cloudflare One, or Palo Alto Prisma Access. Document the architecture and results for portfolio.', layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '180 days', priority: 'Critical' },
    { title: 'Earn Zscaler ZDX or Cloudflare One Architecture Certification', description: 'Vendor architecture certs (Zscaler ZDX, Cloudflare One) plus broader cloud security creds (CCSP, AWS Security Specialty) are the credential combo. Adds $30K-$50K to base offer. Top firms hiring zero trust architects: Zscaler, Cloudflare, Palo Alto Networks, and F500 in active transformation.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '120 days', priority: 'High' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  ot_security_engineer: pool(
    { title: 'Earn GICSP or GRID for OT/ICS Specialization', description: 'GICSP ($1,099 + SANS ICS410) is the credential bar for OT security. GRID for IR-focused ICS. Total ~$8K. OT security engineers are in extreme shortage (5x more openings than candidates per ISC2 2026). Senior OT engineers earn $180K-$280K.', layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '6 months', priority: 'Critical' },
    { title: 'Build Hands-On ICS Lab Experience', description: 'Hands-on experience with Modbus, DNP3, IEC 61850 protocols is the differentiator. Set up a personal ICS lab using OpenPLC + Wireshark + Dragos Project (free tier). Document your work. This portfolio piece is essentially unique in the talent pool.', layerFocus: 'L3 · Skills', riskReductionPct: 30, deadline: '90 days', priority: 'Critical' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),

  cyber_intelligence_analyst: pool(
    { title: 'Build Geopolitical + Technical Briefing Capability', description: 'Top cyber intel analysts combine technical depth (malware, infrastructure) with geopolitical context. Read CSIS, Atlantic Council, RUSI reports weekly. Publish 5+ briefing-style writeups (technical findings + geopolitical context). This positions you for senior intel roles at Mandiant Threat Intelligence, CrowdStrike Intelligence, Recorded Future at $180K-$260K.', layerFocus: 'L3 · Skills', riskReductionPct: 32, deadline: '90 days', priority: 'Critical' },
    { title: 'Pursue Foreign Language + Region Specialization', description: 'Cyber intel analysts with Mandarin, Russian, Farsi, or Arabic language skills + regional expertise command 30-50% premium. Even intermediate fluency opens government contractor roles (Booz Allen, Leidos, CACI) and elite private sector positions. Pimsleur + Italki tutor = $200/month.', layerFocus: 'L3 · Skills', riskReductionPct: 28, deadline: '12 months', priority: 'High' },
    A_NETWORKING.senior.critical[0], A_NETWORKING.senior.high[0], A_NETWORKING.junior.moderate[0],
  ),
};

// ── ALIAS ADDITIONS ──────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_CYBERSECURITY: Record<string, { canonicalKey: string; displayRole: string }> = {
  'cyber threat analyst': { canonicalKey: 'cyber_threat_analyst', displayRole: 'Cyber Threat Analyst' },
  'threat intelligence analyst': { canonicalKey: 'cyber_threat_analyst', displayRole: 'Threat Intelligence Analyst' },
  'cti analyst': { canonicalKey: 'cyber_threat_analyst', displayRole: 'CTI Analyst' },
  'threat researcher': { canonicalKey: 'cyber_threat_analyst', displayRole: 'Threat Researcher' },
  'soc analyst': { canonicalKey: 'soc_analyst_tier_1', displayRole: 'SOC Analyst' },
  'soc analyst tier 1': { canonicalKey: 'soc_analyst_tier_1', displayRole: 'SOC Analyst (Tier 1)' },
  'tier 1 soc': { canonicalKey: 'soc_analyst_tier_1', displayRole: 'Tier 1 SOC' },
  'security operations analyst': { canonicalKey: 'soc_analyst_tier_1', displayRole: 'Security Operations Analyst' },
  'l1 analyst': { canonicalKey: 'soc_analyst_tier_1', displayRole: 'L1 SOC Analyst' },
  'soc analyst tier 2': { canonicalKey: 'soc_analyst_tier_2', displayRole: 'SOC Analyst (Tier 2)' },
  'tier 2 soc': { canonicalKey: 'soc_analyst_tier_2', displayRole: 'Tier 2 SOC Analyst' },
  'l2 analyst': { canonicalKey: 'soc_analyst_tier_2', displayRole: 'L2 SOC Analyst' },
  'soc analyst tier 3': { canonicalKey: 'soc_analyst_tier_3', displayRole: 'SOC Analyst (Tier 3)' },
  'tier 3 soc': { canonicalKey: 'soc_analyst_tier_3', displayRole: 'Tier 3 SOC Analyst' },
  'senior soc analyst': { canonicalKey: 'soc_analyst_tier_3', displayRole: 'Senior SOC Analyst' },
  'l3 analyst': { canonicalKey: 'soc_analyst_tier_3', displayRole: 'L3 SOC Analyst' },
  'incident response engineer': { canonicalKey: 'incident_response_engineer', displayRole: 'Incident Response Engineer' },
  'ir engineer': { canonicalKey: 'incident_response_engineer', displayRole: 'IR Engineer' },
  'dfir analyst': { canonicalKey: 'incident_response_engineer', displayRole: 'DFIR Analyst' },
  'incident handler': { canonicalKey: 'incident_response_engineer', displayRole: 'Incident Handler' },
  'penetration tester': { canonicalKey: 'penetration_tester', displayRole: 'Penetration Tester' },
  'pentester': { canonicalKey: 'penetration_tester', displayRole: 'Penetration Tester' },
  'offensive security engineer': { canonicalKey: 'penetration_tester', displayRole: 'Offensive Security Engineer' },
  'ethical hacker': { canonicalKey: 'penetration_tester', displayRole: 'Ethical Hacker' },
  'red team operator': { canonicalKey: 'red_team_operator', displayRole: 'Red Team Operator' },
  'red teamer': { canonicalKey: 'red_team_operator', displayRole: 'Red Team Operator' },
  'adversary emulation engineer': { canonicalKey: 'red_team_operator', displayRole: 'Adversary Emulation Engineer' },
  'purple team engineer': { canonicalKey: 'purple_team_engineer', displayRole: 'Purple Team Engineer' },
  'detection engineer': { canonicalKey: 'purple_team_engineer', displayRole: 'Detection Engineer' },
  'application security engineer': { canonicalKey: 'application_security_engineer', displayRole: 'Application Security Engineer' },
  'appsec engineer': { canonicalKey: 'application_security_engineer', displayRole: 'AppSec Engineer' },
  'product security engineer': { canonicalKey: 'application_security_engineer', displayRole: 'Product Security Engineer' },
  'cloud security architect': { canonicalKey: 'cloud_security_architect', displayRole: 'Cloud Security Architect' },
  'cloud security engineer': { canonicalKey: 'cloud_security_architect', displayRole: 'Cloud Security Engineer' },
  'aws security engineer': { canonicalKey: 'cloud_security_architect', displayRole: 'AWS Security Engineer' },
  'devsecops engineer': { canonicalKey: 'devsecops_engineer', displayRole: 'DevSecOps Engineer' },
  'devsecops': { canonicalKey: 'devsecops_engineer', displayRole: 'DevSecOps Engineer' },
  'security automation engineer': { canonicalKey: 'devsecops_engineer', displayRole: 'Security Automation Engineer' },
  'iam engineer': { canonicalKey: 'identity_access_management_engineer', displayRole: 'IAM Engineer' },
  'identity engineer': { canonicalKey: 'identity_access_management_engineer', displayRole: 'Identity Engineer' },
  'access management engineer': { canonicalKey: 'identity_access_management_engineer', displayRole: 'Access Management Engineer' },
  'grc analyst': { canonicalKey: 'grc_analyst', displayRole: 'GRC Analyst' },
  'compliance analyst': { canonicalKey: 'grc_analyst', displayRole: 'Compliance Analyst' },
  'risk analyst security': { canonicalKey: 'grc_analyst', displayRole: 'Security Risk Analyst' },
  'siem engineer': { canonicalKey: 'siem_engineer', displayRole: 'SIEM Engineer' },
  'splunk engineer': { canonicalKey: 'siem_engineer', displayRole: 'Splunk Engineer' },
  'sentinel engineer': { canonicalKey: 'siem_engineer', displayRole: 'Microsoft Sentinel Engineer' },
  'forensics analyst': { canonicalKey: 'forensics_analyst', displayRole: 'Forensics Analyst' },
  'digital forensics analyst': { canonicalKey: 'forensics_analyst', displayRole: 'Digital Forensics Analyst' },
  'dfir specialist': { canonicalKey: 'forensics_analyst', displayRole: 'DFIR Specialist' },
  'malware analyst': { canonicalKey: 'malware_analyst', displayRole: 'Malware Analyst' },
  'reverse engineer': { canonicalKey: 'malware_analyst', displayRole: 'Malware Reverse Engineer' },
  'malware researcher': { canonicalKey: 'malware_analyst', displayRole: 'Malware Researcher' },
  'vulnerability management specialist': { canonicalKey: 'vulnerability_management_specialist', displayRole: 'Vulnerability Management Specialist' },
  'vm engineer': { canonicalKey: 'vulnerability_management_specialist', displayRole: 'Vulnerability Management Engineer' },
  'patch management engineer': { canonicalKey: 'vulnerability_management_specialist', displayRole: 'Patch Management Engineer' },
  'security compliance manager': { canonicalKey: 'security_compliance_manager', displayRole: 'Security Compliance Manager' },
  'compliance manager': { canonicalKey: 'security_compliance_manager', displayRole: 'Compliance Manager' },
  'iso 27001 manager': { canonicalKey: 'security_compliance_manager', displayRole: 'ISO 27001 Manager' },
  'ciso': { canonicalKey: 'ciso', displayRole: 'Chief Information Security Officer (CISO)' },
  'chief information security officer': { canonicalKey: 'ciso', displayRole: 'CISO' },
  'security officer chief': { canonicalKey: 'ciso', displayRole: 'Chief Security Officer' },
  'vciso': { canonicalKey: 'vciso', displayRole: 'vCISO' },
  'virtual ciso': { canonicalKey: 'vciso', displayRole: 'Virtual CISO' },
  'fractional ciso': { canonicalKey: 'vciso', displayRole: 'Fractional CISO' },
  'bug bounty researcher': { canonicalKey: 'bug_bounty_researcher', displayRole: 'Bug Bounty Researcher' },
  'bug bounty hunter': { canonicalKey: 'bug_bounty_researcher', displayRole: 'Bug Bounty Hunter' },
  'security researcher': { canonicalKey: 'bug_bounty_researcher', displayRole: 'Security Researcher' },
  'cryptography engineer': { canonicalKey: 'cryptography_engineer', displayRole: 'Cryptography Engineer' },
  'cryptographer': { canonicalKey: 'cryptography_engineer', displayRole: 'Cryptographer' },
  'crypto engineer': { canonicalKey: 'cryptography_engineer', displayRole: 'Crypto Engineer' },
  'zero trust architect': { canonicalKey: 'zero_trust_architect', displayRole: 'Zero Trust Architect' },
  'ztna architect': { canonicalKey: 'zero_trust_architect', displayRole: 'ZTNA Architect' },
  'network security architect': { canonicalKey: 'zero_trust_architect', displayRole: 'Network Security Architect' },
  'ot security engineer': { canonicalKey: 'ot_security_engineer', displayRole: 'OT Security Engineer' },
  'ics security engineer': { canonicalKey: 'ot_security_engineer', displayRole: 'ICS Security Engineer' },
  'industrial control security': { canonicalKey: 'ot_security_engineer', displayRole: 'Industrial Control Security Engineer' },
  'cyber intelligence analyst': { canonicalKey: 'cyber_intelligence_analyst', displayRole: 'Cyber Intelligence Analyst' },
  'cyber threat intelligence analyst': { canonicalKey: 'cyber_intelligence_analyst', displayRole: 'Cyber Threat Intelligence Analyst' },
  'all source intelligence analyst cyber': { canonicalKey: 'cyber_intelligence_analyst', displayRole: 'All-Source Cyber Intelligence Analyst' },
};

// ── CANONICAL GROUP ADDITIONS ────────────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_CYBERSECURITY: Record<string, string> = {
  cyber_threat_analyst: 'cyber_threat_analyst', soc_analyst_tier_1: 'soc_analyst_tier_1',
  soc_analyst_tier_2: 'soc_analyst_tier_2', soc_analyst_tier_3: 'soc_analyst_tier_3',
  incident_response_engineer: 'incident_response_engineer', penetration_tester: 'penetration_tester',
  red_team_operator: 'red_team_operator', purple_team_engineer: 'purple_team_engineer',
  application_security_engineer: 'application_security_engineer',
  cloud_security_architect: 'cloud_security_architect', devsecops_engineer: 'devsecops_engineer',
  identity_access_management_engineer: 'identity_access_management_engineer',
  grc_analyst: 'grc_analyst', siem_engineer: 'siem_engineer',
  forensics_analyst: 'forensics_analyst', malware_analyst: 'malware_analyst',
  vulnerability_management_specialist: 'vulnerability_management_specialist',
  security_compliance_manager: 'security_compliance_manager',
  ciso: 'ciso', vciso: 'vciso',
  bug_bounty_researcher: 'bug_bounty_researcher', cryptography_engineer: 'cryptography_engineer',
  zero_trust_architect: 'zero_trust_architect', ot_security_engineer: 'ot_security_engineer',
  cyber_intelligence_analyst: 'cyber_intelligence_analyst',
};

// ── DEMAND ADDITIONS ─────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_CYBERSECURITY: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  cyber_threat_analyst:               { roleKey: 'cyber_threat_analyst',               roleName: 'Cyber Threat Analyst',               demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 42, yoyJobOpeningsChange: 18, topHiringLocations: ['Washington DC', 'Northern Virginia', 'New York NY', 'Austin TX', 'Boston MA'],          aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'CTI demand strong; geopolitical instability driving sector-ISAC and gov contractor hiring.' },
  soc_analyst_tier_1:                 { roleKey: 'soc_analyst_tier_1',                 roleName: 'SOC Analyst (Tier 1)',                demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'falling', salaryTrend: 'stable', timeToFillDays: 28, yoyJobOpeningsChange: -8, topHiringLocations: ['Bangalore', 'Hyderabad', 'Manila', 'San Antonio TX', 'Tampa FL'],                          aiSubstitutionRisk: 0.48, dataQuarter: '2026-Q1', calibrationNote: 'Tier 1 demand softening — XSIAM/Charlotte/Sentinel AI displacing routine triage. Career velocity = move to tier-2/IR.' },
  soc_analyst_tier_2:                 { roleKey: 'soc_analyst_tier_2',                 roleName: 'SOC Analyst (Tier 2)',                demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 38, yoyJobOpeningsChange: 14,  topHiringLocations: ['Washington DC', 'Austin TX', 'Bangalore', 'San Antonio TX', 'Atlanta GA'],                aiSubstitutionRisk: 0.22, dataQuarter: '2026-Q1', calibrationNote: 'Tier 2 + detection engineering acutely short — every SOC needs more.' },
  soc_analyst_tier_3:                 { roleKey: 'soc_analyst_tier_3',                 roleName: 'SOC Analyst (Tier 3)',                demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 65, yoyJobOpeningsChange: 22,  topHiringLocations: ['San Francisco CA', 'Washington DC', 'Austin TX', 'New York NY', 'Boston MA'],            aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Senior SOC + threat hunters near-impossible to fill; commands premium.' },
  incident_response_engineer:         { roleKey: 'incident_response_engineer',         roleName: 'Incident Response Engineer',          demandIndex: 90, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 72, yoyJobOpeningsChange: 24,  topHiringLocations: ['Washington DC', 'San Francisco CA', 'New York NY', 'Austin TX', 'Reston VA'],              aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'IR market chronically short; major breach response capacity inadequate.' },
  penetration_tester:                 { roleKey: 'penetration_tester',                 roleName: 'Penetration Tester',                  demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 58, yoyJobOpeningsChange: 16,  topHiringLocations: ['Washington DC', 'San Francisco CA', 'New York NY', 'Austin TX', 'Atlanta GA'],            aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Pentest demand strong; OSCP+ holders especially scarce.' },
  red_team_operator:                  { roleKey: 'red_team_operator',                  roleName: 'Red Team Operator',                   demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 78, yoyJobOpeningsChange: 20,  topHiringLocations: ['Washington DC', 'San Francisco CA', 'New York NY', 'Austin TX', 'Reston VA'],              aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1', calibrationNote: 'Red team operators are the scarcest practitioners; F500 and FAANG actively recruiting.' },
  purple_team_engineer:               { roleKey: 'purple_team_engineer',               roleName: 'Purple Team Engineer',                demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 55, yoyJobOpeningsChange: 22,  topHiringLocations: ['San Francisco CA', 'Austin TX', 'Washington DC', 'New York NY', 'Seattle WA'],             aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Detection engineering and purple team are the highest-growth security specialties.' },
  application_security_engineer:      { roleKey: 'application_security_engineer',      roleName: 'Application Security Engineer',       demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 52, yoyJobOpeningsChange: 17,  topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Austin TX', 'Boston MA'],                aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'AppSec demand strong; shift-left + AI security combine to fuel hiring.' },
  cloud_security_architect:           { roleKey: 'cloud_security_architect',           roleName: 'Cloud Security Architect',            demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 68, yoyJobOpeningsChange: 26,  topHiringLocations: ['San Francisco CA', 'Seattle WA', 'New York NY', 'Austin TX', 'Bangalore'],                  aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Multi-cloud architects are the scarcest cloud security specialty.' },
  devsecops_engineer:                 { roleKey: 'devsecops_engineer',                 roleName: 'DevSecOps Engineer',                  demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 48, yoyJobOpeningsChange: 18,  topHiringLocations: ['San Francisco CA', 'Austin TX', 'Seattle WA', 'Bangalore', 'Hyderabad'],                  aiSubstitutionRisk: 0.16, dataQuarter: '2026-Q1', calibrationNote: 'Shift-left adoption continues; senior DevSecOps especially scarce.' },
  identity_access_management_engineer:{ roleKey: 'identity_access_management_engineer',roleName: 'Identity & Access Management Engineer',demandIndex: 76, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 42, yoyJobOpeningsChange: 8,   topHiringLocations: ['New York NY', 'San Francisco CA', 'Austin TX', 'Bangalore', 'Dublin'],                     aiSubstitutionRisk: 0.20, dataQuarter: '2026-Q1', calibrationNote: 'IAM demand stable; PAM specialists in shortage.' },
  grc_analyst:                        { roleKey: 'grc_analyst',                        roleName: 'GRC Analyst',                         demandIndex: 70, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 35, yoyJobOpeningsChange: 2,   topHiringLocations: ['New York NY', 'Washington DC', 'Bangalore', 'Hyderabad', 'San Francisco CA'],            aiSubstitutionRisk: 0.38, dataQuarter: '2026-Q1', calibrationNote: 'GRC demand softening — Vanta/Drata AI automating routine evidence. Tech GRC at vendors still rising.' },
  siem_engineer:                      { roleKey: 'siem_engineer',                      roleName: 'SIEM Engineer',                       demandIndex: 78, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'rising', timeToFillDays: 45, yoyJobOpeningsChange: 5,   topHiringLocations: ['Washington DC', 'San Francisco CA', 'Austin TX', 'New York NY', 'Bangalore'],            aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'SIEM platform migrations driving demand; cost optimization specialists in demand.' },
  forensics_analyst:                  { roleKey: 'forensics_analyst',                  roleName: 'Forensics Analyst',                   demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 60, yoyJobOpeningsChange: 14,  topHiringLocations: ['Washington DC', 'New York NY', 'San Francisco CA', 'Reston VA', 'Atlanta GA'],            aiSubstitutionRisk: 0.12, dataQuarter: '2026-Q1', calibrationNote: 'Forensic capacity remains structurally short during major incidents.' },
  malware_analyst:                    { roleKey: 'malware_analyst',                    roleName: 'Malware Analyst',                     demandIndex: 82, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 65, yoyJobOpeningsChange: 16,  topHiringLocations: ['Washington DC', 'San Francisco CA', 'Reston VA', 'Austin TX', 'New York NY'],              aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Reverse engineers in extreme shortage; ransomware/banker-trojan tide driving demand.' },
  vulnerability_management_specialist:{ roleKey: 'vulnerability_management_specialist',roleName: 'Vulnerability Management Specialist', demandIndex: 68, demandTrend: 'falling', jobOpeningsTrend: 'falling', salaryTrend: 'stable', timeToFillDays: 32, yoyJobOpeningsChange: -12, topHiringLocations: ['Washington DC', 'New York NY', 'San Francisco CA', 'Austin TX', 'Bangalore'],            aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1', calibrationNote: 'VM displaced by exposure management; pivot to risk-based VM essential.' },
  security_compliance_manager:        { roleKey: 'security_compliance_manager',        roleName: 'Security Compliance Manager',         demandIndex: 72, demandTrend: 'stable',  jobOpeningsTrend: 'stable',  salaryTrend: 'stable', timeToFillDays: 40, yoyJobOpeningsChange: 3,   topHiringLocations: ['New York NY', 'Washington DC', 'San Francisco CA', 'Boston MA', 'Bangalore'],            aiSubstitutionRisk: 0.30, dataQuarter: '2026-Q1', calibrationNote: 'Multi-framework leaders highly valuable; single-framework managers in flux.' },
  ciso:                               { roleKey: 'ciso',                               roleName: 'Chief Information Security Officer',  demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 120, yoyJobOpeningsChange: 12, topHiringLocations: ['New York NY', 'San Francisco CA', 'Washington DC', 'Boston MA', 'Chicago IL'],            aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1', calibrationNote: 'CISO market extremely tight; F500 willing to pay $400K-$1.2M total comp.' },
  vciso:                              { roleKey: 'vciso',                              roleName: 'Virtual CISO (vCISO)',                demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 30, yoyJobOpeningsChange: 30,  topHiringLocations: ['Remote', 'New York NY', 'San Francisco CA', 'Austin TX', 'Boston MA'],                    aiSubstitutionRisk: 0.18, dataQuarter: '2026-Q1', calibrationNote: 'vCISO marketplace booming; Cynomi and competitors drive demand.' },
  bug_bounty_researcher:              { roleKey: 'bug_bounty_researcher',              roleName: 'Bug Bounty Researcher',               demandIndex: 78, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 21, yoyJobOpeningsChange: 18,  topHiringLocations: ['Remote', 'San Francisco CA', 'Austin TX', 'Bangalore', 'Berlin'],                          aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1', calibrationNote: 'Bug bounty market continues growing; top-tier researchers in salaried demand.' },
  cryptography_engineer:              { roleKey: 'cryptography_engineer',              roleName: 'Cryptography Engineer',               demandIndex: 86, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 95, yoyJobOpeningsChange: 28,  topHiringLocations: ['San Francisco CA', 'Seattle WA', 'New York NY', 'Boston MA', 'London'],                   aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1', calibrationNote: 'PQC migration driving acute demand; cryptography engineers in deep shortage.' },
  zero_trust_architect:               { roleKey: 'zero_trust_architect',               roleName: 'Zero Trust Architect',                demandIndex: 84, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 72, yoyJobOpeningsChange: 22,  topHiringLocations: ['Washington DC', 'San Francisco CA', 'New York NY', 'Austin TX', 'Boston MA'],            aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'Zero trust transformation driving senior architect hiring at all F500.' },
  ot_security_engineer:               { roleKey: 'ot_security_engineer',               roleName: 'OT Security Engineer',                demandIndex: 88, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 95, yoyJobOpeningsChange: 26,  topHiringLocations: ['Houston TX', 'Washington DC', 'Chicago IL', 'Pittsburgh PA', 'Atlanta GA'],                aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1', calibrationNote: 'OT security engineers in extreme shortage; 5:1 openings-to-candidates per ISC2 2026.' },
  cyber_intelligence_analyst:         { roleKey: 'cyber_intelligence_analyst',         roleName: 'Cyber Intelligence Analyst',          demandIndex: 80, demandTrend: 'rising',  jobOpeningsTrend: 'rising',  salaryTrend: 'rising', timeToFillDays: 56, yoyJobOpeningsChange: 14,  topHiringLocations: ['Washington DC', 'Reston VA', 'San Francisco CA', 'New York NY', 'Austin TX'],            aiSubstitutionRisk: 0.14, dataQuarter: '2026-Q1', calibrationNote: 'Gov contractor + private sector both hiring; security clearance is force multiplier.' },
};

// ── COMPENSATION ADDITIONS ───────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_CYBERSECURITY: Record<string, Record<string, number>> = {
  cyber_threat_analyst:               { '0-2': 78_000,  '2-5': 105_000, '5-10': 138_000, '10-15': 175_000, '15+': 215_000 },
  soc_analyst_tier_1:                 { '0-2': 65_000,  '2-5': 78_000,  '5-10': 92_000,  '10-15': 105_000, '15+': 115_000 },
  soc_analyst_tier_2:                 { '0-2': 88_000,  '2-5': 110_000, '5-10': 135_000, '10-15': 162_000, '15+': 185_000 },
  soc_analyst_tier_3:                 { '0-2': 115_000, '2-5': 142_000, '5-10': 175_000, '10-15': 205_000, '15+': 235_000 },
  incident_response_engineer:         { '0-2': 105_000, '2-5': 138_000, '5-10': 178_000, '10-15': 220_000, '15+': 265_000 },
  penetration_tester:                 { '0-2': 95_000,  '2-5': 128_000, '5-10': 168_000, '10-15': 210_000, '15+': 255_000 },
  red_team_operator:                  { '0-2': 110_000, '2-5': 145_000, '5-10': 195_000, '10-15': 245_000, '15+': 295_000 },
  purple_team_engineer:                { '0-2': 100_000, '2-5': 132_000, '5-10': 172_000, '10-15': 215_000, '15+': 255_000 },
  application_security_engineer:      { '0-2': 110_000, '2-5': 142_000, '5-10': 185_000, '10-15': 230_000, '15+': 275_000 },
  cloud_security_architect:           { '0-2': 125_000, '2-5': 165_000, '5-10': 215_000, '10-15': 275_000, '15+': 330_000 },
  devsecops_engineer:                 { '0-2': 105_000, '2-5': 138_000, '5-10': 178_000, '10-15': 220_000, '15+': 260_000 },
  identity_access_management_engineer:{ '0-2': 92_000,  '2-5': 118_000, '5-10': 148_000, '10-15': 178_000, '15+': 210_000 },
  grc_analyst:                        { '0-2': 70_000,  '2-5': 92_000,  '5-10': 118_000, '10-15': 145_000, '15+': 170_000 },
  siem_engineer:                      { '0-2': 95_000,  '2-5': 125_000, '5-10': 158_000, '10-15': 192_000, '15+': 225_000 },
  forensics_analyst:                  { '0-2': 88_000,  '2-5': 118_000, '5-10': 155_000, '10-15': 195_000, '15+': 235_000 },
  malware_analyst:                    { '0-2': 105_000, '2-5': 140_000, '5-10': 185_000, '10-15': 230_000, '15+': 275_000 },
  vulnerability_management_specialist:{ '0-2': 78_000,  '2-5': 102_000, '5-10': 128_000, '10-15': 152_000, '15+': 178_000 },
  security_compliance_manager:        { '0-2': 92_000,  '2-5': 118_000, '5-10': 152_000, '10-15': 185_000, '15+': 220_000 },
  ciso:                               { '0-2': 220_000, '2-5': 295_000, '5-10': 395_000, '10-15': 525_000, '15+': 650_000 },
  vciso:                              { '0-2': 145_000, '2-5': 185_000, '5-10': 235_000, '10-15': 285_000, '15+': 340_000 },
  bug_bounty_researcher:              { '0-2': 50_000,  '2-5': 95_000,  '5-10': 165_000, '10-15': 235_000, '15+': 305_000 },
  cryptography_engineer:              { '0-2': 130_000, '2-5': 175_000, '5-10': 230_000, '10-15': 295_000, '15+': 365_000 },
  zero_trust_architect:               { '0-2': 120_000, '2-5': 158_000, '5-10': 205_000, '10-15': 260_000, '15+': 315_000 },
  ot_security_engineer:               { '0-2': 105_000, '2-5': 138_000, '5-10': 178_000, '10-15': 220_000, '15+': 265_000 },
  cyber_intelligence_analyst:         { '0-2': 82_000,  '2-5': 110_000, '5-10': 142_000, '10-15': 175_000, '15+': 210_000 },
};

// ── NEGOTIATION ADDITIONS ────────────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_CYBERSECURITY: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  ciso: {
    strongOpener: 'I want to discuss my compensation package in the context of my year-one accomplishments: I\'ve led [SOC 2 / ISO / [breach response]], reduced our enterprise cyber insurance premium by X%, and now own the board reporting relationship. I\'d like to align my total comp with peer CISOs at similar-stage companies.',
    leverageContext: 'Per the IANS / Artico CISO Compensation Benchmark 2026, median total comp for CISOs at companies our size is $X (base) + $Y (bonus) + equity worth $Z. My current package is below the 50th percentile despite outperforming on the key metrics. Replacing me mid-program would cost 6+ months of breach risk and stall the SOC 2 / FedRAMP roadmap.',
    countersScript: 'I\'m asking for base of $X (matches 75th percentile), bonus target of Y%, and refresh equity grant of $Z to align with peers and lock in retention. If full base adjustment isn\'t possible this cycle, I\'ll accept a meaningful refresh grant plus a documented review for full base adjustment in 6 months.',
    walkAwayLine: 'I\'ve received approaches from two competitor companies and one PE-portfolio CISO role at substantially higher comp. I\'d prefer to continue the work we\'ve started here, but the gap to market is currently meaningful — I need to see real movement.',
  },
  penetration_tester: {
    strongOpener: 'I\'d like to discuss my comp package in light of [public CVE / HackerOne profile / OSWE / engagement portfolio]. The senior offensive security market in 2026 is at $185K-$240K base for OSCP+OSWE holders with demonstrated track records.',
    leverageContext: 'My contributions this year: [X CVEs published / Y bounties earned / Z critical findings in major engagements]. Replacement cost: 6+ months to find a senior pentester with my specific specialty (web/cloud/AD). Bishop Fox, NCC Group, and Synack Red Team are actively recruiting at $200K+ for these credentials.',
    countersScript: 'I\'m asking for $X base (per Levels.fyi senior pentester 75th percentile at scaleups), a documented progression path to staff pentester (or lead consultant), and certification budget of $5K/year for advanced courses.',
    walkAwayLine: 'I have an offer from [Bishop Fox / NCC Group / boutique firm] at $X. I\'ve enjoyed the work here, but the gap is significant. I\'d like to find a way to make this work.',
  },
  cloud_security_architect: {
    strongOpener: 'I want to align my compensation with the 2026 cloud security architect market. With my AWS Security Specialty + CCSP credentials and [X cloud account hardening initiatives / Y CSPM rule sets / Z zero-trust rollouts], I\'m operating at the senior architect level.',
    leverageContext: 'Per the ISC2 2026 Cybersecurity Workforce Study, cloud security architects with multi-cloud experience are in a 4:1 demand-to-supply ratio. Replacement cost: 4-6 months minimum. My current programs (CSPM coverage, IAM hardening, ZTNA rollout) would lose momentum during a transition.',
    countersScript: 'I\'m asking for $X base (75th percentile for senior cloud security architect), an equity refresh, and certification budget for AWS Pro / Azure Expert / GCP Pro. If full base adjustment isn\'t feasible, I\'ll accept a meaningful equity refresh plus a 6-month review.',
    walkAwayLine: 'Wiz, Lacework, and Orca Security are actively recruiting at $240K-$320K total comp for senior cloud security architects. I\'ve enjoyed the work here but need to see meaningful movement.',
  },
  red_team_operator: {
    strongOpener: 'I\'d like to discuss my compensation in the context of red team operator market rates in 2026. With my CRTO / OSEP + custom C2 tooling and [X engagements led / DEF CON talk / public research], I\'m at the senior operator level commanding $250K+ in the market.',
    leverageContext: 'Red team operators with custom tooling are the scarcest specialty in offensive security — sub-1,000 globally. My contributions: [adversary emulation framework / specific engagement results / tool development]. Mandiant Red Team, CrowdStrike OverWatch, and FAANG internal teams are recruiting at $250K-$400K.',
    countersScript: 'I\'m asking for $X base (75th percentile), retention RSU grant of $Y, and protected time for public research/conference talks (1 week/quarter + travel budget).',
    walkAwayLine: 'I have a strong inbound from [Mandiant / Google PRT / Meta Red Team] at substantially higher comp. The work here has been excellent — I need to see meaningful movement to stay.',
  },
  cryptography_engineer: {
    strongOpener: 'I want to align my compensation with the cryptography engineer market — post-quantum cryptography migration is driving acute demand and salaries are rising 20-30% YoY in this niche.',
    leverageContext: 'Cryptography engineers with hands-on PQC migration experience are sub-200 globally. My work this year: [protocol audit / library contribution / PQC migration design]. CloudFlare, AWS, and Google are hiring at $300K-$450K total comp. Replacement cost: 6-12 months.',
    countersScript: 'I\'m asking for $X base (matches market 75th percentile for PQC-experienced engineers), conference budget (Real World Crypto, IACR), and research time (15% protected for publishable work).',
    walkAwayLine: 'I have approaches from [CloudFlare Crypto Team / AWS Cryptography / Google PQC Group] at $X above current. The work here is important to me — but the gap needs to close.',
  },
  incident_response_engineer: {
    strongOpener: 'After leading [X major incidents this year / Y forensic engagements / Z customer-facing IRs], I\'d like to discuss aligning my comp with the senior IR engineer market.',
    leverageContext: 'Senior IR engineers with GCFA/GREM + breach response track record are extremely scarce. My contributions: [specific incidents, MTTC reduction, customer outcomes]. Mandiant Consulting and CrowdStrike Services hire senior IR engineers at $200K-$280K base + bonus.',
    countersScript: 'I\'m asking for $X base, on-call differential of Y%, and budget for advanced training (SANS DFIR Summit + 1 elective course per year).',
    walkAwayLine: 'I have an inbound from [Mandiant / CrowdStrike Services / Stroz Friedberg]. The work here has built deep expertise — I want to continue but need market-rate comp.',
  },
  ot_security_engineer: {
    strongOpener: 'OT security engineers with hands-on ICS protocol experience are in 5:1 demand-to-supply ratio (ISC2 2026). I want to align my compensation with that scarcity.',
    leverageContext: 'My GICSP + hands-on experience with [Modbus / DNP3 / specific PLC platforms / specific industry] is rare. Specific contributions: [air-gap integrity / segmentation rollout / IR for ICS incident]. Dragos, Claroty, and Nozomi are hiring at $200K-$280K.',
    countersScript: 'I\'m asking for $X base (matches OT security market 75th percentile), travel budget for on-site engagements, and SANS ICS training renewal annually.',
    walkAwayLine: 'I have inbound from [Dragos / Claroty / industry OT consulting practice] at significantly higher total comp. I\'d like to find a way to stay.',
  },
  zero_trust_architect: {
    strongOpener: 'After leading [ZTNA rollout for X users / SASE integration / specific architecture initiative], I\'d like to discuss my comp in the senior zero trust architect market.',
    leverageContext: 'Zero trust architects with production rollout experience earn $220K-$340K at the 75th percentile. My specific track record: [ZTNA migration outcomes, user impact, cost savings]. Zscaler, Cloudflare, and Palo Alto Networks are actively recruiting.',
    countersScript: 'I\'m asking for $X base, vendor certification budget (Zscaler ZDX, Cloudflare One Architect), and protected time for conference participation.',
    walkAwayLine: 'I have an offer from [Zscaler / Cloudflare / customer-facing architect role] at meaningfully higher comp. I\'d prefer to continue here.',
  },
};
