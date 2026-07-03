import path from "node:path";
import dotenv from "dotenv";
import OpenAI from "openai";

// Load .env from backend/.env and also from the repo root .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

console.log("OPENAI_API_KEY exists:", Boolean(process.env.OPENAI_API_KEY));
console.log("OPENAI_MODEL:", process.env.OPENAI_MODEL);
console.log("OPENAI_JUDGE_MODEL:", process.env.OPENAI_JUDGE_MODEL);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4-nano",
    input: "Say hello in one sentence.",
  });

  console.log(response.output_text);
}

main().catch((err) => {
  console.error("AI TEST FAILED");
  console.error(err);
  console.error("cause:", err?.cause);
});