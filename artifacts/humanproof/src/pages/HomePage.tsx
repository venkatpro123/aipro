import { useEffect } from "react";
import { Link } from "react-router-dom";
import { WorldMap3D } from "@/components/Landing/WorldMap3D";

/* ─── Particle canvas hook ─── */
function useParticles(canvasId: string) {
  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let raf: number;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 90 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.3, a: Math.random(),
    }));
    const loop = () => {
      const light = document.documentElement.classList.contains("light");
      const rgb = light ? "0,150,170" : "0,212,255";
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${p.a * 0.22})`; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < 130) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(${rgb},${0.05 * (1 - d / 130)})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [canvasId]);
}

/* ─── Scroll reveal hook ─── */
function useScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("hp-vis"); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".hp-fs").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/* ─── Counter animation hook ─── */
function useCounters() {
  useEffect(() => {
    const animCount = (el: Element, target: number, suffix = "+", duration = 1800) => {
      let start: number | null = null;
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(e * target).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString() + suffix;
      };
      requestAnimationFrame(step);
    };
    const obs = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) {
        [
          { id: "hp-sc1", val: 5200 }, { id: "hp-sc2", val: 55 },
          { id: "hp-sc3", val: 28 },  { id: "hp-sc4", val: 4200 },
          { id: "hp-cc",  val: 5200 }, { id: "hp-ec",  val: 4200 },
          { id: "hp-ctc", val: 28 },
        ].forEach(({ id, val }) => {
          const el = document.getElementById(id);
          if (el) animCount(el, val);
        });
        obs.disconnect();
      }
    }), { threshold: 0.4 });
    const sr = document.querySelector(".hp-stats-row, .hp-map-section");
    if (sr) obs.observe(sr);
    return () => obs.disconnect();
  }, []);
}

/* ─── AI bar animation ─── */
function useAIBars() {
  useEffect(() => {
    const obs = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.querySelectorAll<HTMLElement>(".hp-ai-fill").forEach(b => {
          const w = b.style.width; b.style.width = "0";
          setTimeout(() => { b.style.width = w; }, 200);
        });
        obs.unobserve(e.target);
      }
    }), { threshold: 0.3 });
    const el = document.querySelector(".hp-ai-section");
    if (el) obs.observe(el);
    return () => obs.disconnect();
  }, []);
}

/* ─── Radar 3D tilt ─── */
function useRadarTilt() {
  useEffect(() => {
    const rc = document.querySelector<HTMLElement>(".hp-rc");
    if (!rc) return;
    const handler = (e: MouseEvent) => {
      const rect = rc.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
      const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
      rc.style.transform = `perspective(1100px) rotateY(${-10 + dx * 8}deg) rotateX(${5 - dy * 5}deg)`;
      rc.style.animation = "none";
    };
    document.addEventListener("mousemove", handler);
    return () => document.removeEventListener("mousemove", handler);
  }, []);
}

export default function HomePage() {
  useParticles("hp-particles");
  useScrollReveal();
  useCounters();
  useAIBars();
  useRadarTilt();

  return (
    <div className="hp-home">
      <canvas id="hp-particles" />

      {/* ── HERO ── */}
      <section className="hp-hero">
        <div className="hp-gbg" />
        {/* 3D iso cube accent */}
        <div style={{ position:"absolute",bottom:"12%",left:"2%",zIndex:1,pointerEvents:"none",opacity:.6 }} className="hp-svg-float2">
          <svg width="70" height="70" viewBox="0 0 70 70">
            <polygon points="35,10 60,24 60,50 35,64 10,50 10,24" fill="rgba(0,212,255,.04)" stroke="rgba(0,212,255,.3)" strokeWidth="1"/>
            <polygon points="35,10 60,24 35,38 10,24" fill="rgba(0,212,255,.08)" stroke="rgba(0,212,255,.2)" strokeWidth=".8"/>
            <polygon points="35,38 60,24 60,50 35,64" fill="rgba(0,212,255,.05)" stroke="rgba(0,212,255,.15)" strokeWidth=".8"/>
            <polygon points="35,38 10,24 10,50 35,64" fill="rgba(139,92,246,.04)" stroke="rgba(139,92,246,.15)" strokeWidth=".8"/>
            <circle cx="35" cy="10" r="2.5" fill="#00d4ff" style={{ animation:"hp-bpulse 2s infinite" }}/>
            <circle cx="60" cy="24" r="2" fill="rgba(139,92,246,.8)"/>
            <circle cx="10" cy="24" r="2" fill="rgba(0,212,255,.5)"/>
          </svg>
        </div>
        <div className="hp-orb hp-o1" />
        {/* Torus ring accent */}
        <div style={{ position:"absolute",top:"10%",left:"5%",zIndex:1,pointerEvents:"none",opacity:.5 }} className="hp-svg-float2">
          <div className="hp-ring3d" style={{ width:60,height:60 }} />
        </div>
        <div className="hp-orb hp-o2" />
        <div className="hp-orb hp-o3" />

        <div className="hp-container hp-hero-grid">
          {/* LEFT */}
          <div style={{ position:"relative",zIndex:3 }}>
            <div style={{ marginBottom:"1.4rem" }}>
              <span className="hp-tag"><span className="hp-tdot" />Career Risk Intelligence Platform</span>
            </div>
            <h1 className="hp-hero-title">
              Know You're <span className="hp-gred">At Risk</span><br />Before The<br />Layoff Happens.
            </h1>
            <p className="hp-hero-sub">
              HumanProof analyzes your company, role, industry, hiring signals, financial health, AI disruption risk, and market conditions to identify career risk before it becomes a crisis.
            </p>
            <div className="hp-hbtns">
              <Link to="/terminal" className="hp-btn-p">Run My Layoff Audit →</Link>
              <Link to="/terminal" className="hp-btn-g">See How It Works</Link>
            </div>
            <div className="hp-hero-trust">
              <div className="hp-trust-item"><span className="hp-trust-val">5,200+</span>Companies</div>
              <div className="hp-trust-div" />
              <div className="hp-trust-item"><span className="hp-trust-val">55+</span>Intel Layers</div>
              <div className="hp-trust-div" />
              <div className="hp-trust-item"><span className="hp-trust-val">28+</span>Countries</div>
              <div className="hp-trust-div" />
              <div className="hp-trust-item"><span className="hp-trust-val">4,200+</span>Events</div>
            </div>
          </div>

          {/* RIGHT — 3D Radar Card */}
          <div style={{ position:"relative",zIndex:3 }}>
            {/* Geo orb accent */}
            <div style={{ position:"absolute",top:"15%",right:"3%",zIndex:1,pointerEvents:"none" }} className="hp-svg-float3">
              <svg width="90" height="90" viewBox="0 0 90 90">
                <defs>
                  <radialGradient id="g3d1" cx="35%" cy="35%">
                    <stop offset="0%" stopColor="rgba(0,212,255,.7)"/>
                    <stop offset="60%" stopColor="rgba(0,212,255,.15)"/>
                    <stop offset="100%" stopColor="rgba(0,212,255,.02)"/>
                  </radialGradient>
                </defs>
                <circle cx="45" cy="45" r="42" fill="url(#g3d1)" stroke="rgba(0,212,255,.4)" strokeWidth="1"/>
                <ellipse cx="45" cy="45" rx="42" ry="14" fill="none" stroke="rgba(0,212,255,.2)" strokeWidth="1" strokeDasharray="5 4"/>
                <ellipse cx="45" cy="45" rx="14" ry="42" fill="none" stroke="rgba(0,212,255,.15)" strokeWidth="1" strokeDasharray="5 4"/>
                <circle cx="45" cy="3" r="3" fill="#00d4ff" style={{ animation:"hp-bpulse 2s infinite" }}/>
                <circle cx="45" cy="87" r="3" fill="rgba(0,212,255,.5)" style={{ animation:"hp-bpulse 2s infinite .5s" }}/>
              </svg>
            </div>
            <div className="hp-rc">
              <div className="hp-scanline" />
              <div className="hp-rc-glow" />
              <div className="hp-rc-glow2" />
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"1.2rem" }}>
                <div>
                  <div className="hp-rc-co">Microsoft · Senior Engineer</div>
                  <div className="hp-rc-name">Career Risk Radar</div>
                  <div className="hp-live-pill"><span className="hp-live-dot" />Live Intelligence</div>
                </div>
                <div className="hp-rbadge">
                  <div className="hp-rl">Risk</div>
                  <div className="hp-rn">61</div>
                </div>
              </div>
              {/* Radar SVG */}
              <div style={{ display:"flex",justifyContent:"center",margin:".8rem 0",position:"relative" }}>
                <svg width="200" height="200" viewBox="0 0 200 200" style={{ overflow:"visible" }}>
                  <defs>
                    <radialGradient id="rfg" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(0,212,255,.25)"/>
                      <stop offset="100%" stopColor="rgba(0,212,255,.03)"/>
                    </radialGradient>
                  </defs>
                  <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(0,212,255,.08)" strokeWidth="1"/>
                  <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(0,212,255,.08)" strokeWidth="1"/>
                  <circle cx="100" cy="100" r="40" fill="none" stroke="rgba(0,212,255,.08)" strokeWidth="1"/>
                  <circle cx="100" cy="100" r="20" fill="none" stroke="rgba(0,212,255,.1)" strokeWidth="1"/>
                  <line x1="100" y1="20" x2="100" y2="180" stroke="rgba(0,212,255,.06)" strokeWidth="1"/>
                  <line x1="20" y1="100" x2="180" y2="100" stroke="rgba(0,212,255,.06)" strokeWidth="1"/>
                  <line x1="43" y1="43" x2="157" y2="157" stroke="rgba(0,212,255,.06)" strokeWidth="1"/>
                  <line x1="157" y1="43" x2="43" y2="157" stroke="rgba(0,212,255,.06)" strokeWidth="1"/>
                  <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,212,255,.12)" strokeWidth="1" strokeDasharray="8 6" style={{ transformOrigin:"100px 100px",animation:"hp-spinring 20s linear infinite" }}/>
                  <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(139,92,246,.1)" strokeWidth="1" strokeDasharray="5 8" style={{ transformOrigin:"100px 100px",animation:"hp-spinring2 14s linear infinite" }}/>
                  <polygon points="100,40 142,68 136,118 68,122 58,70" fill="url(#rfg)" stroke="rgba(0,212,255,.8)" strokeWidth="1.5" strokeLinejoin="round"/>
                  <circle cx="100" cy="40" r="4" fill="#00d4ff"/>
                  <circle cx="142" cy="68" r="4" fill="#ef4444"/>
                  <circle cx="136" cy="118" r="4" fill="#f59e0b"/>
                  <circle cx="68" cy="122" r="4" fill="#f59e0b"/>
                  <circle cx="58" cy="70" r="4" fill="#ef4444"/>
                  <circle cx="100" cy="100" r="5" fill="rgba(0,212,255,.4)" stroke="rgba(0,212,255,.8)" strokeWidth="1.5"/>
                  <line x1="100" y1="100" x2="100" y2="18" stroke="rgba(0,212,255,.5)" strokeWidth="1" style={{ transformOrigin:"100px 100px",animation:"hp-spinring 4s linear infinite" }}/>
                </svg>
              </div>
              <div className="hp-sig-list">
                <div className="hp-si"><span className="hp-sd hp-sd-r" />Hiring Slowdown Detected</div>
                <div className="hp-si"><span className="hp-sd hp-sd-r" />Peer Layoffs in Org Unit</div>
                <div className="hp-si"><span className="hp-sd hp-sd-a" />AI Exposure Rising (42%)</div>
                <div className="hp-si"><span className="hp-sd hp-sd-a" />Internal Mobility Weak</div>
                <div className="hp-si"><span className="hp-sd hp-sd-g" />Skill Demand Still Active</div>
              </div>
              <div style={{ marginTop:".8rem" }}>
                <div className="hp-rml"><span>Safe</span><span>Risk 61/100</span><span>Critical</span></div>
                <div className="hp-rbar"><div className="hp-rfill" /></div>
              </div>
              <div className="hp-raction">
                <div className="hp-ral">Recommended Action</div>
                <div className="hp-rat">Start Internal Transfer Search →</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: TIMELINE ── */}
      <section className="hp-tl-section hp-section hp-fs">
        <div className="hp-container hp-z2">
          <div className="hp-sec-label">Section 02 — Timeline</div>
          <h2 className="hp-sec-title"><span className="hp-gred">Most Career Damage</span><br />Happens Before The Layoff.</h2>
          <p className="hp-sec-sub">Decisions are made months before announcements. The window to act closes long before you're called into the room.</p>
          <div style={{ display:"flex",gap:".8rem",marginBottom:"2.5rem",flexWrap:"wrap",marginTop:"1.5rem" }}>
            <span className="hp-badge3d">💡 Live Signals</span>
            <span className="hp-badge3d" style={{ background:"linear-gradient(145deg,rgba(239,68,68,.1),rgba(239,68,68,.03))",borderColor:"rgba(239,68,68,.3)",color:"#ef4444" }}>⚠️ Risk Active</span>
            <span className="hp-badge3d" style={{ background:"linear-gradient(145deg,rgba(16,185,129,.1),rgba(16,185,129,.03))",borderColor:"rgba(16,185,129,.3)",color:"#10b981" }}>🛡️ Protected</span>
          </div>
          <div className="hp-tl-visual">
            <div className="hp-tl-line" />
            <div className="hp-tl-items">
              {[
                { mo:"Month 1", ev:"Hiring slows down",       badge:"HP Warns Here", cls:"hp-tl-dot-hp",   bcls:"hp-tb-hp",   ring:true },
                { mo:"Month 2", ev:"Teams freeze budgets",    badge:"",             cls:"",                bcls:"",           ring:false },
                { mo:"Month 3", ev:"Performance bars raised", badge:"",             cls:"",                bcls:"",           ring:false },
                { mo:"Month 4", ev:"Quiet restructuring",     badge:"",             cls:"",                bcls:"",           ring:false },
                { mo:"Month 5", ev:"Layoffs announced",       badge:"",             cls:"",                bcls:"",           ring:false },
                { mo:"Month 6", ev:"Job market flooded",      badge:"Too Late",     cls:"hp-tl-dot-late", bcls:"hp-tb-late", ring:false },
              ].map((item, i) => (
                <div key={i} className="hp-tl-item">
                  <div className="hp-tl-dot-wrap">
                    <div className={`hp-tl-dot ${item.cls}`} />
                    {item.ring && <div className="hp-tl-ring" />}
                  </div>
                  <div className="hp-tl-mo">{item.mo}</div>
                  <div className="hp-tl-ev">{item.ev}</div>
                  {item.badge && <div className={`hp-tl-badge ${item.bcls}`}>{item.badge}</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="hp-tl-illustration">
            <div>
              <div className="hp-holo-panel" style={{ padding:"1.2rem" }}>
                <svg viewBox="0 0 480 200" style={{ width:"100%",borderRadius:14,background:"var(--hp-bg3)",border:"1px solid var(--hp-border)" }}>
                  <defs>
                    <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity=".4"/>
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4ff" stopOpacity=".3"/>
                      <stop offset="100%" stopColor="#00d4ff" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="160" x2="480" y2="160" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                  <line x1="0" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,.04)" strokeWidth="1"/>
                  <line x1="0" y1="80"  x2="480" y2="80"  stroke="rgba(255,255,255,.04)" strokeWidth="1"/>
                  <line x1="0" y1="40"  x2="480" y2="40"  stroke="rgba(255,255,255,.04)" strokeWidth="1"/>
                  <path d="M0,160 L80,155 L160,140 L240,110 L320,80 L400,50 L480,30 L480,200 L0,200 Z" fill="url(#cg1)"/>
                  <path d="M0,160 L80,155 L160,140 L240,110 L320,80 L400,50 L480,30" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round" style={{ strokeDasharray:600,animation:"hp-linedraw 2.5s ease forwards" }}/>
                  <path d="M0,160 L80,158 L160,155 L240,152 L320,148 L400,143 L480,135 L480,200 L0,200 Z" fill="url(#cg2)"/>
                  <path d="M0,160 L80,158 L160,155 L240,152 L320,148 L400,143 L480,135" fill="none" stroke="#00d4ff" strokeWidth="2" strokeDasharray="600" style={{ animation:"hp-linedraw 2.5s ease .5s forwards" }}/>
                  <circle cx="80" cy="158" r="5" fill="#00d4ff" style={{ animation:"hp-bpulse 2s infinite" }}/>
                  <text x="88" y="148" fontSize="9" fill="#00d4ff" fontFamily="JetBrains Mono,monospace" letterSpacing=".05em">HP DETECTS</text>
                  <circle cx="400" cy="50" r="5" fill="#ef4444"/>
                  <text x="360" y="44" fontSize="9" fill="#ef4444" fontFamily="JetBrains Mono,monospace">EMPLOYEES REACT</text>
                  {["M1","M2","M3","M4","M5","M6"].map((m,i)=>(
                    <text key={m} x={10+i*80} y="193" fontSize="9" fill="rgba(255,255,255,.2)" fontFamily="JetBrains Mono,monospace">{m}</text>
                  ))}
                  <circle cx="14" cy="14" r="4" fill="#ef4444"/>
                  <text x="22" y="18" fontSize="9" fill="rgba(255,255,255,.5)" fontFamily="JetBrains Mono,monospace">Risk Trajectory</text>
                  <circle cx="130" cy="14" r="4" fill="#00d4ff"/>
                  <text x="138" y="18" fontSize="9" fill="rgba(255,255,255,.5)" fontFamily="JetBrains Mono,monospace">HumanProof Detection</text>
                </svg>
              </div>
            </div>
            <div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#00d4ff",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".8rem" }}>The Window Of Protection</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.6rem",fontWeight:700,lineHeight:1.2,marginBottom:"1rem" }}>
                4–5 months of warning.<br /><span className="hp-gtext">If you know where to look.</span>
              </h3>
              <p style={{ fontSize:14,color:"#7a94b8",lineHeight:1.7,marginBottom:"1.5rem" }}>Traditional career advice tells you to react. HumanProof is built to predict — giving you a runway to act, not scramble.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:".6rem" }}>
                {["Detect hiring freeze before it's announced","Spot budget freeze signals in financial data","Track peer layoff patterns across your org"].map(t=>(
                  <div key={t} style={{ display:"flex",alignItems:"center",gap:".7rem",fontSize:13,color:"#7a94b8" }}>
                    <span style={{ color:"#00d4ff",fontSize:15 }}>✓</span> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: COMPARISON ── */}
      <section className="hp-cmp-section hp-section hp-fs">
        <div className="hp-container hp-z2">
          <div className="hp-sec-label">Section 03 — Comparison</div>
          <h2 className="hp-sec-title">You Can't Solve A Problem<br /><span className="hp-gtext">You Haven't Detected.</span></h2>
          <div className="hp-cmp-wrap">
            <div className="hp-cmp-card hp-cmp-old">
              <div className="hp-cmp-head hp-cmp-head-m">Traditional Career Advice</div>
              {["Update your resume every few months","Learn vague 'new skills' without context","Network more, apply everywhere","Wait for your performance review","React after the announcement"].map(t=>(
                <div key={t} className="hp-cmp-row"><span className="hp-cic hp-ix">✗</span>{t}</div>
              ))}
            </div>
            <div className="hp-cmp-card hp-cmp-new">
              <div className="hp-cmp-head hp-cmp-head-b">HumanProof Intelligence</div>
              {["Detect risk 3–5 months before announcement","Measure company stability in real-time","Predict workforce pressure with precision","Quantify layoff probability with confidence score","Build escape plans before you need them"].map(t=>(
                <div key={t} className="hp-cmp-row"><span className="hp-cic hp-ick">✓</span>{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: INTELLIGENCE ENGINE ── */}
      <section className="hp-ie-section hp-section hp-fs">
        <div className="hp-container hp-z2">
          <div className="hp-sec-label">Section 04 — Architecture</div>
          <h2 className="hp-sec-title">55+ Intelligence Systems<br /><span className="hp-gtext">Working For Your Career</span></h2>
          <p className="hp-sec-sub">Every layer feeds into one unified career risk score. Nothing is guesswork.</p>

          {/* Architecture flow SVG */}
          <div style={{ margin:"2.5rem 0" }}>
            <svg viewBox="0 0 1000 120" style={{ width:"100%",borderRadius:14,background:"var(--hp-bg3)",border:"1px solid var(--hp-border)" }}>
              {[{x:20,c:"rgba(0,212,255,.08)",sc:"rgba(0,212,255,.2)",tc:"rgba(0,212,255,.9)",t1:"COMPANY",t2:"INTEL"},{x:120,c:"rgba(139,92,246,.08)",sc:"rgba(139,92,246,.2)",tc:"rgba(139,92,246,.9)",t1:"FINANCIAL",t2:"INTEL"},{x:220,c:"rgba(245,158,11,.08)",sc:"rgba(245,158,11,.2)",tc:"rgba(245,158,11,.9)",t1:"LAYOFF",t2:"INTEL"}].map((n,i)=>(
                <g key={i}>
                  <line x1={n.x+60} y1="60" x2="430" y2="60" stroke="rgba(0,212,255,.12)" strokeWidth="1" strokeDasharray="4 3"/>
                  <rect x={n.x} y="40" width="120" height="40" rx="6" fill={n.c} stroke={n.sc} strokeWidth=".5"/>
                  <text x={n.x+60} y="56" textAnchor="middle" fontSize="8" fill={n.tc} fontFamily="JetBrains Mono,monospace">{n.t1}</text>
                  <text x={n.x+60} y="68" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.4)" fontFamily="JetBrains Mono,monospace">{n.t2}</text>
                </g>
              ))}
              <rect x="380" y="20" width="240" height="80" rx="10" fill="rgba(0,212,255,.1)" stroke="rgba(0,212,255,.35)" strokeWidth="1"/>
              <text x="500" y="50" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.5)" fontFamily="JetBrains Mono,monospace">YOUR</text>
              <text x="500" y="66" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="'Syne',sans-serif" fontWeight="800">CAREER RISK SCORE</text>
              <circle cx="500" cy="85" r="3" fill="#00d4ff" style={{ animation:"hp-bpulse 1.8s infinite" }}/>
              {[{x:660,c:"rgba(16,185,129,.08)",sc:"rgba(16,185,129,.2)",tc:"rgba(16,185,129,.9)",t1:"AI RISK",t2:"INTEL"},{x:760,c:"rgba(239,68,68,.08)",sc:"rgba(239,68,68,.2)",tc:"rgba(239,68,68,.9)",t1:"MARKET",t2:"INTEL"},{x:860,c:"rgba(56,189,248,.08)",sc:"rgba(56,189,248,.2)",tc:"rgba(56,189,248,.9)",t1:"PERSONAL",t2:"INTEL"}].map((n,i)=>(
                <g key={i}>
                  <line x1={n.x} y1="60" x2="570" y2="60" stroke="rgba(0,212,255,.12)" strokeWidth="1" strokeDasharray="4 3"/>
                  <rect x={n.x} y="40" width="120" height="40" rx="6" fill={n.c} stroke={n.sc} strokeWidth=".5"/>
                  <text x={n.x+60} y="56" textAnchor="middle" fontSize="8" fill={n.tc} fontFamily="JetBrains Mono,monospace">{n.t1}</text>
                  <text x={n.x+60} y="68" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.4)" fontFamily="JetBrains Mono,monospace">{n.t2}</text>
                </g>
              ))}
              {[{fill:"#00d4ff",path:"M80,60 L430,60",dur:"3s"},{fill:"#8b5cf6",path:"M180,60 L430,60",dur:"3s",begin:"0.5s"},{fill:"#f59e0b",path:"M280,60 L430,60",dur:"3s",begin:"1s"},{fill:"#10b981",path:"M720,60 L570,60",dur:"3s",begin:"0.2s"},{fill:"#ef4444",path:"M820,60 L570,60",dur:"3s",begin:"0.8s"},{fill:"#38bdf8",path:"M920,60 L570,60",dur:"3s",begin:"1.4s"}].map((dot,i)=>(
                <circle key={i} r="3" fill={dot.fill} opacity=".7">
                  <animateMotion dur={dot.dur} repeatCount="indefinite" begin={dot.begin||"0s"} path={dot.path}/>
                </circle>
              ))}
            </svg>
          </div>

          <div className="hp-ie-grid">
            {[
              { icon:"🏢", title:"Company Intelligence",   desc:"Financial health, headcount trends, exec changes, and market position.", cnt:"12 SIGNALS" },
              { icon:"💸", title:"Financial Intelligence",  desc:"Revenue health, runway, burn rate, and investor signals.",               cnt:"8 SIGNALS"  },
              { icon:"⚡", title:"Layoff Intelligence",    desc:"4,200+ historical events, pattern matching, and early signals.",          cnt:"9 SIGNALS"  },
              { icon:"🧠", title:"AI Risk Intelligence",   desc:"Role automation exposure, skill obsolescence, replacement timelines.",    cnt:"7 SIGNALS"  },
            ].map(c=>(
              <div key={c.title} className="hp-ie-card">
                <div className="hp-ie-icon">{c.icon}</div>
                <div className="hp-ie-title">{c.title}</div>
                <div className="hp-ie-desc">{c.desc}</div>
                <div className="hp-ie-cnt">{c.cnt}</div>
              </div>
            ))}
            {/* Center */}
            <div className="hp-ie-card hp-ie-center">
              <div>
                <div className="hp-ie-cnum hp-gtext">55+</div>
                <div className="hp-ie-clbl">Intelligence Layers</div>
              </div>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink:0 }}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0,212,255,.1)" strokeWidth="1" strokeDasharray="6 4" style={{ transformOrigin:"60px 60px",animation:"hp-spinring 18s linear infinite" }}/>
                <circle cx="60" cy="60" r="38" fill="none" stroke="rgba(139,92,246,.12)" strokeWidth="1" strokeDasharray="4 6" style={{ transformOrigin:"60px 60px",animation:"hp-spinring2 12s linear infinite" }}/>
                <circle cx="60" cy="60" r="26" fill="rgba(0,212,255,.06)" stroke="rgba(0,212,255,.2)" strokeWidth="1"/>
                <text x="60" y="56" textAnchor="middle" fontSize="9" fill="rgba(0,212,255,.7)" fontFamily="JetBrains Mono,monospace">ALL</text>
                <text x="60" y="68" textAnchor="middle" fontSize="9" fill="rgba(0,212,255,.7)" fontFamily="JetBrains Mono,monospace">FEEDS</text>
                {[{cx:60,cy:10,fill:"#00d4ff",d:"0s"},{cx:110,cy:60,fill:"#8b5cf6",d:".4s"},{cx:60,cy:110,fill:"#10b981",d:".8s"},{cx:10,cy:60,fill:"#f59e0b",d:"1.2s"}].map((p,i)=>(
                  <circle key={i} cx={p.cx} cy={p.cy} r="5" fill={p.fill} style={{ animation:`hp-bpulse 2s infinite ${p.d}` }}/>
                ))}
              </svg>
            </div>
            {[
              { icon:"📊", title:"Market Intelligence",    desc:"Hiring demand, compensation shifts, sector health, talent supply.",       cnt:"10 SIGNALS" },
              { icon:"🎯", title:"Career Intelligence",    desc:"Tenure risk, visibility score, internal mobility, and role fit.",          cnt:"6 SIGNALS"  },
              { icon:"🛡️", title:"Protection Intelligence",desc:"Escape plan readiness, skill hedge score, network strength index.",       cnt:"5 SIGNALS"  },
              { icon:"📈", title:"Outcome Intelligence",   desc:"Continuous learning from real outcomes across 28+ countries.",            cnt:"8 SIGNALS"  },
            ].map(c=>(
              <div key={c.title} className="hp-ie-card">
                <div className="hp-ie-icon">{c.icon}</div>
                <div className="hp-ie-title">{c.title}</div>
                <div className="hp-ie-desc">{c.desc}</div>
                <div className="hp-ie-cnt">{c.cnt}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: OUTCOME LOOP ── */}
      <section className="hp-loop-section hp-section hp-fs">
        <div className="hp-container hp-z2">
          <div className="hp-sec-label">Section 05 — Learning Engine</div>
          <h2 className="hp-sec-title">The More Outcomes We Learn,<br /><span className="hp-gpurp">The Smarter HumanProof Becomes.</span></h2>
          <div className="hp-loop-wrap">
            <div>
              <svg viewBox="0 0 420 380" style={{ width:"100%" }}>
                <defs>
                  <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                    <path d="M0,1 L6,4 L0,7 Z" fill="rgba(0,212,255,.6)"/>
                  </marker>
                </defs>
                <circle cx="210" cy="190" r="55" fill="rgba(0,212,255,.06)" stroke="rgba(0,212,255,.25)" strokeWidth="1.5"/>
                <circle cx="210" cy="190" r="40" fill="rgba(0,212,255,.04)" stroke="rgba(0,212,255,.12)" strokeWidth="1" strokeDasharray="5 4" style={{ transformOrigin:"210px 190px",animation:"hp-spinring2 20s linear infinite" }}/>
                <text x="210" y="184" textAnchor="middle" fontSize="10" fill="rgba(0,212,255,.7)" fontFamily="JetBrains Mono,monospace">MODEL</text>
                <text x="210" y="198" textAnchor="middle" fontSize="10" fill="rgba(0,212,255,.7)" fontFamily="JetBrains Mono,monospace">LEARNING</text>
                {[
                  { x:150,y:20,  w:120,h:44,stroke:"rgba(0,212,255,.25)",  t1:"AUDIT",       t1c:"rgba(0,212,255,.9)",   t2:"Run analysis"       },
                  { x:290,y:100, w:120,h:44,stroke:"rgba(139,92,246,.3)",  t1:"PREDICTION",  t1c:"rgba(139,92,246,.9)",  t2:"Score generated"    },
                  { x:290,y:236, w:120,h:44,stroke:"rgba(16,185,129,.3)",  t1:"REAL OUTCOME",t1c:"rgba(16,185,129,.9)",  t2:"Confirmed result"   },
                  { x:10, y:236, w:120,h:44,stroke:"rgba(245,158,11,.3)",  t1:"BETTER",      t1c:"rgba(245,158,11,.9)",  t2:"Predictions improve"},
                  { x:10, y:100, w:120,h:44,stroke:"rgba(56,189,248,.3)",  t1:"MODEL UPDATE", t1c:"rgba(56,189,248,.9)", t2:"Weights adjusted"   },
                ].map((n,i)=>(
                  <g key={i}>
                    <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="8" fill="var(--hp-surface)" stroke={n.stroke} strokeWidth="1"/>
                    <text x={n.x+n.w/2} y={n.y+18} textAnchor="middle" fontSize="9" fill={n.t1c} fontFamily="JetBrains Mono,monospace">{n.t1}</text>
                    <text x={n.x+n.w/2} y={n.y+32} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,.35)" fontFamily="JetBrains Mono,monospace">{n.t2}</text>
                  </g>
                ))}
                {[
                  { d:"M210,64 Q280,80 290,122",      stroke:"rgba(0,212,255,.3)",   fill:"#00d4ff",dur:"5s",begin:"0s"  },
                  { d:"M350,144 Q370,190 350,236",    stroke:"rgba(139,92,246,.3)", fill:"#8b5cf6",dur:"5s",begin:"1s"  },
                  { d:"M290,258 Q210,310 130,258",    stroke:"rgba(16,185,129,.3)", fill:"#10b981",dur:"5s",begin:"2s"  },
                  { d:"M70,236 Q50,190 70,144",       stroke:"rgba(245,158,11,.3)", fill:"#f59e0b",dur:"5s",begin:"3s"  },
                  { d:"M130,122 Q140,70 150,42",      stroke:"rgba(56,189,248,.3)", fill:"#38bdf8",dur:"5s",begin:"4s"  },
                ].map((a,i)=>(
                  <g key={i}>
                    <path d={a.d} fill="none" stroke={a.stroke} strokeWidth="1.5" markerEnd="url(#arr)"/>
                    <circle r="4" fill={a.fill} opacity=".8"><animateMotion dur={a.dur} repeatCount="indefinite" begin={a.begin} path={a.d}/></circle>
                  </g>
                ))}
              </svg>
            </div>
            <div>
              <p style={{ fontSize:15,color:"#7a94b8",lineHeight:1.75,marginBottom:"2rem" }}>HumanProof continuously learns from confirmed career outcomes, making every prediction more accurate than the last.</p>
              <div className="hp-loop-outcomes">
                {[
                  { color:"#10b981", label:"Stayed Safe"      },
                  { color:"#ef4444", label:"Laid Off"          },
                  { color:"#00d4ff", label:"Promoted"          },
                  { color:"#8b5cf6", label:"Switched Company"  },
                  { color:"#f59e0b", label:"Internal Transfer" },
                  { color:"#38bdf8", label:"Salary Increase"   },
                ].map(o=>(
                  <div key={o.label} className="hp-outcome-pill">
                    <span className="hp-op-dot" style={{ background:o.color }} />{o.label}
                  </div>
                ))}
              </div>
              <div style={{ marginTop:"2rem",padding:"1.4rem",borderRadius:12,background:"rgba(0,212,255,.05)",border:"1px solid rgba(0,212,255,.15)" }}>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#00d4ff",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".5rem" }}>Model accuracy over time</div>
                <svg viewBox="0 0 260 50" style={{ width:"100%" }}>
                  <path d="M0,45 L40,40 L80,32 L120,25 L160,18 L200,12 L260,6" fill="none" stroke="rgba(0,212,255,.5)" strokeWidth="1.5" strokeLinejoin="round" style={{ strokeDasharray:400,animation:"hp-linedraw 2s ease forwards" }}/>
                  <path d="M0,45 L40,40 L80,32 L120,25 L160,18 L200,12 L260,6 L260,50 L0,50 Z" fill="rgba(0,212,255,.06)"/>
                  <circle cx="260" cy="6" r="3" fill="#00d4ff" style={{ animation:"hp-bpulse 1.5s infinite" }}/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: AI DISRUPTION ── */}
      <section className="hp-ai-section hp-section hp-fs">
        <div className="hp-container hp-z2">
          <div className="hp-sec-label">Section 06 — AI Disruption</div>
          <h2 className="hp-sec-title">Your Company Isn't<br /><span className="hp-gred">The Only Risk.</span></h2>
          <p className="hp-sec-sub">Your role may be changing faster than your employer is telling you.</p>
          <div className="hp-ai-cards">
            {[
              { role:"Software Engineer",    sub:"SWE · Mid–Senior",          pct:"42%",  num:42, barBg:"linear-gradient(90deg,#10b981,#f59e0b)", topBg:"linear-gradient(90deg,#f59e0b,#ef444450)", col:"#f59e0b", skills:[{cls:"hp-st-safe",label:"System Design"},{cls:"hp-st-safe",label:"Security"},{cls:"hp-st-risk",label:"Boilerplate Code"}] },
              { role:"Content Writer",       sub:"Marketing · All Levels",     pct:"78%",  num:78, barBg:"linear-gradient(90deg,#f59e0b,#ef4444)",  topBg:"linear-gradient(90deg,#ef4444,#dc262640)", col:"#ef4444", skills:[{cls:"hp-st-safe",label:"Brand Strategy"},{cls:"hp-st-risk",label:"SEO Copy"},{cls:"hp-st-risk",label:"Basic Articles"}] },
              { role:"Project Manager",      sub:"Operations · All Levels",    pct:"31%",  num:31, barBg:"linear-gradient(90deg,#10b981,#f59e0b)", topBg:"linear-gradient(90deg,#f59e0b,#10b98150)", col:"#f59e0b", skills:[{cls:"hp-st-safe",label:"Stakeholder Mgmt"},{cls:"hp-st-warn",label:"Status Reports"}] },
              { role:"Cybersecurity Analyst",sub:"Security · Mid–Senior",      pct:"12%",  num:12, barBg:"#10b981",                                  topBg:"linear-gradient(90deg,#10b981,#10b98140)", col:"#10b981", skills:[{cls:"hp-st-safe",label:"Threat Hunting"},{cls:"hp-st-safe",label:"Incident Response"}] },
            ].map(card=>(
              <div key={card.role} className="hp-ai-card">
                <div className="hp-ai-topbar" style={{ background:card.topBg }} />
                <div className="hp-ai-role">{card.role}</div>
                <div className="hp-ai-sub">{card.sub}</div>
                <div className="hp-ai-exp-lbl">AI Exposure</div>
                <div className="hp-ai-exp-num" style={{ color:card.col }}>{card.pct}</div>
                <div className="hp-ai-bar"><div className="hp-ai-fill" style={{ width:`${card.num}%`,background:card.barBg }} /></div>
                <div className="hp-skill-tags">{card.skills.map(s=><span key={s.label} className={s.cls}>{s.label}</span>)}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop:"1.8rem",fontSize:14,color:"#7a94b8" }}>
            HumanProof identifies which skills protect your future — and which are becoming obsolete.{" "}
            <Link to="/terminal" style={{ color:"#00d4ff",textDecoration:"none" }}>Check your role's exposure →</Link>
          </p>
        </div>
      </section>

      {/* ── SECTION 7: RISK REDUCTION ── */}
      <section className="hp-red-section hp-section hp-fs">
        <div className="hp-container hp-z2">
          <div className="hp-sec-label">Section 07 — Action System</div>
          <h2 className="hp-sec-title">Don't Just Know The Risk.<br /><span className="hp-gtext">Reduce It.</span></h2>
          <div className="hp-red-wrap">
            <div className="hp-red-steps">
              {[
                { score:"68", cls:"hp-rs-high", title:"Current Baseline",                  txt:"Your starting career risk score based on all detected signals." },
                { score:"55", cls:"hp-rs-mid",  title:"Complete Internal Mobility Plan",   txt:"Map open roles in adjacent teams. Risk drops 13 points." },
                { score:"46", cls:"hp-rs-mid",  title:"Build Skill Hedge Profile",          txt:"Add 2 high-demand skills to your verified profile. Risk drops 9 points." },
                { score:"38", cls:"hp-rs-low",  title:"Activate External Market Visibility",txt:"Turn on passive signal monitoring. Risk drops to manageable zone." },
              ].map(s=>(
                <div key={s.score} className="hp-red-step">
                  <div className={`hp-score-badge ${s.cls}`}>{s.score}</div>
                  <div><div className="hp-step-title">{s.title}</div><div className="hp-step-txt">{s.txt}</div></div>
                </div>
              ))}
            </div>
            <div>
              <svg viewBox="0 0 380 280" style={{ width:"100%",borderRadius:16,background:"var(--hp-bg3)",border:"1px solid var(--hp-border)" }}>
                <defs>
                  <linearGradient id="rdg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity=".3"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity=".1"/>
                  </linearGradient>
                </defs>
                <line x1="40" y1="30" x2="40" y2="240" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                <line x1="40" y1="240" x2="360" y2="240" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
                {[180,130,80].map(y=><line key={y} x1="40" y1={y} x2="360" y2={y} stroke="rgba(255,255,255,.04)" strokeWidth="1" strokeDasharray="4 3"/>)}
                <path d="M80,80 L160,116 L240,140 L320,162 L320,240 L80,240 Z" fill="url(#rdg)"/>
                <path d="M80,80 L160,116 L240,140 L320,162" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray:400,animation:"hp-linedraw 2s ease forwards" }}/>
                {[{cx:80,cy:80,fill:"#ef4444",label:"68",ly:70},{cx:160,cy:116,fill:"#f59e0b",label:"55",ly:106},{cx:240,cy:140,fill:"#f59e0b",label:"46",ly:130},{cx:320,cy:162,fill:"#10b981",label:"38",ly:152}].map(p=>(
                  <g key={p.cx}>
                    <circle cx={p.cx} cy={p.cy} r="6" fill={p.fill}/>
                    <text x={p.cx} y={p.ly} textAnchor="middle" fontSize="10" fill={p.fill} fontFamily="'Syne',sans-serif" fontWeight="700">{p.label}</text>
                  </g>
                ))}
                {["BASELINE","ACTION 1","ACTION 2","ACTION 3"].map((t,i)=>(
                  <text key={t} x={80+i*80} y="258" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,.2)" fontFamily="JetBrains Mono,monospace">{t}</text>
                ))}
                <text x="200" y="22" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,.3)" fontFamily="JetBrains Mono,monospace">RISK REDUCTION JOURNEY</text>
                <rect x="250" y="30" width="100" height="30" rx="6" fill="rgba(16,185,129,.1)" stroke="rgba(16,185,129,.2)" strokeWidth=".5"/>
                <text x="300" y="44" textAnchor="middle" fontSize="8" fill="rgba(16,185,129,.8)" fontFamily="JetBrains Mono,monospace">↓ 30 POINTS</text>
                <text x="300" y="55" textAnchor="middle" fontSize="7" fill="rgba(16,185,129,.5)" fontFamily="JetBrains Mono,monospace">TOTAL REDUCTION</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── WORLD MAP ── */}
      <section className="hp-map-section hp-fs">
        <div className="hp-container hp-z2">
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",marginBottom:"2rem" }}>
            <div>
              <div className="hp-sec-label">Global Coverage</div>
              <h3 style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.8rem",fontWeight:700,letterSpacing:"-.03em" }}>
                Intelligence Across <span className="hp-gtext">28+ Countries</span>
              </h3>
            </div>
            <div style={{ display:"flex",gap:"1.5rem" }}>
              {[{id:"hp-cc",val:"0",color:"#00d4ff",label:"Companies"},{id:"hp-ec",val:"0",color:"#8b5cf6",label:"Events"},{id:"hp-ctc",val:"0",color:"#10b981",label:"Countries"}].map(s=>(
                <div key={s.id} style={{ textAlign:"center" }}>
                  <div id={s.id} style={{ fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:s.color }}>0</div>
                  <div style={{ fontSize:12,color:"#7a94b8" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <WorldMap3D />
        </div>
      </section>

      {/* ── SECTION 8: TRUST ── */}
      <section className="hp-trust-section hp-section hp-fs">
        <div className="hp-container hp-z2">
          <div className="hp-sec-label">Section 08 — Trust Architecture</div>
          <h2 className="hp-sec-title">Built Around<br /><span className="hp-gtext">Transparency.</span></h2>
          <p className="hp-sec-sub">No black boxes. No fake precision. Every prediction comes with confidence levels and source age.</p>

          {/* Confidence meter */}
          <div style={{ margin:"2rem 0",padding:"1.5rem",borderRadius:16,background:"var(--hp-surface)",border:"1px solid var(--hp-border)",display:"flex",alignItems:"center",gap:"2rem",flexWrap:"wrap" }}>
            <svg viewBox="0 0 200 100" style={{ width:200,flexShrink:0 }}>
              <defs>
                <linearGradient id="confg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981"/>
                  <stop offset="50%" stopColor="#f59e0b"/>
                  <stop offset="100%" stopColor="#ef4444"/>
                </linearGradient>
              </defs>
              <path d="M20,90 A80,80 0 0,1 180,90" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="16" strokeLinecap="round"/>
              <path d="M20,90 A80,80 0 0,1 180,90" fill="none" stroke="url(#confg)" strokeWidth="16" strokeLinecap="round" strokeDasharray="226 252" style={{ animation:"hp-linedraw 2s ease forwards" }}/>
              <circle cx="100" cy="90" r="6" fill="#101828" stroke="rgba(0,212,255,.5)" strokeWidth="1.5"/>
              <text x="100" y="70" textAnchor="middle" fontSize="16" fill="#fff" fontFamily="'Syne',sans-serif" fontWeight="800">74%</text>
              <text x="100" y="82" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,.3)" fontFamily="JetBrains Mono,monospace">CONFIDENCE</text>
            </svg>
            <div style={{ flex:1,minWidth:200 }}>
              <div style={{ fontFamily:"'Syne',sans-serif",fontSize:"1.1rem",fontWeight:600,marginBottom:".4rem" }}>Prediction Confidence Score</div>
              <p style={{ fontSize:13,color:"#7a94b8",lineHeight:1.6 }}>Every single prediction includes a confidence interval. We won't tell you you're at 68% risk if we only have 40% confidence in that number. Honest uncertainty is a feature, not a bug.</p>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:".6rem" }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#3d5472",letterSpacing:".07em",textTransform:"uppercase" }}>Signal freshness</div>
              {[{color:"#10b981",text:"Updated 2h ago — Company hiring data"},{color:"#f59e0b",text:"Updated 18h ago — Financial signals"},{color:"#10b981",text:"Updated 4h ago — Layoff intelligence"}].map(s=>(
                <div key={s.text} style={{ display:"flex",alignItems:"center",gap:".6rem",fontSize:12,color:"#7a94b8" }}>
                  <span style={{ width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0 }} />{s.text}
                </div>
              ))}
            </div>
          </div>

          <div className="hp-trust-grid">
            {[
              { icon:"💡", bg:"rgba(0,212,255,.08)",   title:"Measured Signals",     desc:"Every signal is directly observed, timestamped, and sourced. Nothing fabricated." },
              { icon:"🔬", bg:"rgba(139,92,246,.08)",  title:"Evidence-Based Models", desc:"Trained on 4,200+ historical layoff events with validated, confirmed outcome data." },
              { icon:"📏", bg:"rgba(245,158,11,.08)",  title:"Confidence Scores",     desc:"Every prediction includes a confidence interval. We refuse false precision." },
              { icon:"📅", bg:"rgba(16,185,129,.08)",  title:"Signal Freshness",      desc:"Every data point shows its age. You always know how current the intelligence is." },
              { icon:"🧾", bg:"rgba(56,189,248,.08)",  title:"Honest Uncertainty",    desc:"Where data is limited, we label it as estimated — never presented as fact." },
              { icon:"📡", bg:"rgba(0,212,255,.08)",   title:"Continuous Learning",   desc:"Every confirmed outcome improves future predictions. The model learns constantly." },
            ].map(c=>(
              <div key={c.title} className="hp-trust-card">
                <div className="hp-t-icon" style={{ background:c.bg }}>{c.icon}</div>
                <div className="hp-trust-title">{c.title}</div>
                <div className="hp-trust-desc">{c.desc}</div>
              </div>
            ))}
          </div>

          <div className="hp-stats-row">
            {[{id:"hp-sc1",label:"Companies Covered"},{id:"hp-sc2",label:"Intelligence Layers"},{id:"hp-sc3",label:"Countries"},{id:"hp-sc4",label:"Layoff Events Analyzed"}].map(s=>(
              <div key={s.id} className="hp-stat-b">
                <div id={s.id} className="hp-stat-n hp-gtext">0</div>
                <div className="hp-stat-s">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="hp-cta-section hp-fs">
        <div className="hp-container" style={{ position:"relative",zIndex:2 }}>
          <div style={{ marginBottom:"1.5rem" }}>
            <span className="hp-tag" style={{ margin:"0 auto" }}><span className="hp-tdot" />Career Risk Intelligence</span>
          </div>
          <h2 className="hp-cta-title">The Best Time To Prepare<br />Is <span className="hp-gtext">Before You Need To.</span></h2>
          <p className="hp-cta-sub">Most employees discover career risk after the decision has already been made. HumanProof gives you the intelligence to act while you still have options.</p>
          <div className="hp-cta-actions">
            <Link to="/terminal" className="hp-btn-p" style={{ fontSize:16,padding:"16px 36px" }}>Run My Layoff Audit →</Link>
            <Link to="/terminal" className="hp-btn-g" style={{ fontSize:16,padding:"16px 36px" }}>See Sample Audit</Link>
          </div>
          <p style={{ marginTop:"2rem",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#3d5472",letterSpacing:".07em" }}>
            NO CREDIT CARD REQUIRED · RESULTS IN 3 MINUTES · 28+ COUNTRIES COVERED
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="hp-footer-bar">
        <span>© 2025 HumanProof Inc. · Career Risk Intelligence Platform · humanproof.ai</span>
      </footer>
    </div>
  );
}
