import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, Cpu, Activity, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { MASTER_CAREER_INTELLIGENCE } from '../data/intelligence';
import { useHumanProof } from '../context/HumanProofContext';
import { WORK_TYPES } from '../data/catalogData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface RoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleSelectorModal({ isOpen, onClose }: RoleSelectorModalProps) {
  const navigate = useNavigate();
  const { dispatch } = useHumanProof();
  const [search, setSearch] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  const roles = Object.values(MASTER_CAREER_INTELLIGENCE);
  const filteredRoles = roles.filter(role => {
    const title = role.displayRole || '';
    return title.toLowerCase().includes(search.toLowerCase());
  }).slice(0, 8);

  const startAnalysis = (role: any) => {
    let foundWorkTypeKey = '';
    let foundIndustryKey = '';
    
    for (const [key, value] of Object.entries(MASTER_CAREER_INTELLIGENCE)) {
      if (value.displayRole === role.displayRole) {
        foundWorkTypeKey = key;
        
        for (const [iKey, types] of Object.entries(WORK_TYPES)) {
          if (types.some(t => t.key === key)) {
            foundIndustryKey = iKey;
            break;
          }
        }
        
        if (!foundIndustryKey) foundIndustryKey = 'it_software'; 
        break;
      }
    }

    dispatch({ 
      type: 'SET_INITIAL_ROLE', 
      industryKey: foundIndustryKey, 
      workTypeKey: foundWorkTypeKey 
    });

    setIsAnalyzing(true);
    setProgress(0);
  };

  useEffect(() => {
    if (isAnalyzing) {
      const steps = [
        'Initializing Frontier Engine...',
        'Synthesizing 4.8B+ data nodes...',
        'Calibrating 6-dimension risk matrix...',
        'Evaluating task-specific automation depth...',
        'Finalizing audit report...'
      ];
      
      let stepIdx = 0;
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsAnalyzing(false);
              onClose();
              dispatch({ type: 'SET_ACTIVE_TAB', tab: 'risk-calculators' });
              navigate('/terminal', { state: { newAudit: true } });
            }, 500);
            return 100;
          }
          const next = prev + 1;
          if (next % 20 === 0 && stepIdx < steps.length - 1) {
            stepIdx++;
            setCurrentStep(steps[stepIdx]);
          }
          return next;
        });
      }, 30);
      setCurrentStep(steps[0]);
      return () => clearInterval(interval);
    }
  }, [isAnalyzing, onClose, dispatch, navigate]);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1100]" />
        <DialogPrimitive.Content 
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-var(--space-8))] max-w-[600px] z-[1200] outline-none"
        >
          <Card className="p-0 border-[var(--border-cyan)] shadow-[0_0_50px_rgba(0,240,255,0.15)] bg-black/90 backdrop-blur-xl overflow-hidden rounded-[var(--radius-2xl)]">
            <AnimatePresence mode="wait">
              {!isAnalyzing ? (
                <motion.div
                  key="search"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-[var(--space-6)]"
                >
                  <div className="flex justify-between items-start mb-[var(--space-8)]">
                    <div>
                      <h2 className="display-3 mb-[var(--space-2)]">Risk Oracle</h2>
                      <p className="body text-muted-foreground">Select your role to begin high-fidelity auditing.</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                      <X size={18} />
                    </Button>
                  </div>

                  <div className="relative mb-[var(--space-8)]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input 
                      className="pl-10 h-12 text-lg" 
                      placeholder="Search thousands of verified roles..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col gap-[var(--space-2)] max-h-[320px] overflow-y-auto pr-[var(--space-2)] custom-scrollbar">
                    {filteredRoles.map((role) => (
                      <Button
                        key={role.displayRole}
                        variant="secondary"
                        onClick={() => startAnalysis(role)}
                        className="w-full justify-between h-auto py-[var(--space-4)] px-[var(--space-5)] text-left group"
                      >
                        <span className="font-bold">{role.displayRole}</span>
                        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                      </Button>
                    ))}
                    {filteredRoles.length === 0 && (
                      <div className="text-center py-[var(--space-12)] text-muted-foreground opacity-60">
                        No roles found. Try a different term.
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-[var(--space-12)] md:p-[var(--space-16)] flex flex-col items-center text-center"
                >
                  <div className="relative mb-[var(--space-10)]">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      className="w-[120px] h-[120px] rounded-full border-2 border-[var(--cyan)]/20 border-t-[var(--cyan)] flex items-center justify-center"
                    >
                      <Shield size={48} className="text-[var(--cyan)]" />
                    </motion.div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-[-20px] rounded-full bg-radial-gradient from-[var(--cyan)]/20 to-transparent -z-10"
                    />
                  </div>

                  <h2 className="h2 mb-[var(--space-6)] tracking-widest uppercase text-white">
                    ANALYZING WITH FRONTIER AI...
                  </h2>
                  
                  <div className="w-full max-w-[300px] mb-[var(--space-10)]">
                    <Progress value={progress} className="h-1" />
                    <div className="flex justify-between mt-[var(--space-4)]">
                      <span className="label-xs text-[var(--cyan)] font-black">{progress}%</span>
                      <span className="label-xs opacity-60 font-bold">{currentStep}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-[var(--space-4)] w-full">
                    {[
                      { icon: Cpu, label: 'Neural Synapse', color: 'text-[var(--cyan)]' },
                      { icon: Activity, label: 'Risk Calibration', color: 'text-purple-500' },
                      { icon: Shield, label: 'Safety Protocol', color: 'text-[var(--emerald)]' }
                    ].map((item, i) => (
                      <Card key={i} className="p-[var(--space-4)] bg-white/3 border-white/5 flex flex-col items-center gap-[var(--space-2)]">
                        <item.icon size={16} className={item.color} />
                        <div className="text-[10px] font-black uppercase text-white/40 tracking-tighter">{item.label}</div>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
