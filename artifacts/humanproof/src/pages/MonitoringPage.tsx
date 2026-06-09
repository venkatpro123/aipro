import { MonitoringDashboard } from "../components/Monitoring/MonitoringDashboard";
import { EarlyWarningFeed } from "../components/Monitoring/EarlyWarningFeed";

export default function MonitoringPage() {
  return (
    <div style={{ maxWidth: 1024, margin: "0 auto", padding: "0 16px 80px" }}>
      {/* Early Warning Network — detection overview (5 categories, detection language) */}
      <div style={{ padding: "28px 0 32px" }}>
        <EarlyWarningFeed />
      </div>

      {/* Detailed signal feeds by category */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingTop: 24,
      }}>
        <MonitoringDashboard />
      </div>
    </div>
  );
}
