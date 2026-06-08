import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { CareerOSHome } from "../components/CareerOS/CareerOSHome";

export default function CareerOSPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Guard: unauthenticated users are sent to the landing page
  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return <CareerOSHome />;
}
