import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { ToolPageLayout } from '../../components/Tools/ToolPageLayout';
import { CareerReadinessCenter } from '../../components/Tools/CareerReadiness/CareerReadinessCenter';
import { Briefcase } from 'lucide-react';

export default function CareerReadinessPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <ToolPageLayout
      title="Career Readiness Center"
      subtitle="Get market-ready immediately"
      icon={<Briefcase size={22} />}
      accentColor="#a78bfa"
    >
      <CareerReadinessCenter />
    </ToolPageLayout>
  );
}
