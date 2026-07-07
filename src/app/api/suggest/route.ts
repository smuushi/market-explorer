import { NextResponse } from "next/server";
import { z } from "zod";

import { findMatchesForMarket } from "@/lib/match";
import { MarketSchema } from "@/lib/types";

const RequestSchema = z.object({
  market: MarketSchema,
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid market." }, { status: 400 });
  }

  try {
    const candidates = await findMatchesForMarket(parsed.data.market);
    return NextResponse.json({ candidates });
  } catch {
    return NextResponse.json({ error: "Something went wrong finding a match." }, { status: 500 });
  }
}
