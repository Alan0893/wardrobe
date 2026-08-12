import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const color = searchParams.get("color");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (category) where.category = category;
  if (color) where.color = { contains: color, mode: "insensitive" };

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const item = await prisma.item.create({
    data: {
      name: body.name,
      brand: body.brand || null,
      imageUrl: body.imageUrl || null,
      colorImageUrl: body.colorImageUrl || null,
      productUrl: body.productUrl,
      category: body.category || "TOP",
      color: body.color || null,
      season: body.season || "ALL_SEASON",
      userId: session.user.id,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
