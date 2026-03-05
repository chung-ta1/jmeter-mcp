import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import type { AppConfig } from "../types/index.js";
import { JMeterService } from "../services/JMeterService.js";

export function registerTestPlanTools(server: McpServer, config: AppConfig): void {
  const service = new JMeterService(config);

  server.tool(
    "run_test_plan",
    "Execute a JMeter test plan (.jmx file) in non-GUI mode and return results summary",
    {
      testPlanPath: z.string().describe("Absolute path to the .jmx test plan file"),
      outputPath: z.string().optional().describe("Path for the results .jtl file (default: auto-generated in /tmp)"),
      properties: z.record(z.string()).optional().describe("JMeter properties to pass as -J key=value"),
      threads: z.number().optional().describe("Override number of threads (users)"),
      duration: z.number().optional().describe("Override test duration in seconds"),
      rampUp: z.number().optional().describe("Override ramp-up period in seconds"),
    },
    async ({ testPlanPath, outputPath, properties, threads, duration, rampUp }) => {
      try {
        const { resultsFile, stdout, stderr } = await service.runTestPlan({
          testPlanPath, outputPath, properties, threads, duration, rampUp,
        });

        const summary = await service.parseJtlResults(resultsFile);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "completed",
              resultsFile,
              summary,
              jmeterOutput: stdout.slice(-2000),
              ...(stderr ? { warnings: stderr.slice(-1000) } : {}),
            }, null, 2),
          }],
        };
      } catch (error: unknown) {
        const err = error as Error & { stdout?: string; stderr?: string };
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "error",
              message: err.message,
              stdout: err.stdout?.slice(-2000),
              stderr: err.stderr?.slice(-2000),
            }, null, 2),
          }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "list_test_plans",
    "Find all JMeter test plan files (.jmx) in a directory",
    {
      directory: z.string().describe("Directory to search for .jmx files"),
      recursive: z.boolean().optional().describe("Search subdirectories (default: true)"),
    },
    async ({ directory, recursive = true }) => {
      const plans = await service.findJmxFiles(directory, recursive);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ directory, testPlans: plans }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "inspect_test_plan",
    "Parse a .jmx file and return its structure (thread groups, samplers, assertions, etc.)",
    {
      testPlanPath: z.string().describe("Absolute path to the .jmx test plan file"),
    },
    async ({ testPlanPath }) => {
      const content = await readFile(testPlanPath, "utf-8");
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });
      const parsed = parser.parse(content);
      const summary = service.extractTestPlanSummary(parsed);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(summary, null, 2),
        }],
      };
    }
  );
}
