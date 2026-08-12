import { NextRequest, NextResponse } from "next/server";
import { scrapeProduct } from "@/lib/scrape";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const data = await scrapeProduct(url);
    if (!data.name && !data.imageUrl) {
      return NextResponse.json(
        {
          error:
            "Could not read this product page (site may be blocking scrapers). Try again or fill details manually.",
        },
        { status: 422 }
      );
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch product page" },
      { status: 500 }
    );
  }
}
