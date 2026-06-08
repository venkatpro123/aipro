import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { ToolPageLayout } from '../../components/Tools/ToolPageLayout';
import { CareerInsuranceCenter } from '../../components/Tools/CareerInsurance/CareerInsuranceCenter';
import { DollarSign } from 'lucide-react';

export default function CareerInsurancePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <ToolPageLayout
      title="Career Insurance Center"
      subtitle="Financial survivability planning for your career"
      icon={<DollarSign size={22} />}
      accentColor="#10b981"
    >
      <CareerInsuranceCenter />
    </ToolPageLayout>
  );
}
