export interface MonitoringFeedItem {
  id: string;
  category: 'company' | 'role' | 'market' | 'personal';
  severity: 'CRITICAL' | 'HIGH' | 'INFO';
  headline: string;
  detail: string;
  source: string;
  timestamp: string;
  toolLink?: string;
  dismissed: boolean;
}

export interface CareerMemorySummary {
  firstAuditDate: string;
  currentScore: number;
  scoreAtFirstAudit: number;
  scoreDelta: number;
  actionsCompleted: number;
  skillsAdded: number;
  daysMonitored: number;
}

export interface CareerHealthScore {
  total: number;
  riskComponent: number;
  actionComponent: number;
  skillComponent: number;
  financialComponent: number;
  computedAt: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'copilot';
  text: string;
  toolCard?: { toolName: string; toolRoute: string; toolIcon: string };
  timestamp: string;
}
