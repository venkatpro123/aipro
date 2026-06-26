import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MarketDynamicsIllustration,
  AIDisplacementIllustration,
  ProtectionIllustration,
  OpportunityIllustration,
} from "../components/illustrations/CareerIllustrations";

/* ─── Particle canvas hook ─── */
function useParticles(canvasId: string) {
  useEffect(() => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    // requestAnimationFrame loops aren't covered by the global prefers-reduced-motion
    // CSS rule (that only collapses CSS animations/transitions) — skip the loop entirely.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
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
              <a href="#how-it-works" className="hp-btn-g">See How It Works</a>
            </div>
            <div className="hp-hero-trust">
              <div className="hp-trust-item"><span className="hp-trust-val">5,200+</span>Companies</div>
              <div className="hp-trust-div" />
              <div className="hp-trust-item"><span className="hp-trust-val">55+</span>Risk Signals</div>
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
                <div className="hp-si"><span className="hp-sd hp-sd-r" />Layoffs in Your Department</div>
                <div className="hp-si"><span className="hp-sd hp-sd-a" />AI Risk to Your Job Rising (42%)</div>
                <div className="hp-si"><span className="hp-sd hp-sd-a" />Hard to Move Teams Internally</div>
                <div className="hp-si"><span className="hp-sd hp-sd-g" />Your Skills Still In Demand</div>
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

      {/* ── SECTION: PROFESSION RISK ── */}
      <section className="hp-section hp-fs" style={{ padding:"6rem 0" }}>
        <div className="hp-container hp-z2">
          <div style={{
            maxWidth: 860,
            margin: "0 auto",
            textAlign: "center",
          }}>
            {/* Eyebrow */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              borderRadius: 999,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.22)",
              marginBottom: "2rem",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444", animation: "hp-bpulse 2s infinite", display: "inline-block" }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "#ef4444", fontWeight: 700 }}>
                Long-Term Career Risk
              </span>
            </div>

            {/* Headline */}
            <h2 style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: "clamp(1.75rem,4vw,2.75rem)",
              fontWeight: 800,
              lineHeight: 1.18,
              marginBottom: "1.6rem",
              color: "var(--hp-text)",
            }}>
              Your Company May Be{" "}
              <span style={{ color: "var(--hp-cyan)" }}>Stable Today.</span>
              <br />
              Your Profession May{" "}
              <span style={{
                background: "linear-gradient(90deg,#ef4444,#f97316)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>Not Be.</span>
            </h2>

            {/* Body copy */}
            <p style={{
              fontSize: "clamp(1rem,2vw,1.15rem)",
              color: "var(--hp-muted)",
              lineHeight: 1.8,
              marginBottom: "1.2rem",
              maxWidth: 680,
              margin: "0 auto 1.2rem",
            }}>
              HumanProof does not only measure current layoff risk.
            </p>
            <p style={{
              fontSize: "clamp(0.95rem,1.8vw,1.05rem)",
              color: "var(--hp-muted)",
              lineHeight: 1.85,
              marginBottom: "2.8rem",
              maxWidth: 680,
              margin: "0 auto 2.8rem",
            }}>
              It also monitors long-term workforce transformation pressure, AI disruption exposure,
              career durability, and future labour market shifts.
            </p>

            {/* Divider statement */}
            <div style={{
              display: "inline-block",
              padding: "14px 28px",
              borderRadius: 12,
              background: "rgba(0,212,255,0.05)",
              border: "1px solid rgba(0,212,255,0.15)",
              marginBottom: "2.8rem",
            }}>
              <p style={{ margin: 0, fontSize: "clamp(0.95rem,1.8vw,1.05rem)", color: "var(--hp-cyan)", fontWeight: 600, lineHeight: 1.7 }}>
                Because career risk is no longer only about your employer.
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "clamp(0.9rem,1.6vw,1rem)", color: "var(--hp-text)", fontWeight: 700, lineHeight: 1.5 }}>
                It is increasingly about the future value of your profession.
              </p>
            </div>

            {/* 4 pillars */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 14,
              marginTop: "0.5rem",
            }}>
              {[
                { Illustration: MarketDynamicsIllustration, label: "How Fast Jobs Are Changing",   color: "rgba(0,212,255,0.12)", border: "rgba(0,212,255,0.22)", tc: "var(--hp-cyan)" },
                { Illustration: AIDisplacementIllustration, label: "How Much AI Affects Your Job", color: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.22)",  tc: "#ef4444" },
                { Illustration: ProtectionIllustration,     label: "How Stable Your Career Is",    color: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.22)", tc: "#10b981" },
                { Illustration: OpportunityIllustration,    label: "Where Jobs Are Headed",        color: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)", tc: "#f59e0b" },
              ].map(p => (
                <div key={p.label} style={{
                  padding: "18px 16px",
                  borderRadius: 12,
                  background: p.color,
                  border: `1px solid ${p.border}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <p.Illustration size={56} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: p.tc, lineHeight: 1.4, textAlign: "center" }}>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: RISK REDUCTION ── */}
      <section id="how-it-works" className="hp-red-section hp-section hp-fs">
        <div className="hp-container hp-z2">
          <div className="hp-sec-label">How It Works</div>
          <h2 className="hp-sec-title">Don't Just Know The Risk.<br /><span className="hp-gtext">Reduce It.</span></h2>
          <div className="hp-red-wrap">
            <div className="hp-red-steps">
              {[
                { score:"68", cls:"hp-rs-high", title:"Starting Point",                    txt:"Your starting career risk score based on all detected signals." },
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
                <line x1="40" y1="30" x2="40" y2="240" stroke="var(--alpha-bg-06)" strokeWidth="1"/>
                <line x1="40" y1="240" x2="360" y2="240" stroke="var(--alpha-bg-06)" strokeWidth="1"/>
                {[180,130,80].map(y=><line key={y} x1="40" y1={y} x2="360" y2={y} stroke="var(--alpha-bg-04)" strokeWidth="1" strokeDasharray="4 3"/>)}
                <path d="M80,80 L160,116 L240,140 L320,162 L320,240 L80,240 Z" fill="url(#rdg)"/>
                <path d="M80,80 L160,116 L240,140 L320,162" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray:400,animation:"hp-linedraw 2s ease forwards" }}/>
                {[{cx:80,cy:80,fill:"#ef4444",label:"68",ly:70},{cx:160,cy:116,fill:"#f59e0b",label:"55",ly:106},{cx:240,cy:140,fill:"#f59e0b",label:"46",ly:130},{cx:320,cy:162,fill:"#10b981",label:"38",ly:152}].map(p=>(
                  <g key={p.cx}>
                    <circle cx={p.cx} cy={p.cy} r="6" fill={p.fill}/>
                    <text x={p.cx} y={p.ly} textAnchor="middle" fontSize="10" fill={p.fill} fontFamily="'Syne',sans-serif" fontWeight="700">{p.label}</text>
                  </g>
                ))}
                {["BASELINE","ACTION 1","ACTION 2","ACTION 3"].map((t,i)=>(
                  <text key={t} x={80+i*80} y="258" textAnchor="middle" fontSize="7" fill="var(--alpha-text-20)" fontFamily="JetBrains Mono,monospace">{t}</text>
                ))}
                <text x="200" y="22" textAnchor="middle" fontSize="9" fill="var(--alpha-text-30)" fontFamily="JetBrains Mono,monospace">RISK REDUCTION JOURNEY</text>
                <rect x="250" y="30" width="100" height="30" rx="6" fill="rgba(16,185,129,.1)" stroke="rgba(16,185,129,.2)" strokeWidth=".5"/>
                <text x="300" y="44" textAnchor="middle" fontSize="8" fill="rgba(16,185,129,.8)" fontFamily="JetBrains Mono,monospace">↓ 30 POINTS</text>
                <text x="300" y="55" textAnchor="middle" fontSize="7" fill="rgba(16,185,129,.5)" fontFamily="JetBrains Mono,monospace">TOTAL REDUCTION</text>
              </svg>
            </div>
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
