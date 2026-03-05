import "dotenv/config";
import path from "node:path";
import type { AppConfig } from "./types/index.js";

export function loadConfig(): AppConfig {
  const jmeterHome = process.env.JMETER_HOME;
  if (!jmeterHome) {
    throw new Error(
      "JMETER_HOME environment variable is required. Set it to your JMeter installation path."
    );
  }

  return {
    jmeterHome,
    jmeterBin: path.join(jmeterHome, "bin", "jmeter"),
  };
}
