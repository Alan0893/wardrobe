import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const item = await prisma.item.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.brand !== undefined && { brand: body.brand }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.season !== undefined && { season: body.season }),
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
