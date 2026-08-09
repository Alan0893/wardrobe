import { prisma } from "./prisma";

interface FitItem {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  colorImageUrl: string | null;
  category: string;
  color: string | null;
  season: string;
}

// --- Color Harmony ---

// Map color names to HSL hue values for harmony calculations
const COLOR_HUES: Record<string, number> = {
  red: 0, crimson: 348, coral: 16, salmon: 6,
  orange: 30, "burnt orange": 20, rust: 15, terracotta: 16, peach: 28,
  yellow: 55, mustard: 45, gold: 50,
  green: 120, olive: 80, sage: 100, mint: 150, forest: 140, emerald: 145, teal: 175, "army green": 85, "khaki green": 80,
  blue: 220, navy: 220, "navy blue": 220, "dark blue": 230, "light blue": 200, "royal blue": 225, "sky blue": 197, indigo: 260, denim: 215,
  purple: 270, violet: 280, lavender: 270, lilac: 285, plum: 300, mauve: 310,
  pink: 330, "light pink": 350, "hot pink": 330, blush: 345, rose: 340, "dusty pink": 350,
  brown: 30, "dark brown": 20, "light brown": 25, tan: 35, camel: 35, chocolate: 25, mocha: 30, espresso: 20,
  burgundy: 345, maroon: 345, wine: 340,
};

// Neutrals don't have a strong hue — they pair with everything
const NEUTRALS = new Set([
  "black", "white", "off-white", "off white", "grey", "gray",
  "dark grey", "dark gray", "light grey", "light gray", "charcoal", "slate",
  "heather gray", "heather grey", "cream", "ivory", "beige", "oatmeal",
  "khaki", "taupe", "sand", "natural", "ecru", "bone", "silver",
]);

function isNeutral(color: string | null): boolean {
  if (!color) return true;
  return NEUTRALS.has(color.toLowerCase().trim());
}

function getHue(color: string | null): number | null {
  if (!color) return null;
  const lower = color.toLowerCase().trim();
  if (NEUTRALS.has(lower)) return null;
  for (const [name, hue] of Object.entries(COLOR_HUES)) {
    if (lower.includes(name) || name.includes(lower)) return hue;
  }
  return null;
}

function hueDifference(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2);
  return Math.min(diff, 360 - diff);
}

/**
 * Score how well two colors work together (0-1, higher is better).
 * Based on color theory:
 * - Neutrals go with everything (1.0)
 * - Monochromatic/analogous (similar hues, <30°): 0.9
 * - Complementary (opposite, ~180°): 0.8
 * - Triadic (120° apart): 0.7
 * - Split-complementary (150-170°): 0.75
 * - Clashing (40-80° apart, awkward zone): 0.2
 */
function colorCompatibility(c1: string | null, c2: string | null): number {
  if (isNeutral(c1) || isNeutral(c2)) return 1.0;

  const h1 = getHue(c1);
  const h2 = getHue(c2);
  if (h1 === null || h2 === null) return 0.7; // unknown colors get a neutral score

  const diff = hueDifference(h1, h2);

  if (diff <= 30) return 0.9;       // analogous/monochromatic
  if (diff >= 150 && diff <= 180) return 0.8; // complementary
  if (diff >= 110 && diff <= 130) return 0.7; // triadic
  if (diff >= 130 && diff <= 150) return 0.75; // split-complementary
  if (diff >= 30 && diff <= 80) return 0.3;  // clashing zone
  return 0.5; // everything else
}

/**
 * Score overall outfit color harmony. Average pairwise compatibility
 * between all items that have a color.
 */
function outfitColorScore(items: FitItem[]): number {
  const colored = items.filter((i) => i.color);
  if (colored.length <= 1) return 0.7;

  let totalScore = 0;
  let pairs = 0;

  for (let i = 0; i < colored.length; i++) {
    for (let j = i + 1; j < colored.length; j++) {
      totalScore += colorCompatibility(colored[i].color, colored[j].color);
      pairs++;
    }
  }

  return pairs > 0 ? totalScore / pairs : 0.7;
}

// --- Outfit Style Rules ---

// Bonus for having a mostly neutral outfit with one pop of color
function popOfColorBonus(items: FitItem[]): number {
  const neutralCount = items.filter((i) => isNeutral(i.color)).length;
  const colorCount = items.filter((i) => !isNeutral(i.color) && i.color).length;

  if (neutralCount >= 2 && colorCount === 1) return 0.15; // neutral base + one statement piece
  if (neutralCount >= 3 && colorCount === 0) return 0.1;  // all-neutral is safe and clean
  return 0;
}

// Penalty for too many competing colors
function colorOverloadPenalty(items: FitItem[]): number {
  const distinctHues = new Set<number>();
  for (const item of items) {
    const hue = getHue(item.color);
    if (hue !== null) {
      // Bucket hues into 60° segments
      distinctHues.add(Math.floor(hue / 60));
    }
  }
  if (distinctHues.size >= 4) return -0.2;
  if (distinctHues.size >= 3) return -0.1;
  return 0;
}

// --- Layer Logic ---

const MID_LAYER_KEYWORDS = [
  "sweater", "cardigan", "pullover", "hoodie", "crewneck", "sweatshirt",
  "fleece", "knit", "turtleneck", "vest",
];

const OUTER_LAYER_KEYWORDS = [
  "jacket", "coat", "parka", "blazer", "bomber", "windbreaker",
  "trench", "overcoat", "puffer", "anorak", "raincoat", "denim jacket",
  "shacket", "overshirt",
];

// Tops that are worn as the visible outer layer — no layering on top
const STANDALONE_TOP_KEYWORDS = [
  "seersucker", "camp collar", "hawaiian", "aloha", "cuban collar",
  "bowling shirt", "resort", "linen shirt", "open collar",
  "short sleeve shirt", "short sleeve button", "guayabera",
  "printed shirt", "patterned shirt", "silk shirt",
];

function isMidLayer(name: string): boolean {
  const lower = name.toLowerCase();
  return MID_LAYER_KEYWORDS.some((kw) => lower.includes(kw));
}

function isOuterLayer(name: string): boolean {
  const lower = name.toLowerCase();
  return OUTER_LAYER_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Whether a top is a standalone piece meant to be the outermost visible layer.
 * These shouldn't be covered by sweaters or jackets.
 */
function isStandaloneTop(item: FitItem): boolean {
  const lower = item.name.toLowerCase();
  // Keyword match
  if (STANDALONE_TOP_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  // Short sleeve shirts in summer are standalone
  if (item.season === "SUMMER" && lower.includes("short sleeve")) return true;
  return false;
}

// --- Generator ---

export async function generateFit(userId: string, season?: string): Promise<FitItem[]> {
  const items = await prisma.item.findMany({ where: { userId } });
  if (items.length === 0) return [];

  const byCategory: Record<string, typeof items> = {};
  for (const item of items) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  function filterBySeason<T extends { season: string }>(arr: T[]): T[] {
    if (!season) return arr;
    const filtered = arr.filter(
      (i) => i.season === season || i.season === "ALL_SEASON"
    );
    return filtered.length > 0 ? filtered : arr;
  }

  function pickRandom<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Generate multiple candidate outfits and pick the best-scoring one
  const NUM_CANDIDATES = 15;
  let bestFit: FitItem[] = [];
  let bestScore = -1;

  for (let attempt = 0; attempt < NUM_CANDIDATES; attempt++) {
    const candidate: FitItem[] = [];
    const usedIds = new Set<string>();

    // Base top
    const tops = filterBySeason(byCategory["TOP"] || []);
    const top = pickRandom(tops);
    if (top) {
      candidate.push(top);
      usedIds.add(top.id);
    }

    // Only add layers if the top isn't a standalone piece
    const standalone = top ? isStandaloneTop(top) : false;

    if (!standalone) {
      // Mid-layer (sweater/cardigan)
      const outerwearPool = filterBySeason(byCategory["OUTERWEAR"] || []);
      const midLayers = outerwearPool.filter((i) => isMidLayer(i.name));
      const outerLayers = outerwearPool.filter((i) => isOuterLayer(i.name));
      const ambiguous = outerwearPool.filter((i) => !isMidLayer(i.name) && !isOuterLayer(i.name));
      const midPool = [...midLayers, ...ambiguous];
      const outerPool = [...outerLayers, ...ambiguous];

      if (midPool.length > 0 && Math.random() > 0.4) {
        const mid = pickRandom(midPool);
        if (mid) {
          candidate.push(mid);
          usedIds.add(mid.id);
        }
      }

      // Outer layer (jacket/coat)
      const availableOuter = outerPool.filter((i) => !usedIds.has(i.id));
      if (availableOuter.length > 0 && Math.random() > 0.5) {
        const outer = pickRandom(availableOuter);
        if (outer) {
          candidate.push(outer);
          usedIds.add(outer.id);
        }
      }
    }

    // Bottom
    const bottoms = filterBySeason(byCategory["BOTTOM"] || []);
    const bottom = pickRandom(bottoms);
    if (bottom) {
      candidate.push(bottom);
      usedIds.add(bottom.id);
    }

    // Shoes
    const shoes = filterBySeason(byCategory["SHOES"] || []);
    const shoe = pickRandom(shoes);
    if (shoe) {
      candidate.push(shoe);
      usedIds.add(shoe.id);
    }

    // Accessory
    const accessories = filterBySeason(byCategory["ACCESSORY"] || []);
    if (accessories.length > 0 && Math.random() > 0.5) {
      const acc = pickRandom(accessories);
      if (acc) candidate.push(acc);
    }

    // Score this candidate
    const colorScore = outfitColorScore(candidate);
    const popBonus = popOfColorBonus(candidate);
    const overloadPenalty = colorOverloadPenalty(candidate);
    const totalScore = colorScore + popBonus + overloadPenalty;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestFit = candidate;
    }
  }

  return bestFit;
}
