import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { ToolPageLayout } from '../../components/Tools/ToolPageLayout';
import { MarketIntelligenceCenter } from '../../components/Tools/MarketIntel/MarketIntelligenceCenter';
import { BarChart2 } from 'lucide-react';

export default function MarketIntelligencePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <ToolPageLayout
      title="Market Intelligence Center"
      subtitle="Spot career opportunities before they're obvious"
      icon={<BarChart2 size={22} />}
      accentColor="#f59e0b"
    >
      <MarketIntelligenceCenter />
    </ToolPageLayout>
  );
}
