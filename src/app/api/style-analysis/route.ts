import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
}

const SYSTEM_PROMPT = `You are a personal fashion stylist AI. The user will provide their wardrobe inventory. Analyze it and return a JSON object with this exact structure:

{
  "styleProfile": {
    "aesthetic": "A 2-3 word label for their overall style (e.g. 'Minimalist Casual', 'Smart Workwear', 'Streetwear Essentials')",
    "description": "A 2-3 sentence description of their style identity based on what they own."
  },
  "categoryBalance": {
    "breakdown": { "TOP": 0, "BOTTOM": 0, "SHOES": 0, "OUTERWEAR": 0, "ACCESSORY": 0 },
    "assessment": "A sentence about whether the wardrobe is balanced or skewed.",
    "suggestion": "What category they should focus on next."
  },
  "colorAnalysis": {
    "dominantColors": ["list", "of", "top", "3-4", "colors"],
    "missingColors": ["versatile colors they lack"],
    "assessment": "A sentence about their color palette — whether it's cohesive, too monochrome, or chaotic."
  },
  "gaps": [
    {
      "item": "Specific item suggestion (e.g. 'White leather sneakers')",
      "reason": "Why this would improve their wardrobe (e.g. 'Pairs with 80% of your bottoms and adds a clean anchor')"
    }
  ],
  "seasonalCoverage": {
    "strong": ["seasons well covered"],
    "weak": ["seasons underrepresented"],
    "suggestion": "What to add for the weak season(s)."
  }
}

Return ONLY valid JSON. No markdown, no explanation outside the JSON. Provide 3-5 gap recommendations. Be specific and practical — reference actual items in their wardrobe when explaining pairings.`;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.item.findMany({
    where: { userId: session.user.id },
    select: { name: true, category: true, color: true, season: true, brand: true },
  });

  if (items.length < 3) {
    return NextResponse.json(
      { error: "Add at least 3 items to your wardrobe before analyzing your style." },
      { status: 400 }
    );
  }

  const wardrobeSummary = items
    .map((item, i) => `${i + 1}. ${item.name} | Category: ${item.category} | Color: ${item.color || "unknown"} | Season: ${item.season} | Brand: ${item.brand || "unknown"}`)
    .join("\n");

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Here is my wardrobe (${items.length} items):\n\n${wardrobeSummary}` },
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
  }

  try {
    const analysis = JSON.parse(content);
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
