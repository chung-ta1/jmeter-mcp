import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, readdir } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import { XMLParser } from "fast-xml-parser";
import path from "node:path";
import type { AppConfig, JtlRecord, OverallStats, ParsedResults } from "../types/index.js";
import { percentile } from "../utils/stats.js";

const execFileAsync = promisify(execFile);

export class JMeterService {
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  async runTestPlan(options: {
    testPlanPath: string;
    outputPath?: string;
    properties?: Record<string, string>;
    threads?: number;
    duration?: number;
    rampUp?: number;
  }): Promise<{ resultsFile: string; stdout: string; stderr: string }> {
    const resultsFile = options.outputPath || `/tmp/jmeter-results-${Date.now()}.jtl`;

    const args = [
      "-n",
      "-t", options.testPlanPath,
      "-l", resultsFile,
      "-e",
      "-o", `/tmp/jmeter-report-${Date.now()}`,
    ];

    if (options.threads !== undefined) args.push(`-Jthreads=${options.threads}`);
    if (options.duration !== undefined) args.push(`-Jduration=${options.duration}`);
    if (options.rampUp !== undefined) args.push(`-JrampUp=${options.rampUp}`);

    if (options.properties) {
      for (const [key, value] of Object.entries(options.properties)) {
        args.push(`-J${key}=${value}`);
      }
    }

    const { stdout, stderr } = await execFileAsync(this.config.jmeterBin, args, {
      timeout: 600_000,
      env: { ...process.env, JMETER_HOME: this.config.jmeterHome },
    });

    return { resultsFile, stdout, stderr };
  }

  async parseJtlResults(filePath: string, detailed = false): Promise<ParsedResults> {
    const content = await readFile(filePath, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
    }) as JtlRecord[];

    if (records.length === 0) {
      return { overall: {} as OverallStats };
    }

    const elapsed = records.map(r => parseInt(r.elapsed, 10));
    const sorted = [...elapsed].sort((a, b) => a - b);

    const totalRequests = records.length;
    const successCount = records.filter(r => r.success === "true").length;
    const errorCount = totalRequests - successCount;

    const timestamps = records.map(r => parseInt(r.timeStamp, 10));
    const durationMs = Math.max(...timestamps) - Math.min(...timestamps);
    const durationSec = durationMs / 1000 || 1;

    const overall: OverallStats = {
      totalRequests,
      successCount,
      errorCount,
      errorRate: parseFloat(((errorCount / totalRequests) * 100).toFixed(2)),
      avgResponseTime: Math.round(elapsed.reduce((a, b) => a + b, 0) / totalRequests),
      minResponseTime: sorted[0],
      maxResponseTime: sorted[sorted.length - 1],
      p50ResponseTime: percentile(sorted, 50),
      p90ResponseTime: percentile(sorted, 90),
      p95ResponseTime: percentile(sorted, 95),
      p99ResponseTime: percentile(sorted, 99),
      throughput: parseFloat((totalRequests / durationSec).toFixed(2)),
      avgLatency: Math.round(
        records.map(r => parseInt(r.Latency || "0", 10)).reduce((a, b) => a + b, 0) / totalRequests
      ),
      avgConnectTime: Math.round(
        records.map(r => parseInt(r.Connect || "0", 10)).reduce((a, b) => a + b, 0) / totalRequests
      ),
    };

    const result: ParsedResults = { overall };

    if (detailed) {
      const byLabel = new Map<string, number[]>();
      for (const r of records) {
        const list = byLabel.get(r.label) || [];
        list.push(parseInt(r.elapsed, 10));
        byLabel.set(r.label, list);
      }

      result.perRequest = Object.fromEntries(
        [...byLabel.entries()].map(([label, times]) => {
          const s = [...times].sort((a, b) => a - b);
          return [label, {
            count: times.length,
            avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
            min: s[0],
            max: s[s.length - 1],
            p95: percentile(s, 95),
            p99: percentile(s, 99),
          }];
        })
      );
    }

    return result;
  }

  async findJmxFiles(dir: string, recursive: boolean): Promise<string[]> {
    const results: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith(".jmx")) {
        results.push(fullPath);
      } else if (entry.isDirectory() && recursive) {
        results.push(...await this.findJmxFiles(fullPath, true));
      }
    }

    return results;
  }

  extractTestPlanSummary(parsed: Record<string, unknown>): Record<string, unknown> {
    const summary: Record<string, unknown> = {};

    try {
      const testPlan = (parsed as any)?.jmeterTestPlan?.hashTree?.hashTree;
      if (!testPlan) {
        return { raw: "Could not parse test plan structure" };
      }

      const threadGroups: Record<string, unknown>[] = [];
      const extractElements = (node: any, depth = 0) => {
        if (!node || depth > 10) return;

        if (Array.isArray(node)) {
          node.forEach(n => extractElements(n, depth + 1));
          return;
        }

        if (typeof node === "object") {
          for (const [key, value] of Object.entries(node)) {
            if (key === "ThreadGroup" || key.includes("ThreadGroup")) {
              threadGroups.push({
                type: key,
                name: (value as any)?.["@_testname"] || "unnamed",
                enabled: (value as any)?.["@_enabled"] || "true",
              });
            }
            extractElements(value, depth + 1);
          }
        }
      };

      extractElements(testPlan);
      summary.threadGroups = threadGroups;

      const content = JSON.stringify(parsed);
      summary.samplerCount = (content.match(/Sampler/g) || []).length;
      summary.assertionCount = (content.match(/Assertion/g) || []).length;
      summary.listenerCount = (content.match(/Listener|Reporter|Visualizer/g) || []).length;
    } catch {
      summary.error = "Failed to extract test plan structure";
    }

    return summary;
  }
}
