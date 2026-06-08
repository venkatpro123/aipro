// CareerTwinPage.tsx — Tool 10: Career Twin OS
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CareerTwinOS } from '../../components/Tools/CareerTwin/CareerTwinOS';

export default function CareerTwinPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ minHeight: '100vh', background: 'var(--bg)', padding: '24px 20px' }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/tools')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14, marginBottom: 24, padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Career OS Tools
        </button>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0, marginBottom: 6 }}>
            🤖 Career Twin
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            Your persistent career model. Profile, skills, goals, and full history — the more you fill in, the smarter every tool gets.
          </p>
        </div>

        <CareerTwinOS />
      </div>
    </motion.div>
  );
}
