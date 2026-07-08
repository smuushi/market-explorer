import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { Market } from "@/lib/types";

const MODEL = "gpt-5.4-mini";

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const JudgmentSchema = z.object({
  bestCandidateIndex: z
    .number()
    .int()
    .nullable()
    .describe(
      "Index of the candidate that asks about the same underlying real-world event as the source, or null if none do.",
    ),
  reason: z.string().describe("One short sentence explaining the decision."),
});

export interface AiMatchJudgment {
  index: number | null;
  reason: string;
}

/**
 * Ask a small model to judge which candidate (if any) is about the same underlying event
 * as the source market. Reserved for the "ambiguous" confidence band, where Jaccard token
 * overlap alone can't reliably tell a true cross-platform match from a same-topic-but-
 * different-question false positive (e.g. "will X drop out" vs "will X be endorsed" share
 * every proper noun but aren't the same bet). A different date/threshold on the same
 * underlying event is NOT grounds for rejection — the UI surfaces that gap separately —
 * but a different condition, action, or set of people/entities is. Returns null if no API
 * key is configured or the call fails, so callers can fall back to the heuristic ranking.
 */
export async function judgeBestMatch(
  source: Market,
  candidates: Market[],
): Promise<AiMatchJudgment | null> {
  if (!client || candidates.length === 0) return null;

  const candidateList = candidates
    .map(
      (candidate, index) =>
        `${index}. [${candidate.platform}] ${candidate.title} (closes ${candidate.closeDate ?? "unknown"})`,
    )
    .join("\n");

  try {
    const response = await client.responses.parse({
      model: MODEL,
      input: [
        {
          role: "system",
          content:
            "You compare prediction market titles across two platforms, Polymarket and Kalshi, to " +
            "find markets about the same underlying real-world event so a user can compare their odds. " +
            "Pick a candidate if it's asking about the same event and the same kind of outcome as the " +
            "source (same people/entities, same action or condition) — for example 'will X drop out by " +
            "date A' and 'will X drop out by date B' are the SAME underlying event even though the " +
            "specific date threshold differs, since the app separately shows users how far apart the " +
            "two dates are. Only reject a candidate for asking a genuinely different question: different " +
            "people/entities, a different condition or action (e.g. dropping out vs. being endorsed), or " +
            "an unrelated topic. If multiple candidates are about the same event at different thresholds, " +
            "pick the one whose date is closest to the source's. If none of the candidates are about the " +
            "same event, return null for bestCandidateIndex.",
        },
        {
          role: "user",
          content: `Source market:\n${source.title} (closes ${source.closeDate ?? "unknown"})\n\nCandidates:\n${candidateList}`,
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
