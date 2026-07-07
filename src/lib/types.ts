import { z } from "zod";

export const PlatformSchema = z.enum(["polymarket", "kalshi"]);
export type Platform = z.infer<typeof PlatformSchema>;

export const MarketStatusSchema = z.enum(["open", "closed", "settled", "unknown"]);
export type MarketStatus = z.infer<typeof MarketStatusSchema>;

export const PricePointSchema = z.object({
  timestamp: z.number(),
  price: z.number(),
});
export type PricePoint = z.infer<typeof PricePointSchema>;

export const MarketSchema = z.object({
  platform: PlatformSchema,
  id: z.string(),
  title: z.string(),
  groupTitle: z.string().nullable(),
  sourceUrl: z.string(),
  yesProbability: z.number().min(0).max(1).nullable(),
  noProbability: z.number().min(0).max(1).nullable(),
  spread: z.number().nullable(),
  volume: z.number().nullable(),
  volume24hr: z.number().nullable(),
  liquidity: z.number().nullable(),
  liquidityLabel: z.string(),
  closeDate: z.string().nullable(),
  status: MarketStatusSchema,
  resolutionText: z.string().nullable(),
  priceHistory: z.array(PricePointSchema),
});
export type Market = z.infer<typeof MarketSchema>;

export const ResolveResponseSchema = z.object({
  market: MarketSchema,
  alternates: z.array(MarketSchema),
});
export type ResolveResponse = z.infer<typeof ResolveResponseSchema>;

export const SuggestResponseSchema = z.object({
  candidates: z.array(MarketSchema),
});
export type SuggestResponse = z.infer<typeof SuggestResponseSchema>;

export class MarketResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MarketResolutionError";
  }
}
