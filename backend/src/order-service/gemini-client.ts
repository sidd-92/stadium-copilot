// Vertex AI (Gemini) client for order-service: menu summaries and
// disruption-reassignment messages are both generated here. Also owns
// the EN/FR/PT language-normalization helpers shared by menu-service.ts
// and disruption-handler.ts, since both need it to build Gemini prompts.
import type { GoogleGenAI as GoogleGenAIType } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import { createLogger } from "../shared/logger";

const logger = createLogger("order-service");

// gemini-2.5-flash is the current Vertex AI Flash model as of writing
// (retirement date Oct 16 2026, well past this hackathon). Overridable so
// a future model swap doesn't need a code change.
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const LOCATION = process.env.GEMINI_LOCATION ?? "us-central1";

const auth = new GoogleAuth();
let client: GoogleGenAIType | null = null;

// @google/genai ships as a pure ESM package whose "require" export
// condition points at a file that itself still contains `require()` —
// broken interop on their end. A plain `import()` gets downleveled by tsc
// (module: commonjs) back into that same broken require() path, so we go
// through `Function` to keep a genuine native dynamic import that Node
// resolves via the (working) "import" condition instead.
const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<typeof import("@google/genai")>;

async function getClient(): Promise<GoogleGenAIType> {
  if (!client) {
    const { GoogleGenAI } = await dynamicImport("@google/genai");
    const project = await auth.getProjectId();
    // vertexai: true + no apiKey uses ADC — the order-service runtime
    // service account (already granted roles/aiplatform.user), not a
    // hardcoded key.
    client = new GoogleGenAI({ vertexai: true, project, location: LOCATION });
  }
  return client;
}

export type SupportedLanguage = "en" | "fr" | "pt";

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  fr: "French",
  pt: "Portuguese",
};

export function normalizeLanguage(raw: string | undefined): SupportedLanguage {
  const cleaned = (raw ?? "").trim().toLowerCase();
  if (cleaned === "fr" || cleaned === "french") return "fr";
  if (cleaned === "pt" || cleaned === "portuguese") return "pt";
  return "en";
}

// One cheap call, one short sentence. Never throws — a Gemini outage
// shouldn't take down menu browsing or disruption handling; callers fall
// back to a canned non-AI string when this returns "".
export async function generateShortText(systemInstruction: string, dataBlock: string): Promise<string> {
  try {
    const ai = await getClient();
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: dataBlock }] }],
      config: {
        systemInstruction,
        maxOutputTokens: 120,
        temperature: 0.4,
        // Without this, 2.5 Flash's "thinking" mode silently eats most of
        // maxOutputTokens on reasoning before writing any visible text,
        // truncating a one-sentence answer to a couple of words
        // (finishReason: MAX_TOKENS). Not needed for a task this simple.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text?.trim();
    return text && text.length > 0 ? text : "";
  } catch (err) {
    logger.error("Gemini call failed:", err);
    return "";
  }
}
