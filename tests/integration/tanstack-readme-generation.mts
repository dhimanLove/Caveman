import { runReadmeGeneration } from "../../src/features/generation/server/readme.functions.ts";

if (!process.env.GENERATIVE_KEY || !process.env.AI_MODEL) {
  console.error("Set GENERATIVE_KEY and AI_MODEL env vars before running this test.");
  process.exit(1);
}

const r = await runReadmeGeneration({
  projectUrl: "https://github.com/dhimanLove/Rajasthan-CA",
  description: "",
  style: "standard",
  sections: ["Features", "Installation", "Usage", "Tech Stack", "License"],
  tone: "technical",
});

console.log("TITLE:", JSON.stringify(r.discovery.inferredTitle));
console.log("DESC:", JSON.stringify(r.discovery.inferredDescription));
console.log("STACK:", JSON.stringify(r.discovery.detectedStack));
console.log(r.readme);
