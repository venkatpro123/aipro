import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { MonitoringDashboard } from "../components/Monitoring/MonitoringDashboard";

export default function MonitoringPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div style={{ maxWidth: 1024, margin: "0 auto", padding: "0 16px 80px" }}>
      <MonitoringDashboard />
    </div>
  );
}
