import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

export function modelInfo(): { provider: string; id: string } {
  const provider = (process.env.GEMMA_PROVIDER ?? "google").toLowerCase();
  const fallback = provider === "groq" ? "gemma2-9b-it" : "gemma-4-26b-a4b-it";
  return { provider, id: process.env.GEMMA_MODEL ?? fallback };
}

export function modelConfigured(): boolean {
  const { provider } = modelInfo();
  return Boolean(provider === "groq" ? process.env.GROQ_API_KEY : process.env.GOOGLE_API_KEY);
}

export function getModel() {
  const { provider, id } = modelInfo();
  if (provider === "groq") return createGroq({ apiKey: process.env.GROQ_API_KEY })(id);
  return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY })(id);
}
