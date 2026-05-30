import React, { useState } from 'react';
import { Scale, ArrowRight, Target, Zap } from 'lucide-react';
import { calculateScore, getScoreColor } from '../data/riskFormula';
import { WORK_TYPES, INDUSTRIES } from '../data/catalogData';

export const ScoreComparison: React.FC = () => {
  const [roleA, setRoleA] = useState({ work: '', ind: '' });
  const [roleB, setRoleB] = useState({ work: '', ind: '' });

  const scoreA = (roleA.work && roleA.ind) ? calculateScore(roleA.work, roleA.ind).total : null;
  const scoreB = (roleB.work && roleB.ind) ? calculateScore(roleB.work, roleB.ind).total : null;

  // Filtered role options based on selected industry
  const workTypesA = roleA.ind ? (WORK_TYPES[roleA.ind as keyof typeof WORK_TYPES] ?? []) : [];
  const workTypesB = roleB.ind ? (WORK_TYPES[roleB.ind as keyof typeof WORK_TYPES] ?? []) : [];

  return (
    <div className="mt-12 p-8 bg-slate-900/40 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Premium Glass Effect Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />
      
      <div className="flex items-center gap-3 mb-10 relative z-10">
        <div className="p-2.5 bg-cyan-500/20 border border-cyan-500/30 rounded-xl">
          <Scale className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Role Risk Comparison</h3>
          <p className="text-sm text-slate-400 font-medium">Benchmark AI resistance across different career paths</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
        {/* Role A */}
        <div className="space-y-5">
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] pl-1">Baseline Role</div>
          <div className="space-y-3">
            <select 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:border-cyan-500 outline-none transition-all"
              value={roleA.ind}
              onChange={(e) => setRoleA({ ind: e.target.value, work: '' })}
            >
              <option value="">Select Industry</option>
              {INDUSTRIES.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
            <select 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:border-cyan-500 outline-none transition-all disabled:opacity-40"
              value={roleA.work}
              onChange={(e) => setRoleA({ ...roleA, work: e.target.value })}
              disabled={!roleA.ind}
            >
              <option value="">Select Role</option>
              {workTypesA.map((w: any) => <option key={w.key} value={w.key}>{w.label}</option>)}
            </select>
          </div>
          {scoreA !== null && (
            <div className="p-6 bg-slate-950/50 rounded-2xl border border-white/5 text-center shadow-inner">
              <div className="text-4xl font-black mb-1" style={{ color: getScoreColor(scoreA) }}>{scoreA}%</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Calculated Risk</div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="hidden md:flex absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center z-10 shadow-xl">
           <span className="text-[10px] font-black text-cyan-500">VS</span>
        </div>

        {/* Role B */}
        <div className="space-y-5">
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] pl-1">Target Role</div>
          <div className="space-y-3">
            <select 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:border-amber-500 outline-none transition-all"
              value={roleB.ind}
              onChange={(e) => setRoleB({ ind: e.target.value, work: '' })}
            >
              <option value="">Select Industry</option>
              {INDUSTRIES.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
            <select 
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-white focus:border-amber-500 outline-none transition-all disabled:opacity-40"
              value={roleB.work}
              onChange={(e) => setRoleB({ ...roleB, work: e.target.value })}
              disabled={!roleB.ind}
            >
              <option value="">Select Role</option>
              {workTypesB.map((w: any) => <option key={w.key} value={w.key}>{w.label}</option>)}
            </select>
          </div>
          {scoreB !== null && (
            <div className="p-6 bg-slate-950/50 rounded-2xl border border-white/5 text-center shadow-inner">
              <div className="text-4xl font-black mb-1" style={{ color: getScoreColor(scoreB) }}>{scoreB}%</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Calculated Risk</div>
            </div>
          )}
        </div>
      </div>

      {scoreA !== null && scoreB !== null && (
        <div className="mt-10 p-6 bg-cyan-500/5 rounded-3xl border border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 group overflow-hidden">
           {/* Shimmer Effect */}
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
           
           <div className="flex items-center gap-5 relative z-10">
              <div className={`p-4 rounded-2xl shadow-lg transition-transform group-hover:scale-110 ${scoreB < scoreA ? 'bg-emerald-500/20 text-emerald-400 shadow-emerald-500/10' : 'bg-rose-500/20 text-rose-400 shadow-rose-500/10'}`}>
                 {scoreB < scoreA ? <Target className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
              </div>
              <div>
                 <div className="text-base font-black text-white mb-1">
                    {scoreB < scoreA 
                      ? `${Math.round(scoreA - scoreB)} point risk reduction` 
                      : `${Math.round(scoreB - scoreA)} point risk increase`}
                 </div>
                 <p className="text-xs text-slate-400 font-medium">
                    {scoreB < scoreA 
                      ? 'The target role is statistically safer under current AI disruption vectors.' 
                      : 'The baseline role currently maintains superior AI resistance.'}
                 </p>
              </div>
           </div>
           <button 
             onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'safe-careers' }))}
             className="flex items-center gap-2.5 text-xs font-black uppercase text-cyan-400 hover:text-cyan-300 transition-colors relative z-10"
           >
             View All Safe Careers <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
           </button>
        </div>
      )}
    </div>
  );
};
