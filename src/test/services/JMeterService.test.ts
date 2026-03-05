import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppConfig } from "../../types/index.js";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

import { readFile } from "node:fs/promises";
import { JMeterService } from "../../services/JMeterService.js";

const mockReadFile = vi.mocked(readFile);

const mockConfig: AppConfig = {
  jmeterHome: "/opt/jmeter",
  jmeterBin: "/opt/jmeter/bin/jmeter",
};

describe("JMeterService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("parseJtlResults", () => {
    it("should parse CSV results correctly", async () => {
      const csvContent = [
        "timeStamp,elapsed,label,responseCode,success,bytes,sentBytes,grpThreads,allThreads,URL,Latency,Connect",
        "1000,150,GET /api/users,200,true,1024,256,1,1,http://localhost/api/users,120,30",
        "1100,200,GET /api/users,200,true,1024,256,1,1,http://localhost/api/users,160,25",
        "1200,180,GET /api/users,500,false,512,256,1,1,http://localhost/api/users,140,20",
      ].join("\n");

      mockReadFile.mockResolvedValue(csvContent);

      const service = new JMeterService(mockConfig);
      const result = await service.parseJtlResults("/fake/path.jtl");

      expect(result.overall.totalRequests).toBe(3);
      expect(result.overall.successCount).toBe(2);
      expect(result.overall.errorCount).toBe(1);
      expect(result.overall.errorRate).toBeCloseTo(33.33, 1);
      expect(result.overall.avgResponseTime).toBe(177);
      expect(result.overall.minResponseTime).toBe(150);
      expect(result.overall.maxResponseTime).toBe(200);
    });

    it("should return empty stats for empty file", async () => {
      mockReadFile.mockResolvedValue(
        "timeStamp,elapsed,label,responseCode,success,bytes,sentBytes,grpThreads,allThreads,URL,Latency,Connect\n"
      );

      const service = new JMeterService(mockConfig);
      const result = await service.parseJtlResults("/fake/path.jtl");

      expect(result.overall).toEqual({});
    });

    it("should include per-request details when detailed is true", async () => {
      const csvContent = [
        "timeStamp,elapsed,label,responseCode,success,bytes,sentBytes,grpThreads,allThreads,URL,Latency,Connect",
        "1000,150,GET /api/users,200,true,1024,256,1,1,http://localhost/api/users,120,30",
        "1100,200,POST /api/users,200,true,512,512,1,1,http://localhost/api/users,160,25",
      ].join("\n");

      mockReadFile.mockResolvedValue(csvContent);

      const service = new JMeterService(mockConfig);
      const result = await service.parseJtlResults("/fake/path.jtl", true);

      expect(result.perRequest).toBeDefined();
      const perRequest = result.perRequest as Record<string, any>;
      expect(perRequest["GET /api/users"]).toBeDefined();
      expect(perRequest["POST /api/users"]).toBeDefined();
      expect(perRequest["GET /api/users"].count).toBe(1);
    });
  });

  describe("extractTestPlanSummary", () => {
    it("should extract thread groups from parsed XML", () => {
      const service = new JMeterService(mockConfig);
      const parsed = {
        jmeterTestPlan: {
          hashTree: {
            hashTree: {
              ThreadGroup: {
                "@_testname": "Users",
                "@_enabled": "true",
              },
            },
          },
        },
      };

      const summary = service.extractTestPlanSummary(parsed);
      expect(summary.threadGroups).toBeDefined();
      expect((summary.threadGroups as any[]).length).toBe(1);
      expect((summary.threadGroups as any[])[0].name).toBe("Users");
    });

    it("should handle unparseable structure", () => {
      const service = new JMeterService(mockConfig);
      const summary = service.extractTestPlanSummary({});

      expect(summary.raw).toBe("Could not parse test plan structure");
    });
  });
});
