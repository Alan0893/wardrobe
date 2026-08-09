import { NextRequest, NextResponse } from "next/server";
import { generateFit } from "@/lib/fit";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const season = body.season || undefined;

  const items = await generateFit(session.user.id, season);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Not enough items in wardrobe to generate a fit" },
      { status: 400 }
    );
  }

  return NextResponse.json({ items });
}
