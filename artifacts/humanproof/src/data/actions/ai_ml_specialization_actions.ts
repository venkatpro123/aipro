// ai_ml_specialization_actions.ts — v37.0 Multi-Industry Role Intelligence
// AI/ML Specialization (10 roles) — frontier-lab calibrated 2026

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

// ── AI/ML SPECIALIZATION ROLES ────────────────────────────────────────────────

export const ACTION_DB_AI_ML_SPECIALIZATION: Record<string, BracketPool> = {

  llm_engineer: pool(
    {
      title: 'Ship a Public Anthropic Workbench / OpenAI Playground Eval Suite This Week',
      description: 'Build and publish a public GitHub repo containing a structured eval suite for Claude API and the OpenAI Chat Completions API: 50+ tasks covering tool-use, structured output (JSON mode / Anthropic tool schemas), long-context retrieval, and agentic loops. Use Anthropic\'s prompt caching headers and OpenAI\'s Batch API to keep costs under $40. Pin the repo, post a thread on X demonstrating cost-per-task and latency curves vs. Claude 4.6 / GPT-5 / Gemini 2.5. This single artifact is currently the most efficient signal to recruiting teams at Anthropic, OpenAI, and Scale AI that you can ship end-to-end LLM systems.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '7 days', priority: 'Critical',
    },
    {
      title: 'Build a Production-Grade RAG + Agentic System on LangGraph + Claude API',
      description: 'Mid-level LLM engineers are commodified at the prompt-stitching layer — durable career protection comes from shipping production-grade agentic systems. Build a LangGraph state-machine agent using Claude Sonnet 4.6 for planning and Haiku for retrieval steps, with Pinecone or Weaviate for the vector store and LlamaIndex for ingest. Demonstrate: (1) tool-use loops with retry, (2) prompt caching to cut inference cost 70%, (3) a tracing layer (LangSmith or Phoenix). Companies hiring LLM engineers (Notion, Harvey, Hebbia, Glean) screen specifically for production deployments, not notebook demos.',
      layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Run a Frontier-Lab Interview Loop While Employed to Reset Your Market Comp',
      description: 'Senior LLM engineers at Anthropic, OpenAI, DeepMind, and xAI are clearing $400K–$650K total comp in 2026 vs. $230K–$320K at mid-tier startups. Even if you intend to stay, running a full loop at one frontier lab + one applied AI scaleup (Harvey, Glean, Sierra, Decagon, Cursor, Anysphere) resets your internal comp benchmark and gives you a hard offer to negotiate against. Expect 4–6 weeks: a coding screen (PyTorch + transformer internals), an LLM systems design round, and a research-engineering depth interview. Start outreach this week — referral pipelines at frontier labs close offers in 5–6 weeks.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 42, deadline: '14 days — begin outreach', priority: 'Critical',
    },
    {
      title: 'Author or Co-Author One Technical Post on RLHF / DPO / Constitutional AI Internals',
      description: 'A single deep technical post explaining DPO loss formulation, Anthropic\'s constitutional AI training loop, or LoRA adapter merging — published on your personal site or via Anthropic\'s / OpenAI\'s developer programs — is worth more than 6 months of LeetCode for senior LLM roles. Frontier-lab hiring managers actively read these posts; many engineers report being recruited directly from a single high-quality write-up.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 22, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Complete the Hugging Face NLP Course + DeepLearning.AI LLM Specialization',
      description: 'For breadth coverage of the LLM stack — tokenizers, attention variants, fine-tuning APIs, RAG patterns — work through Hugging Face\'s free NLP course (40 hours) and Andrew Ng\'s LLM-focused DeepLearning.AI tracks. These are now treated as table stakes by recruiting teams; completing both verifiably (HF certificate + Coursera completion) closes the most common rejection vector for self-taught LLM engineers.',
      layerFocus: 'L3 · Skills', riskReductionPct: 16, deadline: '60 days', priority: 'Medium',
    },
  ),

  prompt_engineer: pool(
    {
      title: 'Migrate Out of Pure Prompting Into Evals + Pipelines This Quarter',
      description: 'Pure prompt engineering is the single most exposed role in the AI stack — Claude 4.6 / GPT-5 meta-prompting tools, Anthropic\'s prompt generator, and DSPy are commodifying prompt drafting. Junior-level prompt engineers face a 24-month displacement risk. Pivot immediately: own a production eval harness (Promptfoo, Anthropic Workbench Evals, OpenAI Evals), wire it to CI, and lead the structured-output JSON schema design. The defensible role is "applied LLM systems engineer who also writes prompts" — not the inverse.',
      layerFocus: 'L3 · Skills', riskReductionPct: 40, deadline: '7 days — claim eval ownership', priority: 'Critical',
    },
    {
      title: 'Become the Owner of a Constitutional AI / Safety Prompt Suite',
      description: 'Mid-level prompt engineers protect their roles by owning a domain that the AI cannot self-improve into: a constitutional prompt set for refusals, jailbreak resistance, and policy compliance, evaluated against Anthropic\'s harmlessness benchmarks and OpenAI\'s moderation API. This work cannot be ChatGPT-prompted into existence — it requires red-team thinking, regulatory awareness (EU AI Act, NIST AI RMF), and incident review. Companies shipping consumer LLM products (Character.AI, Replika, Inflection successors) actively recruit for this niche at $180K–$240K.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 32, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Publish a Public Prompt-Library + Eval Repo and Make Yourself a Hireable Author',
      description: 'Senior prompt engineers in 2026 are essentially evaluation-driven product engineers. Publish a public GitHub repo containing: (a) a prompt taxonomy for your domain (legal, medical, code, customer support), (b) a paired eval harness using Anthropic\'s Workbench Evals + OpenAI Evals, (c) before/after metrics on production tasks. Anthropic\'s applied-AI team, OpenAI Solutions, and Scale AI Forward Deployed all hire heavily from authors of credible public prompt artifacts.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 30, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Add a LangChain or LangGraph Production Certification + Tool-Use Proficiency',
      description: 'Prompt engineers who can wire prompts into tool-use loops, function calling (Anthropic tool schemas + OpenAI tools), and multi-step agents earn 50–80% more than prompt-only practitioners. Complete LangChain\'s production certification ($395, 12 hours) and ship a tool-using agent against the Claude API and Anthropic\'s computer-use beta within 14 days.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '21 days', priority: 'High',
    },
    {
      title: 'Document Your Token-Efficiency and Latency Optimization Wins',
      description: 'Prompt engineers who can show 40%+ token reduction with quality parity (via prompt caching, structured output, model routing across Haiku/Sonnet/Opus) deliver direct cost savings. Build a one-pager showing $X/month inference savings on production traffic — this is the single best artifact for either internal promotion or external offers.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 18, deadline: '14 days', priority: 'Medium',
    },
  ),

  ml_research_scientist: pool(
    {
      title: 'Get One Paper Onto arXiv This Quarter — Targeted at NeurIPS 2026 or ICLR 2027',
      description: 'For an ML research scientist, a single first-author arXiv paper with traction is the most efficient career insurance available. Choose an underexplored axis — MoE routing, long-context attention, RLHF reward modeling, or interpretability — execute a focused experiment, and put it on arXiv targeting NeurIPS 2026 (June deadline) or ICLR 2027 (October). Frontier-lab hiring is now publication-gated: Anthropic, DeepMind, FAIR, and Meta Superintelligence Lab filter candidates against authorship at NeurIPS/ICML/ICLR. A single accepted paper resets your market band by $150K–$300K total comp.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 45, deadline: '60 days — submit draft', priority: 'Critical',
    },
    {
      title: 'Schedule a Frontier Lab Research Round (Anthropic, DeepMind, OpenAI, Meta FAIR)',
      description: 'Mid-career ML research scientists clearing $400K–$650K base + equity at frontier labs are 2–3× compensated vs. applied scientist roles at tier-2 startups. The interview loop (research presentation + open-ended depth interview + 1:1 with senior research engineers) takes 6–10 weeks. Run at least one full loop annually — even without intent to move, the offer resets your internal comp benchmark and gives leverage. Anthropic\'s research-scientist offers in 2026 are reportedly $300K–$500K base + $400K–$1M+ equity over 4 years.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 40, deadline: '14 days — request referrals', priority: 'Critical',
    },
    {
      title: 'Build and Publish an Open Reproduction of a Recent Frontier Paper',
      description: 'Senior research scientists differentiate by demonstrating ability to ship end-to-end: reproduce a recent breakthrough (e.g., a Gemma 3 / Llama 4 finetune, a Constitutional DPO reproduction, an MoE router from scratch in JAX) and publish weights + code. EleutherAI, Together AI, and Mistral talent teams actively recruit reproducers. This is also the strongest signal to research directors hiring for new lab spin-outs (Reflection AI, SSI, Thinking Machines lineage groups).',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 36, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Set Up Co-Author Collaborations with One External Academic and One Industrial Lab',
      description: 'ML research scientists with co-authors at both academic labs (Stanford, MIT, CMU, Berkeley) and industrial labs (DeepMind, FAIR, Allen AI) have 2–3× the inbound recruiting volume. Use NeurIPS / ICML / ICLR poster sessions to seed co-authorship discussions. A single accepted co-author paper is worth 12+ months of internal output for compensation purposes.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 28, deadline: '90 days', priority: 'High',
    },
    {
      title: 'Maintain Daily Reading on arXiv + Semantic Scholar Alerts on Your Subarea',
      description: 'Frontier ML research moves on a 6–8 week cycle; falling 12 weeks behind kills your hireability. Set up arXiv subject alerts (cs.LG, cs.CL, stat.ML), Semantic Scholar follow on the top 30 authors in your subarea, and a weekly 2-hour paper-reading habit. Maintain a public reading log — Anthropic and DeepMind recruiters explicitly use these as a screen.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: 'Ongoing', priority: 'Medium',
    },
  ),

  applied_ml_scientist: pool(
    {
      title: 'Lead One Cross-Functional ML Project With a Documented Business Outcome',
      description: 'Junior applied ML scientists collapse into "ML engineer with Jupyter notebooks" if they don\'t own end-to-end projects. Identify a P0 business metric (conversion, churn, latency, cost-per-inference), ship an ML solution, and document the lift — A/B tested, with confidence intervals. Companies hiring applied scientists (Stripe, Airbnb, Shopify, Doordash, Uber) screen for this specifically: \'Show me a project where your model moved a P&L line.\' One such project resets your market band by $50K–$120K base.',
      layerFocus: 'L3 · Skills', riskReductionPct: 34, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Become the In-House Expert on LLM-Augmented Classical ML Workflows',
      description: 'Mid-level applied scientists protect their roles by owning the LLM-augmented version of classical ML pipelines: feature generation via LLMs, synthetic data generation for low-data regimes, LLM-as-judge for evaluation, and zero-shot baselines via Claude / GPT-5 as competitive benchmarks before training. This is the highest-value applied ML subspecialty in 2026 — and it cannot be commoditized because it requires both classical ML rigor and LLM systems awareness.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 30, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Run a Frontier-Lab Applied Science Loop and a FAANG L6/L7 Loop in Parallel',
      description: 'Senior applied ML scientists at Anthropic Applied AI, OpenAI Solutions, Meta GenAI applied teams, and Google DeepMind applied research clear $450K–$700K total comp. Equivalent FAANG L6/L7 applied scientist roles clear $500K–$750K. Run loops at one of each. The cross-offer leverage typically lifts your current employer\'s counter by $80K–$200K base + equity refresh, regardless of which offer you accept.',
      layerFocus: 'L5 · Negotiation', riskReductionPct: 42, deadline: '14 days — outreach', priority: 'Critical',
    },
    {
      title: 'Add JAX + PyTorch Dual Fluency for Frontier-Lab Compatibility',
      description: 'Anthropic, DeepMind, and X.AI use JAX-heavy stacks; OpenAI, Meta, and most applied teams are PyTorch-native. Applied scientists with credible JAX experience (a public Flax/Haiku project or contribution) double their addressable employer set. Complete one substantive JAX project — a Transformer from scratch, an RL agent, or a diffusion model — and add it to your portfolio.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '60 days', priority: 'High',
    },
    {
      title: 'Build Internal Tooling That Captures Model Performance and Cost Telemetry',
      description: 'Applied scientists who ship the telemetry layer (metrics on accuracy, drift, latency, inference cost per request via vLLM / TGI) become institutionally embedded. This work is high-leverage and underrated by managers — but in layoff scenarios, the person who owns observability is rarely cut.',
      layerFocus: 'L5 · Personal Protection', riskReductionPct: 20, deadline: '30 days', priority: 'Medium',
    },
  ),

  computer_vision_engineer: pool(
    {
      title: 'Ship a Multimodal Vision-Language Project Using Claude 4.6 Vision or GPT-5-V',
      description: 'Pure CV is being absorbed into multimodal foundation models. Junior CV engineers without multimodal experience face shrinking opportunity. Ship a project that uses Claude\'s vision API or GPT-5-V to handle the perception layer, and reserve your custom training for tasks where foundation models fail (industrial defect detection, medical imaging, geospatial). Publish on GitHub with a clear "where I used foundation models vs. where I trained custom" decision matrix. This signals applied-CV maturity.',
      layerFocus: 'L3 · Skills', riskReductionPct: 36, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Specialize Into a CV Vertical That Multimodal Models Cannot Subsume',
      description: 'Mid-level CV engineers should pivot to verticals where foundation models structurally fail: real-time embedded inference (Jetson, Coral, custom ASICs), surgical video (HIPAA + accuracy requirements), autonomous-vehicle perception (LiDAR fusion, sensor calibration), or satellite/geospatial CV. Compensation in these niches is $220K–$380K base — well above general CV roles ($160K–$240K). Top employers: Tesla AI, Waymo, Cruise (post-restructure), Cobalt Robotics, Skydio, Planet Labs.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Author a CVPR / ICCV Workshop Paper or a Strong Public Reproduction',
      description: 'Senior CV engineers in 2026 differentiate via a CVPR/ICCV/ECCV publication or a high-traffic public reproduction. Target a workshop paper (lower acceptance bar than main track) at CVPR 2027 or ICCV 2027. Alternatively, reproduce a recent breakthrough — Segment Anything 3, DINOv3, a recent diffusion-vision model — with weights and code on Hugging Face. Either artifact resets your market band.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 32, deadline: '120 days', priority: 'Critical',
    },
    {
      title: 'Master One Production CV Deployment Stack: ONNX + TensorRT + Triton',
      description: 'CV engineers who can ship production inference (ONNX export, TensorRT quantization, Triton Inference Server deployment, edge deployment via OpenVINO or CoreML) earn 40–60% more than research-only CV engineers. Complete a project demonstrating end-to-end deployment with latency budgets and document in a portfolio post.',
      layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Stay Current on Vision Foundation Models: SAM, DINO, CLIP Successors',
      description: 'Vision foundation models are the new baseline — engineers who don\'t know SAM 3, DINOv3, SigLIP, and the latest CLIP/BLIP family fail screens. Spend 4 hours per week reading new arXiv vision papers and updating a public table of foundation-model capabilities, license, and inference cost. This artifact is itself a recruiting magnet.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: 'Ongoing', priority: 'Medium',
    },
  ),

  nlp_engineer: pool(
    {
      title: 'Migrate Off Pre-LLM NLP Pipelines and Own a Production LLM-Native Workflow',
      description: 'Junior NLP engineers still working in spaCy / NLTK / scikit-learn pipelines without LLM augmentation face a 24-month displacement risk. Pivot immediately to an LLM-native NLP workflow: replace your classification pipeline with Claude / GPT-5 zero-shot + a small distilled student model (DistilBERT, TinyLlama), evaluate cost-per-prediction, and document the migration. This is now the standard interview ask for NLP engineer roles at Notion, Linear, Anthropic Applied, and OpenAI Solutions.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Own a Production RAG System on a Real Document Corpus With Citation Quality Metrics',
      description: 'Mid-level NLP engineers protect their seats by owning RAG infrastructure: ingest pipelines (LlamaIndex, Unstructured.io), vector DB ops (Pinecone, Weaviate, pgvector), retrieval evaluation (precision@k, MRR, hallucination rates with citation grounding), and reranker tuning (Cohere Rerank 3, Voyage AI). Companies like Hebbia, Glean, Sana Labs, and Harvey hire heavily for this profile at $220K–$340K base.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 34, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Publish at an EMNLP or ACL Workshop or Author a Major Open Dataset',
      description: 'Senior NLP engineers in 2026 demonstrate domain authority via either a workshop paper at EMNLP / ACL / NAACL, or a widely used open dataset on Hugging Face. Target the EMNLP 2026 workshop deadline (typically July). Alternatively, curate and publish a high-quality eval set for your domain — a single dataset with 1k+ downloads is hireability gold for senior NLP roles.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 30, deadline: '90 days', priority: 'Critical',
    },
    {
      title: 'Add Fluency in LoRA / QLoRA Fine-Tuning and Quantization for Domain Adaptation',
      description: 'NLP engineers who can fine-tune open-weight models (Llama 4, Qwen 3, Mistral Large) via LoRA / QLoRA, evaluate against domain benchmarks, and ship via vLLM in production are paid 35–50% more than NLP engineers limited to API consumption. Complete a fine-tune project end-to-end and post the run on Weights & Biases.',
      layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Build a Personal Newsletter or Reading Log on NLP Research',
      description: 'NLP moves at a 4–6 week pace. A consistent reading log (substack / personal site) on EMNLP/ACL/ICLR papers, with your synthesis, builds inbound recruiting from research-heavy teams. Even 200 subscribers in your niche creates a hireability moat.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 16, deadline: 'Ongoing', priority: 'Medium',
    },
  ),

  reinforcement_learning_engineer: pool(
    {
      title: 'Ship an RLHF or DPO Reproduction on an Open-Weight Model This Quarter',
      description: 'RL engineering is the scarcest skill in the post-training stack — frontier labs (Anthropic, OpenAI, DeepMind, Meta Superintelligence) are bottlenecked on RL talent. Junior RL engineers without a credible RLHF reproduction face slow hireability. Pick an open model (Llama 4, Qwen 3), implement a DPO or KTO post-training run (TRL library), evaluate on AlpacaEval / MT-Bench / Anthropic\'s HHH evals, and publish weights + write-up. A single credible RLHF artifact opens frontier-lab interview loops.',
      layerFocus: 'L3 · Skills', riskReductionPct: 42, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Specialize Into Frontier-Relevant RL: RLHF, RLAIF, or Constitutional AI Post-Training',
      description: 'Mid-level RL engineers should ignore classical RL (Atari, MuJoCo) — the demand is in post-training: RLHF reward models, RLAIF (Anthropic\'s constitutional approach), DPO/IPO/KTO variants, process supervision (PRM), and offline RL on human preference data. Companies hiring: Anthropic (post-training team), OpenAI (RL team), DeepMind (Gemini post-training), Scale AI Data Engine, Surge AI. Base compensation $300K–$500K, total comp $500K–$900K at frontier labs.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Author or Co-Author an RL Paper Targeted at NeurIPS 2026 RL Track',
      description: 'Senior RL engineers are hired on publication record. Target a NeurIPS 2026 paper — even a focused empirical paper on reward hacking, KL regularization, or DPO failure modes is publishable. Frontier labs filter senior RL hires on NeurIPS / ICML authorship. A single accepted paper at a top venue resets total comp by $200K–$400K.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 40, deadline: '60 days — submit draft', priority: 'Critical',
    },
    {
      title: 'Build Distributed-Training Fluency: DeepSpeed, FSDP, Megatron-LM',
      description: 'RL engineers who can scale training across multi-GPU clusters (FSDP, DeepSpeed ZeRO-3, Megatron-LM 3D parallelism) are 10× more valuable than single-GPU practitioners. Run at least one distributed fine-tuning job on rented A100/H100 clusters (Together AI, Lambda Labs, RunPod) and document the run.',
      layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Track Anthropic / OpenAI / DeepMind Public RL Research Weekly',
      description: 'The post-training field publishes a major paper every 1–2 weeks. Maintain weekly tracking of Anthropic\'s alignment papers, OpenAI\'s RL releases, and DeepMind\'s Gemini post-training notes. A public synthesis (newsletter / log) is a credible signal for RL roles.',
      layerFocus: 'L3 · Skills', riskReductionPct: 18, deadline: 'Ongoing', priority: 'Medium',
    },
  ),

  ai_safety_researcher: pool(
    {
      title: 'Publish on AI Alignment Forum + Apply to Anthropic / OpenAI / DeepMind Safety This Month',
      description: 'AI safety research is the scarcest, highest-compensation niche in ML in 2026 — frontier labs are budget-unconstrained on safety hiring. Junior researchers without public alignment writing face slower entry. Publish one substantive post on AI Alignment Forum (alignmentforum.org) or LessWrong on interpretability, deceptive alignment, scalable oversight, or RLHF failure modes — and apply directly to Anthropic\'s Alignment team, OpenAI\'s Superalignment / Safety Systems, DeepMind\'s Scalable Alignment, and Apollo Research / Redwood Research / METR. Junior safety researchers clear $250K–$400K base.',
      layerFocus: 'L3 · Skills', riskReductionPct: 44, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Run Interpretability Experiments on Open-Weight Models — Sparse Autoencoders, Circuit Analysis',
      description: 'Mid-career safety researchers should pivot into mechanistic interpretability: train sparse autoencoders on Llama or Gemma activations, run circuit-level analysis using TransformerLens, and reproduce results from Anthropic\'s interpretability team or DeepMind\'s mechanistic interpretability papers. Mid-level safety researchers at Anthropic / DeepMind / Apollo clear $400K–$650K total comp. The interpretability subfield is the most active hiring area within safety.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 42, deadline: '60 days', priority: 'Critical',
    },
    {
      title: 'Lead a Safety Paper Targeted at NeurIPS / ICML Safety Workshops or ICLR Alignment Track',
      description: 'Senior AI safety researchers are paid for publishable rigor. Target a paper at NeurIPS 2026 Safety Workshop, ICML 2026 Alignment Track, or ICLR 2027 — on dangerous capability evaluations, scalable oversight, RLHF reward hacking, or deceptive alignment. A single accepted paper at a top venue, combined with industry safety experience, commands $500K–$900K total comp at Anthropic / OpenAI Safety / DeepMind.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 38, deadline: '120 days', priority: 'Critical',
    },
    {
      title: 'Engage With the Policy Side: NIST AI RMF, EU AI Act, UK AISI',
      description: 'AI safety researchers with policy fluency (NIST AI Risk Management Framework, EU AI Act enforcement, UK AI Safety Institute, U.S. AISI) command premium compensation at think tanks (RAND, GovAI, CSET) and frontier labs\' policy teams. Read the AISI evaluation reports and write one structured response — published or shared internally.',
      layerFocus: 'L3 · Skills', riskReductionPct: 26, deadline: '45 days', priority: 'High',
    },
    {
      title: 'Build Relationships in the Safety Community: MATS, ARENA, Constellation',
      description: 'AI safety hiring runs heavily through community pipelines: MATS (ML Alignment & Theory Scholars), ARENA (Alignment Research Engineer Accelerator), Constellation, and SERI MATS. Even mid-career researchers should attend at least one community event annually and maintain visible engagement on AI Alignment Forum.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 22, deadline: '90 days', priority: 'Medium',
    },
  ),

  model_evaluation_engineer: pool(
    {
      title: 'Build and Open-Source a Public Evaluation Harness on a Domain Benchmark',
      description: 'Model evaluation is the highest-leverage role in 2026 — every frontier lab needs evals, and they\'re structurally underbuilt. Junior eval engineers ship a public evaluation harness for a specific domain: legal reasoning (LegalBench), medical QA (MedQA, MultiMedQA), code (SWE-bench Verified, LiveCodeBench), math (MATH, AIME), or agentic tasks (GAIA, OSWorld). Publish on GitHub with eval results across Claude / GPT-5 / Gemini / open models. This artifact alone opens senior interview loops at Anthropic Evals, OpenAI Evals, METR, and Scale AI.',
      layerFocus: 'L3 · Skills', riskReductionPct: 38, deadline: '30 days', priority: 'Critical',
    },
    {
      title: 'Own Dangerous Capability Evaluations or Agentic-Task Evals',
      description: 'Mid-level eval engineers protect their roles by owning the evaluations that frontier labs need but cannot easily build: dangerous capability evals (bio, cyber, autonomy), agentic-task harnesses (Inspect AI, OpenAI Evals, Anthropic\'s eval frameworks), and longitudinal benchmarks. Demand is acute: Anthropic, OpenAI, METR, UK AISI, and US AISI all hire heavily here at $300K–$500K base.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Author or Contribute to a Major Public Eval — Co-Authored With a Frontier Lab',
      description: 'Senior eval engineers become recognized via authorship of widely cited evals — SWE-bench, GAIA, AgentBench, BIG-Bench Hard, MMLU-Pro lineage. Initiate a co-authored eval project with a frontier lab or academic group. Even one accepted paper at NeurIPS Datasets & Benchmarks track resets your market band.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 34, deadline: '120 days', priority: 'Critical',
    },
    {
      title: 'Master Statistical Rigor: Bootstrap CIs, Inter-Rater Reliability, Eval Validity',
      description: 'Eval engineers who can defend eval validity — confidence intervals, sample size justification, inter-rater agreement (Cohen\'s κ), eval contamination detection — are paid 30–50% more than eval engineers who only ship pass/fail metrics. Read METR\'s evaluation methodology and Anthropic\'s eval validity papers, then audit your existing evals.',
      layerFocus: 'L3 · Skills', riskReductionPct: 22, deadline: '30 days', priority: 'High',
    },
    {
      title: 'Stay Current on Frontier Eval Releases: METR, AISI, Anthropic, OpenAI',
      description: 'METR\'s autonomy evals, AISI\'s dangerous-capability evals, and Anthropic\'s / OpenAI\'s eval frameworks ship monthly. Maintain a weekly review habit and a public synthesis. Eval recruiting heavily favors candidates who can cite the current state of the art across labs.',
      layerFocus: 'L3 · Skills', riskReductionPct: 16, deadline: 'Ongoing', priority: 'Medium',
    },
  ),

  ai_red_teamer: pool(
    {
      title: 'Publish a Public Red-Team Report Against a Frontier Model API',
      description: 'AI red-teaming is the fastest-growing safety-adjacent role in 2026 — frontier labs, AISI, and enterprise customers all need red-team capacity. Junior red-teamers publish a structured report against Claude / GPT-5 / Gemini on jailbreaks, prompt injection, indirect prompt injection (especially against tool-using agents), or capability elicitation. Use Anthropic\'s vulnerability disclosure program and OpenAI\'s preparedness framework as targets. A single published, technically rigorous report opens interview loops at Anthropic, OpenAI Preparedness, METR, Microsoft AI Red Team, and Trail of Bits.',
      layerFocus: 'L3 · Skills', riskReductionPct: 40, deadline: '21 days', priority: 'Critical',
    },
    {
      title: 'Specialize Into Agentic Red-Teaming + Prompt Injection at Scale',
      description: 'Mid-level red-teamers should own the agentic attack surface: prompt injection against tool-using agents (Anthropic computer-use, OpenAI Operator, browser agents), indirect injection via retrieved documents / web pages, multi-turn deception, and capability elicitation under safety training. This subfield is the most demanded red-team niche — Anthropic, OpenAI Preparedness, and METR are all hiring heavily at $250K–$420K base.',
      layerFocus: 'L5 · Career Resilience', riskReductionPct: 36, deadline: '45 days', priority: 'Critical',
    },
    {
      title: 'Author a Conference Paper or AISI / METR Technical Report on Red-Team Methodology',
      description: 'Senior red-teamers are paid on documented research output. Target a paper at NeurIPS Safety Workshop, SaTML, or a USENIX Security adversarial-ML workshop — or contribute to a public AISI / METR / Anthropic red-team report. A single technical publication on red-team methodology resets your market band by $100K–$250K.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 34, deadline: '120 days', priority: 'Critical',
    },
    {
      title: 'Cross-Train in Traditional Application Security: OWASP LLM Top 10, MITRE ATLAS',
      description: 'Red-teamers with traditional appsec fluency (OWASP LLM Top 10, MITRE ATLAS, web/API offensive security) are paid 30–50% more because they can integrate with enterprise security programs. Complete an OSCP-equivalent certification or contribute to MITRE ATLAS / OWASP LLM Top 10.',
      layerFocus: 'L3 · Skills', riskReductionPct: 24, deadline: '60 days', priority: 'High',
    },
    {
      title: 'Engage With the Safety / Security Community: DEF CON AI Village, SaTML',
      description: 'AI red-team hiring runs through community channels: DEF CON AI Village, SaTML, BlackHat AI tracks, and the alignment forum red-team threads. Attend one event annually and maintain visible engagement — Anthropic and OpenAI Preparedness recruiters explicitly source here.',
      layerFocus: 'L5 · Market Positioning', riskReductionPct: 18, deadline: '90 days', priority: 'Medium',
    },
  ),
};

// ── ALIAS MAP ADDITIONS ────────────────────────────────────────────────────────

export const ALIAS_ADDITIONS_AI_ML_SPECIALIZATION: Record<string, { canonicalKey: string; displayRole: string }> = {
  // LLM Engineer variants
  'llm engineer': { canonicalKey: 'llm_engineer', displayRole: 'LLM Engineer' },
  'large language model engineer': { canonicalKey: 'llm_engineer', displayRole: 'Large Language Model Engineer' },
  'generative ai engineer': { canonicalKey: 'llm_engineer', displayRole: 'Generative AI Engineer' },
  'gen ai engineer': { canonicalKey: 'llm_engineer', displayRole: 'Gen AI Engineer' },
  'foundation model engineer': { canonicalKey: 'llm_engineer', displayRole: 'Foundation Model Engineer' },
  'applied llm engineer': { canonicalKey: 'llm_engineer', displayRole: 'Applied LLM Engineer' },
  'genai engineer': { canonicalKey: 'llm_engineer', displayRole: 'GenAI Engineer' },

  // Prompt Engineer variants
  'prompt engineer': { canonicalKey: 'prompt_engineer', displayRole: 'Prompt Engineer' },
  'prompt designer': { canonicalKey: 'prompt_engineer', displayRole: 'Prompt Designer' },
  'ai prompt engineer': { canonicalKey: 'prompt_engineer', displayRole: 'AI Prompt Engineer' },
  'conversational ai designer': { canonicalKey: 'prompt_engineer', displayRole: 'Conversational AI Designer' },
  'llm prompt engineer': { canonicalKey: 'prompt_engineer', displayRole: 'LLM Prompt Engineer' },

  // ML Research Scientist variants
  'ml research scientist': { canonicalKey: 'ml_research_scientist', displayRole: 'ML Research Scientist' },
  'machine learning research scientist': { canonicalKey: 'ml_research_scientist', displayRole: 'Machine Learning Research Scientist' },
  'research scientist ml': { canonicalKey: 'ml_research_scientist', displayRole: 'Research Scientist (ML)' },
  'ai research scientist': { canonicalKey: 'ml_research_scientist', displayRole: 'AI Research Scientist' },
  'deep learning research scientist': { canonicalKey: 'ml_research_scientist', displayRole: 'Deep Learning Research Scientist' },
  'foundation model researcher': { canonicalKey: 'ml_research_scientist', displayRole: 'Foundation Model Researcher' },
  'ml researcher': { canonicalKey: 'ml_research_scientist', displayRole: 'ML Researcher' },

  // Applied ML Scientist variants
  'applied ml scientist': { canonicalKey: 'applied_ml_scientist', displayRole: 'Applied ML Scientist' },
  'applied scientist': { canonicalKey: 'applied_ml_scientist', displayRole: 'Applied Scientist' },
  'applied machine learning scientist': { canonicalKey: 'applied_ml_scientist', displayRole: 'Applied Machine Learning Scientist' },
  'applied ai scientist': { canonicalKey: 'applied_ml_scientist', displayRole: 'Applied AI Scientist' },
  'machine learning scientist': { canonicalKey: 'applied_ml_scientist', displayRole: 'Machine Learning Scientist' },
  'ml scientist': { canonicalKey: 'applied_ml_scientist', displayRole: 'ML Scientist' },

  // Computer Vision Engineer variants
  'computer vision engineer': { canonicalKey: 'computer_vision_engineer', displayRole: 'Computer Vision Engineer' },
  'cv engineer': { canonicalKey: 'computer_vision_engineer', displayRole: 'CV Engineer' },
  'computer vision researcher': { canonicalKey: 'computer_vision_engineer', displayRole: 'Computer Vision Researcher' },
  'vision ai engineer': { canonicalKey: 'computer_vision_engineer', displayRole: 'Vision AI Engineer' },
  'perception engineer': { canonicalKey: 'computer_vision_engineer', displayRole: 'Perception Engineer' },
  'image processing engineer': { canonicalKey: 'computer_vision_engineer', displayRole: 'Image Processing Engineer' },

  // NLP Engineer variants
  'nlp engineer': { canonicalKey: 'nlp_engineer', displayRole: 'NLP Engineer' },
  'natural language processing engineer': { canonicalKey: 'nlp_engineer', displayRole: 'Natural Language Processing Engineer' },
  'nlp scientist': { canonicalKey: 'nlp_engineer', displayRole: 'NLP Scientist' },
  'computational linguist': { canonicalKey: 'nlp_engineer', displayRole: 'Computational Linguist' },
  'nlu engineer': { canonicalKey: 'nlp_engineer', displayRole: 'NLU Engineer' },
  'text ml engineer': { canonicalKey: 'nlp_engineer', displayRole: 'Text ML Engineer' },

  // RL Engineer variants
  'reinforcement learning engineer': { canonicalKey: 'reinforcement_learning_engineer', displayRole: 'Reinforcement Learning Engineer' },
  'rl engineer': { canonicalKey: 'reinforcement_learning_engineer', displayRole: 'RL Engineer' },
  'rlhf engineer': { canonicalKey: 'reinforcement_learning_engineer', displayRole: 'RLHF Engineer' },
  'post-training engineer': { canonicalKey: 'reinforcement_learning_engineer', displayRole: 'Post-Training Engineer' },
  'post training engineer': { canonicalKey: 'reinforcement_learning_engineer', displayRole: 'Post-Training Engineer' },
  'rl researcher': { canonicalKey: 'reinforcement_learning_engineer', displayRole: 'RL Researcher' },

  // AI Safety Researcher variants
  'ai safety researcher': { canonicalKey: 'ai_safety_researcher', displayRole: 'AI Safety Researcher' },
  'ai alignment researcher': { canonicalKey: 'ai_safety_researcher', displayRole: 'AI Alignment Researcher' },
  'alignment researcher': { canonicalKey: 'ai_safety_researcher', displayRole: 'Alignment Researcher' },
  'interpretability researcher': { canonicalKey: 'ai_safety_researcher', displayRole: 'Interpretability Researcher' },
  'mechanistic interpretability researcher': { canonicalKey: 'ai_safety_researcher', displayRole: 'Mechanistic Interpretability Researcher' },
  'safety researcher': { canonicalKey: 'ai_safety_researcher', displayRole: 'AI Safety Researcher' },

  // Model Evaluation Engineer variants
  'model evaluation engineer': { canonicalKey: 'model_evaluation_engineer', displayRole: 'Model Evaluation Engineer' },
  'ml evaluation engineer': { canonicalKey: 'model_evaluation_engineer', displayRole: 'ML Evaluation Engineer' },
  'evals engineer': { canonicalKey: 'model_evaluation_engineer', displayRole: 'Evals Engineer' },
  'evaluation engineer ai': { canonicalKey: 'model_evaluation_engineer', displayRole: 'AI Evaluation Engineer' },
  'llm evaluation engineer': { canonicalKey: 'model_evaluation_engineer', displayRole: 'LLM Evaluation Engineer' },
  'benchmark engineer': { canonicalKey: 'model_evaluation_engineer', displayRole: 'Benchmark Engineer' },

  // AI Red Teamer variants
  'ai red teamer': { canonicalKey: 'ai_red_teamer', displayRole: 'AI Red Teamer' },
  'ai red team engineer': { canonicalKey: 'ai_red_teamer', displayRole: 'AI Red Team Engineer' },
  'llm red teamer': { canonicalKey: 'ai_red_teamer', displayRole: 'LLM Red Teamer' },
  'ai security researcher': { canonicalKey: 'ai_red_teamer', displayRole: 'AI Security Researcher' },
  'adversarial ml researcher': { canonicalKey: 'ai_red_teamer', displayRole: 'Adversarial ML Researcher' },
  'ai vulnerability researcher': { canonicalKey: 'ai_red_teamer', displayRole: 'AI Vulnerability Researcher' },
};

// ── CANONICAL → ACTION GROUP ADDITIONS ────────────────────────────────────────

export const CANONICAL_GROUP_ADDITIONS_AI_ML_SPECIALIZATION: Record<string, string> = {
  llm_engineer: 'llm_engineer',
  prompt_engineer: 'prompt_engineer',
  ml_research_scientist: 'ml_research_scientist',
  applied_ml_scientist: 'applied_ml_scientist',
  computer_vision_engineer: 'computer_vision_engineer',
  nlp_engineer: 'nlp_engineer',
  reinforcement_learning_engineer: 'reinforcement_learning_engineer',
  ai_safety_researcher: 'ai_safety_researcher',
  model_evaluation_engineer: 'model_evaluation_engineer',
  ai_red_teamer: 'ai_red_teamer',
};

// ── DEMAND ADDITIONS ──────────────────────────────────────────────────────────

export const DEMAND_ADDITIONS_AI_ML_SPECIALIZATION: Record<string, {
  roleKey: string; roleName: string; demandIndex: number;
  demandTrend: string; jobOpeningsTrend: string; salaryTrend: string;
  timeToFillDays: number; yoyJobOpeningsChange: number;
  topHiringLocations: string[]; aiSubstitutionRisk: number;
  dataQuarter: string; calibrationNote: string;
}> = {
  llm_engineer: {
    roleKey: 'llm_engineer', roleName: 'LLM Engineer',
    demandIndex: 93, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 38, yoyJobOpeningsChange: 78,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Boston MA', 'Remote'],
    aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1',
    calibrationNote: 'Every Series B+ startup needs LLM engineers; supply lagging demand 3:1. Frontier-lab competition pulling senior comp up 35% YoY.',
  },
  prompt_engineer: {
    roleKey: 'prompt_engineer', roleName: 'Prompt Engineer',
    demandIndex: 78, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'stable',
    timeToFillDays: 22, yoyJobOpeningsChange: 18,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Remote', 'Austin TX', 'Seattle WA'],
    aiSubstitutionRisk: 0.28, dataQuarter: '2026-Q1',
    calibrationNote: 'Pure prompt-only roles facing absorption into LLM-engineer titles. Eval-focused prompt engineers protected; prompt-only contracting.',
  },
  ml_research_scientist: {
    roleKey: 'ml_research_scientist', roleName: 'ML Research Scientist',
    demandIndex: 96, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 95, yoyJobOpeningsChange: 52,
    topHiringLocations: ['San Francisco CA', 'London UK', 'New York NY', 'Mountain View CA', 'Zurich CH'],
    aiSubstitutionRisk: 0.03, dataQuarter: '2026-Q1',
    calibrationNote: 'Acute scarcity at frontier labs (Anthropic, OpenAI, DeepMind, Meta Superintelligence). Publication-gated hiring; comp ceiling rising 40%+ YoY.',
  },
  applied_ml_scientist: {
    roleKey: 'applied_ml_scientist', roleName: 'Applied ML Scientist',
    demandIndex: 91, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 55, yoyJobOpeningsChange: 42,
    topHiringLocations: ['San Francisco CA', 'Seattle WA', 'New York NY', 'Austin TX', 'Remote'],
    aiSubstitutionRisk: 0.06, dataQuarter: '2026-Q1',
    calibrationNote: 'FAANG L6/L7 applied scientist demand structurally elevated; LLM-augmented applied science a fast-growing subspecialty.',
  },
  computer_vision_engineer: {
    roleKey: 'computer_vision_engineer', roleName: 'Computer Vision Engineer',
    demandIndex: 88, demandTrend: 'rising', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 48, yoyJobOpeningsChange: 22,
    topHiringLocations: ['San Francisco CA', 'Mountain View CA', 'Austin TX', 'Pittsburgh PA', 'Boston MA'],
    aiSubstitutionRisk: 0.10, dataQuarter: '2026-Q1',
    calibrationNote: 'General CV softening as multimodal foundation models absorb perception. Embedded CV, AV perception, medical imaging structurally protected.',
  },
  nlp_engineer: {
    roleKey: 'nlp_engineer', roleName: 'NLP Engineer',
    demandIndex: 89, demandTrend: 'surging', jobOpeningsTrend: 'rising', salaryTrend: 'rising',
    timeToFillDays: 42, yoyJobOpeningsChange: 35,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'Seattle WA', 'Boston MA', 'Remote'],
    aiSubstitutionRisk: 0.08, dataQuarter: '2026-Q1',
    calibrationNote: 'Classical NLP being absorbed by LLMs; RAG-focused NLP engineers and post-training specialists in acute shortage.',
  },
  reinforcement_learning_engineer: {
    roleKey: 'reinforcement_learning_engineer', roleName: 'Reinforcement Learning Engineer',
    demandIndex: 94, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 82, yoyJobOpeningsChange: 68,
    topHiringLocations: ['San Francisco CA', 'London UK', 'Mountain View CA', 'New York NY', 'Zurich CH'],
    aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1',
    calibrationNote: 'Post-training is the frontier-lab bottleneck; RLHF/DPO/Constitutional AI specialists are scarcest ML talent segment in 2026.',
  },
  ai_safety_researcher: {
    roleKey: 'ai_safety_researcher', roleName: 'AI Safety Researcher',
    demandIndex: 95, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 110, yoyJobOpeningsChange: 88,
    topHiringLocations: ['San Francisco CA', 'London UK', 'Berkeley CA', 'New York NY', 'Mountain View CA'],
    aiSubstitutionRisk: 0.02, dataQuarter: '2026-Q1',
    calibrationNote: 'Highest-scarcity ML niche in 2026. Frontier labs + AISI + Apollo/METR/Redwood budget-unconstrained on safety hires; interpretability subfield acutest.',
  },
  model_evaluation_engineer: {
    roleKey: 'model_evaluation_engineer', roleName: 'Model Evaluation Engineer',
    demandIndex: 90, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 50, yoyJobOpeningsChange: 62,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'London UK', 'Seattle WA', 'Remote'],
    aiSubstitutionRisk: 0.05, dataQuarter: '2026-Q1',
    calibrationNote: 'Evals function structurally underbuilt at every frontier lab. Dangerous-capability and agentic-eval engineers in acutest demand.',
  },
  ai_red_teamer: {
    roleKey: 'ai_red_teamer', roleName: 'AI Red Teamer',
    demandIndex: 89, demandTrend: 'surging', jobOpeningsTrend: 'surging', salaryTrend: 'rising',
    timeToFillDays: 60, yoyJobOpeningsChange: 70,
    topHiringLocations: ['San Francisco CA', 'New York NY', 'London UK', 'Washington DC', 'Remote'],
    aiSubstitutionRisk: 0.04, dataQuarter: '2026-Q1',
    calibrationNote: 'Frontier-lab preparedness teams + AISI + enterprise red-team functions all expanding. Agentic red-team specialists are acutest niche.',
  },
};

// ── COMPENSATION ADDITIONS ─────────────────────────────────────────────────────

export const COMPENSATION_ADDITIONS_AI_ML_SPECIALIZATION: Record<string, Record<string, number>> = {
  // Base salaries (USD) — 2026 frontier-lab and applied AI market.
  // Total comp at frontier labs typically 1.6×–2.5× base via equity/bonus.
  llm_engineer: { '0-2': 200_000, '2-5': 260_000, '5-10': 340_000, '10-15': 410_000, '15+': 460_000 },
  prompt_engineer: { '0-2': 120_000, '2-5': 155_000, '5-10': 190_000, '10-15': 220_000, '15+': 245_000 },
  ml_research_scientist: { '0-2': 300_000, '2-5': 380_000, '5-10': 480_000, '10-15': 565_000, '15+': 650_000 },
  applied_ml_scientist: { '0-2': 220_000, '2-5': 285_000, '5-10': 370_000, '10-15': 450_000, '15+': 530_000 },
  computer_vision_engineer: { '0-2': 175_000, '2-5': 225_000, '5-10': 290_000, '10-15': 350_000, '15+': 400_000 },
  nlp_engineer: { '0-2': 185_000, '2-5': 240_000, '5-10': 315_000, '10-15': 380_000, '15+': 435_000 },
  reinforcement_learning_engineer: { '0-2': 240_000, '2-5': 310_000, '5-10': 410_000, '10-15': 500_000, '15+': 580_000 },
  ai_safety_researcher: { '0-2': 250_000, '2-5': 325_000, '5-10': 410_000, '10-15': 475_000, '15+': 540_000 },
  model_evaluation_engineer: { '0-2': 180_000, '2-5': 230_000, '5-10': 295_000, '10-15': 355_000, '15+': 410_000 },
  ai_red_teamer: { '0-2': 195_000, '2-5': 250_000, '5-10': 320_000, '10-15': 385_000, '15+': 440_000 },
};

// ── NEGOTIATION SCRIPT ADDITIONS ──────────────────────────────────────────────

export const NEGOTIATION_ADDITIONS_AI_ML_SPECIALIZATION: Record<string, {
  strongOpener: string; leverageContext: string;
  countersScript: string; walkAwayLine: string;
}> = {
  llm_engineer: {
    strongOpener: 'I\'ve been tracking my impact on our LLM stack — the prompt-caching migration I shipped cut inference cost $X/month, and the LangGraph agent I built is now in production handling Y requests/day. I\'d like to discuss whether my comp reflects frontier-lab market rates for this skill set.',
    leverageContext: 'Comparable LLM engineers at Anthropic, OpenAI, and applied AI scaleups (Harvey, Glean, Sierra, Cursor) are clearing $400K–$650K total comp. My production agentic-system experience and Claude API depth fit directly into those interview loops.',
    countersScript: 'I\'m asking for a base of $X plus an equity refresh — this brings me in line with the median Anthropic / OpenAI LLM-engineer band per Levels.fyi and recruiter conversations I\'ve had. I\'d also like ownership of our inference cost roadmap, which I\'m best positioned to lead.',
    walkAwayLine: 'I\'ve had an Anthropic recruiter screen scheduled for next week and a Harvey on-site offer at $X. I\'d prefer to stay given the systems I\'ve built here, but the gap needs to close for that to make sense.',
  },
  ml_research_scientist: {
    strongOpener: 'With my arXiv submission this quarter and the work I\'ve led on [research area], I\'d like to schedule a compensation discussion aligned with frontier-lab research-scientist bands.',
    leverageContext: 'My publication record + research direction now maps to the band Anthropic / DeepMind / OpenAI use for senior research scientists: $300K–$500K base + $400K–$1M equity over 4 years. The internal projects I\'ve shipped directly compete with that benchmark.',
    countersScript: 'I\'m asking for a base adjustment to $X with a fresh equity grant of $Y over 4 years. I\'d also like clearer support for conference travel and a publication-time budget — both are standard at frontier labs and material to my retention.',
    walkAwayLine: 'I\'ve had productive conversations with Anthropic\'s research team and a DeepMind referral pipeline that\'s active. I\'m committed to the research direction here, but I need our compensation to be defensible against those alternatives.',
  },
  applied_ml_scientist: {
    strongOpener: 'I\'d like to talk about my compensation given the cross-functional ML projects I\'ve owned this year and their documented impact on P&L metrics.',
    leverageContext: 'The fraud-detection model I shipped lifted recall by 14% with no precision loss, equating to $X annualized recovery. Comparable applied scientist roles at FAANG L6/L7 and Anthropic Applied AI clear $450K–$700K total comp; my project portfolio is directly aligned with that band.',
    countersScript: 'I\'m requesting a base of $X plus an equity refresh and clearer ownership of [domain]. I\'d also like a recurring conference budget for ICML/NeurIPS attendance — important for sustained applied-research depth.',
    walkAwayLine: 'I have an active loop with Anthropic Applied AI and a competing FAANG L6 offer that closes in 3 weeks. I\'d prefer to stay and continue building here, but the compensation gap is material.',
  },
  computer_vision_engineer: {
    strongOpener: 'I\'d like to revisit my compensation in light of the production deployment work I\'ve led — particularly the TensorRT optimization and the Triton inference stack that\'s now serving X requests/day.',
    leverageContext: 'CV engineers with my embedded-deployment depth + multimodal experience are paid $220K–$380K base at Tesla AI, Waymo, Skydio, and Cobalt Robotics. My infrastructure ownership creates direct revenue protection that\'s hard to replace.',
    countersScript: 'I\'m asking for a base of $X plus an equity refresh, and I\'d like to formalize my technical leadership over the perception stack. This aligns with comparable senior CV roles at AV / robotics teams.',
    walkAwayLine: 'I\'ve been in early conversations with two AV-perception teams that are at the bands I\'m asking for here. I\'d prefer to stay given the production systems I\'ve built, but I need our comp to be competitive.',
  },
  reinforcement_learning_engineer: {
    strongOpener: 'Given the RLHF reproduction I published and the post-training pipeline I\'ve built here, I\'d like to discuss my compensation against frontier-lab RL bands.',
    leverageContext: 'RLHF / DPO / Constitutional AI engineers are the scarcest talent segment in ML in 2026. Anthropic\'s post-training team, OpenAI\'s RL team, and DeepMind Gemini post-training pay $300K–$500K base + $500K–$1M equity over 4 years for engineers with my profile.',
    countersScript: 'I\'m requesting a base of $X with a fresh 4-year equity grant of $Y. I\'d also like formal recognition as the post-training technical lead — this is the durable role architecture for retaining RL talent.',
    walkAwayLine: 'I\'ve had warm intros at Anthropic\'s post-training team and an Apollo Research referral. I want to keep contributing here, but the comp gap relative to frontier labs is too large to leave unaddressed.',
  },
  ai_safety_researcher: {
    strongOpener: 'I\'d like to schedule a compensation discussion that reflects the AI-safety market — particularly the alignment forum work I\'ve published and the interpretability experiments I\'ve been leading.',
    leverageContext: 'Frontier-lab safety teams (Anthropic Alignment, OpenAI Superalignment, DeepMind Scalable Alignment, Apollo Research, Redwood, METR) are budget-unconstrained on safety hires. Mid-career safety researchers with publications are clearing $400K–$650K total comp; senior safety researchers reach $600K–$900K.',
    countersScript: 'I\'m asking for a base of $X with an equity refresh of $Y over 4 years and explicit time allocation for alignment publications. Public research output is core to my hireability and to our recruiting story — it should be supported, not de-prioritized.',
    walkAwayLine: 'I\'ve had active conversations with Anthropic\'s Alignment team and an Apollo Research referral pipeline. The mission alignment is strong on both sides — I\'m raising this so we can keep me here.',
  },
  model_evaluation_engineer: {
    strongOpener: 'I\'d like to discuss my compensation given the eval infrastructure I\'ve built — particularly the public eval harness on [domain] and the agentic-task evaluation pipeline that\'s become a recruiting signal for us.',
    leverageContext: 'Eval engineers with dangerous-capability and agentic-eval depth are in acute shortage at Anthropic Evals, OpenAI Evals, METR, UK AISI, and US AISI — base bands of $300K–$500K with senior evals leads clearing $600K+ total comp.',
    countersScript: 'I\'m requesting a base of $X plus an equity refresh, and I\'d like budget to attend NeurIPS Datasets & Benchmarks and ICML to deepen our evals network. The public artifacts I\'ve shipped are directly tied to our recruiting and credibility.',
    walkAwayLine: 'I\'ve had referrals into METR and Anthropic Evals, with bands above our current package. I want to keep building our evals infrastructure here, but our comp needs to be defensible against those alternatives.',
  },
  ai_red_teamer: {
    strongOpener: 'I\'d like to revisit my compensation given the red-team work I\'ve published — particularly the indirect-prompt-injection findings and the agentic attack-surface report I led.',
    leverageContext: 'Agentic red-team specialists are the scarcest red-team niche in 2026 — Anthropic, OpenAI Preparedness, METR, and Microsoft AI Red Team pay $250K–$420K base for engineers with my published work and depth.',
    countersScript: 'I\'m asking for a base of $X with an equity refresh and explicit budget for DEF CON AI Village + SaTML attendance. My public output is a direct recruiting and credibility asset for our security posture.',
    walkAwayLine: 'I\'ve had inbound interest from OpenAI Preparedness and an active conversation with Anthropic\'s red-team. I\'m raising this now so we can keep me focused on the work here rather than running interview loops.',
  },
};
