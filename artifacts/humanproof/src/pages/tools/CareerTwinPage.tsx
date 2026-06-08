// CareerTwinPage.tsx — Tool 10: Career Twin OS
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ToolPageLayout } from '../../components/Tools/ToolPageLayout';
import { CareerTwinOS } from '../../components/Tools/CareerTwin/CareerTwinOS';

export default function CareerTwinPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();



  return (
    <ToolPageLayout
      title="Career Twin"
      subtitle="Your persistent career model — profile, skills, goals, and full history"
      icon={<GitBranch size={20} />}
      accentColor="#a78bfa"
    >
      <CareerTwinOS />
    </ToolPageLayout>
  );
}
