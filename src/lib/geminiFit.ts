import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "./prisma";

export interface AiFitResult {
  items: {
    id: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    colorImageUrl: string | null;
    category: string;
    color: string | null;
    season: string;
  }[];
  rationale: string;
}

function getGemini() {
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
}

const SYSTEM_PROMPT = `You are a personal fashion stylist. The user will give their wardrobe as a numbered list with item IDs.

Build ONE complete outfit using ONLY items from that list.

Rules:
- Prefer a coherent everyday look with good color harmony.
- Typical structure: base TOP + BOTTOM + SHOES, optionally MIDLAYER and/or OUTERWEAR, optionally ACCESSORY.
- Do not stack two base tops. A MIDLAYER (sweater/hoodie) can go over a TOP.
- OUTERWEAR is jackets/coats — use when it makes sense for season/style.
- Avoid clashing loud colors unless the wardrobe is clearly streetwear.
- Respect season hints when provided (prefer matching season or ALL_SEASON).
- Use each item at most once.
- Only return IDs that appear in the inventory.

Return ONLY valid JSON:
{
  "itemIds": ["id1", "id2", "..."],
  "rationale": "1-2 sentences explaining why this outfit works, referencing colors/pieces."
}`;

export async function generateFitWithGemini(
  userId: string,
  season?: string
): Promise<AiFitResult | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const items = await prisma.item.findMany({ where: { userId } });
  if (items.length < 3) return null;

  const byId = new Map(items.map((item) => [item.id, item]));

  const wardrobeSummary = items
    .map(
      (item, i) =>
        `${i + 1}. id=${item.id} | ${item.name} | Category: ${item.category} | Color: ${item.color || "unknown"} | Season: ${item.season} | Brand: ${item.brand || "unknown"}`
    )
    .join("\n");

  const seasonHint = season
    ? `Target season: ${season}. Prefer items for that season when possible.`
    : "No specific season — pick a versatile everyday outfit.";

  const model = getGemini().getGenerativeModel({
    model: "gemini-flash-lite-latest",
    generationConfig: {
      temperature: 0.85,
      responseMimeType: "application/json",
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `${seasonHint}\n\nWardrobe (${items.length} items):\n\n${wardrobeSummary}\n\nCreate one outfit now.`
  );

  const content = result.response.text();
  if (!content) return null;

  let parsed: { itemIds?: unknown; rationale?: unknown };
  try {
    parsed = JSON.parse(content);
  } catch {
    return null;
  }

  const rawIds = Array.isArray(parsed.itemIds) ? parsed.itemIds : [];
  const ids = rawIds
    .filter((id): id is string => typeof id === "string")
    .filter((id, index, arr) => byId.has(id) && arr.indexOf(id) === index);

  if (ids.length < 2) return null;

  // Keep a sensible outfit order: top → mid → outer → bottom → shoes → accessory
  const order = ["TOP", "MIDLAYER", "OUTERWEAR", "BOTTOM", "SHOES", "ACCESSORY"];
  const selected = ids
    .map((id) => byId.get(id)!)
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));

  return {
    items: selected.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      imageUrl: item.imageUrl,
      colorImageUrl: item.colorImageUrl,
      category: item.category,
      color: item.color,
      season: item.season,
    })),
    rationale:
      typeof parsed.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : "AI-styled outfit from your wardrobe.",
  };
}
