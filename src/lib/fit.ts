import { prisma } from "./prisma";

interface FitItem {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  colorImageUrl: string | null;
  category: string;
  season: string;
}

// Outerwear items that function as mid-layers (worn over a shirt, under a coat)
const MID_LAYER_KEYWORDS = [
  "sweater", "cardigan", "pullover", "hoodie", "crewneck", "sweatshirt",
  "fleece", "knit", "turtleneck", "vest",
];

// Outerwear items that are true outer layers
const OUTER_LAYER_KEYWORDS = [
  "jacket", "coat", "parka", "blazer", "bomber", "windbreaker",
  "trench", "overcoat", "puffer", "anorak", "raincoat", "denim jacket",
  "shacket", "overshirt",
];

function isMidLayer(name: string): boolean {
  const lower = name.toLowerCase();
  return MID_LAYER_KEYWORDS.some((kw) => lower.includes(kw));
}

function isOuterLayer(name: string): boolean {
  const lower = name.toLowerCase();
  return OUTER_LAYER_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function generateFit(season?: string): Promise<FitItem[]> {
  const items = await prisma.item.findMany();
  if (items.length === 0) return [];

  const byCategory: Record<string, typeof items> = {};
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  function pickRandom<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function filterBySeason<T extends { season: string }>(arr: T[]): T[] {
    if (!season) return arr;
    const filtered = arr.filter(
      (i) => i.season === season || i.season === "ALL_SEASON"
    );
    return filtered.length > 0 ? filtered : arr;
  }

  const fit: FitItem[] = [];
  const usedIds = new Set<string>();

  // 1. Base layer: always pick a top (shirt, tee, etc.)
  const tops = filterBySeason(byCategory["TOP"] || []);
  const top = pickRandom(tops);
  if (top) {
    fit.push(top);
    usedIds.add(top.id);
  }

  // 2. Mid-layer: optionally add a sweater/cardigan/hoodie over the shirt
  const outerwearPool = filterBySeason(byCategory["OUTERWEAR"] || []);
  const midLayers = outerwearPool.filter((i) => isMidLayer(i.name));
  const outerLayers = outerwearPool.filter((i) => isOuterLayer(i.name));
  // Items that don't clearly match either get put in both pools
  const ambiguous = outerwearPool.filter((i) => !isMidLayer(i.name) && !isOuterLayer(i.name));

  const midPool = [...midLayers, ...ambiguous];
  const outerPool = [...outerLayers, ...ambiguous];

  if (midPool.length > 0 && Math.random() > 0.4) {
    const mid = pickRandom(midPool);
    if (mid) {
      fit.push(mid);
      usedIds.add(mid.id);
    }
  }

  // 3. Outer layer: optionally add a jacket/coat on top of everything
  const availableOuter = outerPool.filter((i) => !usedIds.has(i.id));
  if (availableOuter.length > 0 && Math.random() > 0.5) {
    const outer = pickRandom(availableOuter);
    if (outer) {
      fit.push(outer);
      usedIds.add(outer.id);
    }
  }

  // 4. Bottom: always pick pants/jeans/shorts/skirt
  const bottoms = filterBySeason(byCategory["BOTTOM"] || []);
  const bottom = pickRandom(bottoms);
  if (bottom) {
    fit.push(bottom);
    usedIds.add(bottom.id);
  }

  // 5. Shoes: always pick footwear
  const shoes = filterBySeason(byCategory["SHOES"] || []);
  const shoe = pickRandom(shoes);
  if (shoe) {
    fit.push(shoe);
    usedIds.add(shoe.id);
  }

  // 6. Accessory: optionally add one
  const accessories = filterBySeason(byCategory["ACCESSORY"] || []);
  if (accessories.length > 0 && Math.random() > 0.5) {
    const acc = pickRandom(accessories);
    if (acc) fit.push(acc);
  }

  return fit;
}
