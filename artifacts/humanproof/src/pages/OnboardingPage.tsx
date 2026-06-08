// OnboardingPage.tsx — Route /onboarding
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OnboardingFlow } from '../components/Onboarding/OnboardingFlow';

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Must be authenticated to onboard
  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return <OnboardingFlow />;
}
