import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { Market } from "@/lib/types";

const MODEL = "gpt-5.4-nano";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const JudgmentSchema = z.object({
  bestCandidateIndex: z
    .number()
    .int()
    .nullable()
    .describe("Index of the candidate that asks the exact same question as the source, or null if none do."),
  reason: z.string().describe("One short sentence explaining the decision."),
});

export interface AiMatchJudgment {
  index: number | null;
  reason: string;
}

/**
 * Ask a small model to judge which candidate (if any) asks the same real-world question
 * as the source market. Reserved for the "ambiguous" confidence band, where Jaccard token
 * overlap alone can't reliably tell a true cross-platform match from a same-topic-but-
 * different-question false positive (e.g. "will X drop out" vs "will X be endorsed" share
 * every proper noun but aren't the same bet). Returns null if no API key is configured or
 * the call fails, so callers can fall back to the heuristic ranking without breaking.
 */
export async function judgeBestMatch(
  source: Market,
  candidates: Market[],
): Promise<AiMatchJudgment | null> {
  if (!client || candidates.length === 0) return null;

  const candidateList = candidates
    .map((candidate, index) => `${index}. [${candidate.platform}] ${candidate.title}`)
    .join("\n");

  try {
    const response = await client.responses.parse({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "You compare prediction market titles across two platforms, Polymarket and Kalshi. " +
            "Decide which candidate, if any, asks the exact same real-world question as the source " +
            "market — same event, same condition, same resolution threshold/date where relevant — " +
            "not merely the same topic or people. If none of the candidates ask the same question, " +
            "return null for bestCandidateIndex.",
        },
        {
          role: "user",
          content: `Source market:\n${source.title}\n\nCandidates:\n${candidateList}`,
        },
      ],
      text: { format: zodTextFormat(JudgmentSchema, "judgment") },
    });

    const judgment = response.output_parsed;
    if (!judgment) return null;
    return { index: judgment.bestCandidateIndex, reason: judgment.reason };
  } catch {
    return null;
  }
}
