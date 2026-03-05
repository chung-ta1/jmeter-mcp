import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../config.js";

describe("loadConfig", () => {
  const originalEnv = process.env.JMETER_HOME;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.JMETER_HOME = originalEnv;
    } else {
      delete process.env.JMETER_HOME;
    }
  });

  it("should throw when JMETER_HOME is not set", () => {
    delete process.env.JMETER_HOME;
    expect(() => loadConfig()).toThrow("JMETER_HOME environment variable is required");
  });

  it("should return config with correct paths when JMETER_HOME is set", () => {
    process.env.JMETER_HOME = "/opt/jmeter";
    const config = loadConfig();

    expect(config.jmeterHome).toBe("/opt/jmeter");
    expect(config.jmeterBin).toBe("/opt/jmeter/bin/jmeter");
  });
});
