export interface JtlRecord {
  timeStamp: string;
  elapsed: string;
  label: string;
  responseCode: string;
  success: string;
  bytes: string;
  sentBytes: string;
  grpThreads: string;
  allThreads: string;
  URL: string;
  Latency: string;
  Connect: string;
}

export interface OverallStats {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  avgLatency: number;
  avgConnectTime: number;
}

export interface ParsedResults {
  overall: OverallStats;
  [key: string]: unknown;
}

export interface AppConfig {
  jmeterHome: string;
  jmeterBin: string;
}
