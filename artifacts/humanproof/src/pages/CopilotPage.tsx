// CopilotPage.tsx — Route /copilot — Career Copilot conversational interface
import { motion } from 'framer-motion';
import { CareerCopilot } from '../components/Copilot/CareerCopilot';

export default function CopilotPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 20px 120px',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 680,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: 500,
      }}>
        <CareerCopilot />
      </div>
    </motion.div>
  );
}
