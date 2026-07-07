import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveMarketUrl } from "@/lib/resolve";
import { MarketResolutionError } from "@/lib/types";

const RequestSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please provide a valid URL." }, { status: 400 });
  }

  try {
    const { market, alternates } = await resolveMarketUrl(parsed.data.url);
    return NextResponse.json({ market, alternates });
  } catch (error) {
    if (error instanceof MarketResolutionError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Something went wrong resolving that link." }, { status: 500 });
  }
}
