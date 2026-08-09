import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fits = await prisma.fit.findMany({
    where: { userId: session.user.id },
    include: { items: { include: { item: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(fits);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemIds } = await req.json();

  if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
    return NextResponse.json(
      { error: "itemIds array is required" },
      { status: 400 }
    );
  }

  const fit = await prisma.fit.create({
    data: {
      userId: session.user.id,
      items: {
        create: itemIds.map((itemId: string) => ({ itemId })),
      },
    },
    include: { items: { include: { item: true } } },
  });

  return NextResponse.json(fit, { status: 201 });
}
