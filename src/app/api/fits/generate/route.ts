import { NextRequest, NextResponse } from "next/server";
import { generateFit } from "@/lib/fit";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const season = body.season || undefined;

  const items = await generateFit(season);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Not enough items in wardrobe to generate a fit" },
      { status: 400 }
    );
  }

  return NextResponse.json({ items });
}
