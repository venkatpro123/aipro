import React from 'react';
import { motion } from 'framer-motion';
import { Network, Database, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { LiveSignalStatus } from '../services/liveSignalBanner';

interface Props {
  status: LiveSignalStatus;
}

export const LiveSignalStatusBar: React.FC<Props> = ({ status }) => {
  const getBannerStyles = () => {
    switch (status.statusColor) {
      case 'green':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'amber':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'red':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'gray':
      default:
        return 'bg-[var(--alpha-bg-06)] border-[var(--alpha-bg-10)] text-[var(--alpha-text-40)]';
    }
  };

  const getIcon = () => {
    if (status.overallStatus === 'unknown-company') return <ShieldAlert className="w-4 h-4" />;
    if (status.statusColor === 'red') return <Database className="w-4 h-4" />;
    if (status.statusColor === 'amber') return <AlertTriangle className="w-4 h-4" />;
    return <Network className="w-4 h-4" />;
  };

  // Extract the first part of the message to highlight it
  const [primaryMsg, ...restMsgArr] = status.statusMessage.split('—');
  const secondaryMsg = restMsgArr.join('—');

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full border-b backdrop-blur-sm px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${getBannerStyles()}`}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          {getIcon()}
          {status.statusColor === 'green' && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
          <span className="text-sm font-medium tracking-wide">
            {primaryMsg.trim()}
          </span>
          {secondaryMsg && (
            <>
              <span className="hidden sm:inline opacity-40">•</span>
              <span className="text-xs opacity-80 mt-0.5 sm:mt-0">
                {secondaryMsg.trim()}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4 pl-7 sm:pl-0">
        {status.stalenessWarning && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
            Stale Data ({status.dataAge} days)
          </div>
        )}
        
        <div className="flex items-center rounded-md px-2.5 py-1 whitespace-nowrap" style={{ background: 'var(--alpha-bg-04)', border: '1px solid var(--alpha-bg-06)' }}>
          <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: `var(--color-${status.statusColor}-500, currentColor)` }} />
          <span className="text-xs font-semibold">{status.confidenceNote}</span>
        </div>
      </div>
    </motion.div>
  );
};
