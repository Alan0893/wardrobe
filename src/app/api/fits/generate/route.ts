import { NextRequest, NextResponse } from "next/server";
import { generateFit } from "@/lib/fit";
import { generateFitWithGemini } from "@/lib/geminiFit";
import { auth } from "@/auth";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const season = body.season || undefined;
  const mode = body.mode === "ai" ? "ai" : "rules";
  const userId = session.user.id;

  if (mode === "ai") {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI fits are not configured. Set GEMINI_API_KEY." },
        { status: 503 }
      );
    }

    try {
      const aiFit = await generateFitWithGemini(userId, season);
      if (!aiFit || aiFit.items.length === 0) {
        return NextResponse.json(
          { error: "Not enough items in wardrobe to generate an AI fit" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        items: aiFit.items,
        rationale: aiFit.rationale,
        mode: "ai",
      });
    } catch (err) {
      console.error("AI fit error:", err instanceof Error ? err.message : err);
      return NextResponse.json(
        { error: "AI fit generation failed. Please try again." },
        { status: 500 }
      );
    }
  }

  const items = await generateFit(userId, season);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Not enough items in wardrobe to generate a fit" },
      { status: 400 }
    );
  }

  return NextResponse.json({ items, mode: "rules" });
}
