import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { ToolPageLayout } from '../../components/Tools/ToolPageLayout';
import { LayoffDefenseCenter } from '../../components/Tools/LayoffDefense/LayoffDefenseCenter';
import { Shield } from 'lucide-react';

export default function LayoffDefensePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <ToolPageLayout
      title="Layoff Defense Center"
      subtitle="Reduce your displacement risk with targeted strategies"
      icon={<Shield size={22} />}
      accentColor="#ef4444"
    >
      <LayoffDefenseCenter />
    </ToolPageLayout>
  );
}
