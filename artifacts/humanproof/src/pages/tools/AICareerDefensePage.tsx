import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { ToolPageLayout } from '../../components/Tools/ToolPageLayout';
import { AICareerDefenseCenter } from '../../components/Tools/AIDefense/AICareerDefenseCenter';
import { Brain } from 'lucide-react';

export default function AICareerDefensePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <ToolPageLayout
      title="AI Career Defense Center"
      subtitle="Protect your career against AI disruption"
      icon={<Brain size={22} />}
      accentColor="var(--cyan)"
    >
      <AICareerDefenseCenter />
    </ToolPageLayout>
  );
}
