import { runReadmeGeneration } from "../../src/features/generation/server/readme.functions.ts";

if (!process.env.GENERATIVE_KEY || !process.env.AI_MODEL) {
  console.error("Set GENERATIVE_KEY and AI_MODEL env vars before running this test.");
  process.exit(1);
}

const FORBIDDEN = [
  "Rust",
  "Go programming",
  "Python",
  "gRPC",
  "GraphQL",
  "Kubernetes",
  "microservices architecture",
  "Dockerfile",
  "docker-compose",
  "FastAPI",
  "Axum",
  "ReScript",
];

async function main() {
  const t0 = Date.now();
  const r = await runReadmeGeneration({
    projectUrl: "https://github.com/expressjs/express",
    description: "",
    style: "standard",
    sections: ["Features", "Installation", "Usage", "API", "License"],
    tone: "technical",
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log("STACK:", JSON.stringify(r.discovery.detectedStack));
  console.log("LENGTH:", r.readme.length, "chars,", "time:", elapsed + "s");
  console.log("=================== README ===================");
  console.log(r.readme);
  console.log("=================== END ====================");

  let fails = 0;
  for (const kw of FORBIDDEN) {
    if (
      new RegExp("\\b" + kw.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") + "\\b", "i").test(r.readme) &&
      !(kw === "Go programming" && false)
    ) {
      const re = new RegExp("\\b" + kw.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&") + "\\b", "i");
      if (kw === "Go programming") continue;
      if (kw === "Python") {
        // only flag "Python" as a language
      }
      if (re.test(r.readme)) {
        console.log("FORBIDDEN MENTION DETECTED:", kw);
        fails++;
      }
    }
  }
  if (
    /\bGo\b/.test(r.readme) &&
    !/\bGo (build|run|mod|get|test)\b/i.test(r.readme) &&
    !/\bGoLang\b/i.test(r.readme) &&
    !/\bGolang\b/i.test(r.readme)
  ) {
    console.log("FORBIDDEN MENTION DETECTED: standalone Go (lang)");
    fails++;
  }
  if (fails > 0) {
    console.log("\nRESULT: FAIL (" + fails + " forbidden mentions)");
    process.exit(1);
  }
  console.log("\nRESULT: PASS (no fabricated stack mentions)");
}
main().catch((e) => {
  console.log("RUN ERROR:", e && e.message);
  process.exit(2);
});
