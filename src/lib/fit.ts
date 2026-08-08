import { prisma } from "./prisma";

interface FitItem {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  category: string;
  season: string;
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

  const top = pickRandom(filterBySeason(byCategory["TOP"] || []));
  if (top) fit.push(top);

  const bottom = pickRandom(filterBySeason(byCategory["BOTTOM"] || []));
  if (bottom) fit.push(bottom);

  const shoes = pickRandom(filterBySeason(byCategory["SHOES"] || []));
  if (shoes) fit.push(shoes);

  if (byCategory["OUTERWEAR"]?.length && Math.random() > 0.5) {
    const outerwear = pickRandom(filterBySeason(byCategory["OUTERWEAR"]!));
    if (outerwear) fit.push(outerwear);
  }

  if (byCategory["ACCESSORY"]?.length && Math.random() > 0.5) {
    const accessory = pickRandom(filterBySeason(byCategory["ACCESSORY"]!));
    if (accessory) fit.push(accessory);
  }

  return fit;
}
