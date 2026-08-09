import * as cheerio from "cheerio";

export interface ScrapedProduct {
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  colorImageUrl: string;
  category: string;
  color: string;
  season: string;
}

// --- Category Detection ---

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  SHOES: [
    "shoe", "sneaker", "boot", "sandal", "loafer", "heel", "slipper",
    "footwear", "mule", "clog", "oxford", "derby", "trainer", "runner",
    "flip-flop", "slide", "espadrille", "pump", "flat", "ankle boot",
  ],
  OUTERWEAR: [
    "jacket", "coat", "hoodie", "parka", "blazer", "cardigan", "sweater",
    "vest", "pullover", "fleece", "windbreaker", "anorak", "bomber",
    "overcoat", "trench", "raincoat", "puffer", "down jacket", "denim jacket",
    "shacket", "overshirt",
  ],
  BOTTOM: [
    "pant", "jean", "short", "skirt", "trouser", "legging", "jogger",
    "chino", "cargo", "sweatpant", "culottes", "wide leg", "slim fit pant",
    "straight leg", "tapered", "bermuda", "denim",
  ],
  TOP: [
    "shirt", "tee", "t-shirt", "blouse", "polo", "tank", "camisole",
    "turtleneck", "henley", "crewneck", "button-down", "oxford shirt",
    "sweatshirt", "crew neck", "v-neck", "long sleeve", "short sleeve",
    "dress shirt", "flannel shirt", "top",
  ],
  ACCESSORY: [
    "hat", "bag", "belt", "scarf", "watch", "jewelry", "sunglasses",
    "wallet", "necklace", "bracelet", "ring", "earring", "cap", "beanie",
    "glove", "sock", "tie", "tote", "backpack", "crossbody", "clutch",
  ],
};

const CATEGORY_PATH_SIGNALS: Record<string, string[]> = {
  SHOES: ["shoes", "footwear", "sneakers", "boots", "sandals"],
  OUTERWEAR: ["outerwear", "jackets", "coats", "sweaters", "hoodies", "knitwear"],
  BOTTOM: ["bottoms", "pants", "jeans", "shorts", "skirts", "trousers"],
  TOP: ["tops", "shirts", "t-shirts", "tees", "blouses", "polos"],
  ACCESSORY: ["accessories", "bags", "hats", "jewelry", "belts", "watches", "socks"],
};

function guessCategoryFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return null;
}

function guessCategoryFromPath(segments: string[]): string | null {
  for (const segment of segments) {
    const lower = segment.toLowerCase();
    for (const [cat, signals] of Object.entries(CATEGORY_PATH_SIGNALS)) {
      if (signals.some((s) => lower === s || lower.includes(s))) return cat;
    }
  }
  return null;
}

function detectCategory($: cheerio.CheerioAPI, name: string, url: string): string {
  const breadcrumbs = $(
    '[class*="breadcrumb"] a, [class*="breadcrumb"] li, [data-testid*="breadcrumb"] a, nav[aria-label="breadcrumb"] a, .breadcrumb a, .breadcrumbs a, [itemtype*="BreadcrumbList"] [itemprop="name"]'
  )
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  if (breadcrumbs.length > 0) {
    const fromBreadcrumb = guessCategoryFromPath(breadcrumbs);
    if (fromBreadcrumb) return fromBreadcrumb;
  }

  try {
    const u = new URL(url);
    const pathSegments = u.pathname.split("/").filter(Boolean);
    const fromPath = guessCategoryFromPath(pathSegments);
    if (fromPath) return fromPath;
  } catch { /* skip */ }

  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const raw = $(jsonLdScripts[i]).html();
      if (!raw) continue;
      const data = JSON.parse(raw);
      const products = Array.isArray(data) ? data : data["@graph"] || [data];
      for (const item of products) {
        if (item["@type"] !== "Product" && item["@type"] !== "IndividualProduct") continue;
        const cat = item.category || item.productGroupID || "";
        if (cat) {
          const fromLD = guessCategoryFromPath([cat]);
          if (fromLD) return fromLD;
        }
      }
    } catch { /* skip */ }
  }

  return guessCategoryFromText(name) || "TOP";
}

// --- Color Detection ---

function detectColor($: cheerio.CheerioAPI, name: string, url: string): string {
  // 1. Selected/active color swatch text
  const swatchSelectors = [
    '[class*="color"] [class*="selected"]',
    '[class*="color"] [class*="active"]',
    '[class*="color"] [aria-checked="true"]',
    '[data-testid*="selected-color"]',
    '[class*="selectedColor"]',
    '[class*="color-name"]',
    '[class*="colorName"]',
    '[class*="product-color"] span',
    '#selected-color-value',
  ];

  for (const selector of swatchSelectors) {
    const text = $(selector).first().text().trim();
    if (text && text.length < 40) {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
  }

  // 2. JSON-LD color property
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const raw = $(jsonLdScripts[i]).html();
      if (!raw) continue;
      const data = JSON.parse(raw);
      const products = Array.isArray(data) ? data : data["@graph"] || [data];
      for (const item of products) {
        if (item["@type"] !== "Product" && item["@type"] !== "IndividualProduct") continue;
        if (item.color && typeof item.color === "string") {
          return item.color.charAt(0).toUpperCase() + item.color.slice(1).toLowerCase();
        }
      }
    } catch { /* skip */ }
  }

  // 3. Meta tags
  const metaColor =
    $('meta[property="product:color"]').attr("content") ||
    $('[itemprop="color"]').attr("content") ||
    $('[itemprop="color"]').text().trim();
  if (metaColor) return metaColor.charAt(0).toUpperCase() + metaColor.slice(1).toLowerCase();

  // 4. URL color params (if it's a name not a code)
  try {
    const u = new URL(url);
    const urlColor = u.searchParams.get("color") || u.searchParams.get("dwvar_color") || "";
    if (urlColor && urlColor.length > 2 && !/^\d+$/.test(urlColor)) {
      return urlColor.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
  } catch { /* skip */ }

  // 5. "Color: ___" pattern in body text
  const bodyText = $("body").text();
  const colorLabelMatch = bodyText.match(/colou?r\s*[:]\s*([A-Za-z][A-Za-z\s-]{1,25})/i);
  if (colorLabelMatch) {
    const candidate = colorLabelMatch[1].trim();
    if (candidate.length < 30) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
    }
  }

  // 6. Keyword match in title
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  return matchColorKeyword(`${name} ${ogDesc}`);
}

const COLORS_SORTED = [
  "off-white", "off white", "navy blue", "dark blue", "light blue", "royal blue", "sky blue",
  "dark red", "dark green", "army green", "khaki green", "dark grey", "dark gray",
  "light grey", "light gray", "heather gray", "heather grey", "dark brown", "light brown",
  "light pink", "hot pink", "dusty pink", "burnt orange",
  "black", "white", "navy", "blue", "red", "green", "grey", "gray",
  "brown", "tan", "beige", "cream", "khaki", "olive", "sage", "forest",
  "mint", "burgundy", "maroon", "wine", "plum",
  "pink", "blush", "rose", "mauve", "purple", "lavender", "violet", "lilac",
  "orange", "rust", "terracotta", "coral", "peach",
  "yellow", "mustard", "gold", "silver", "charcoal", "ivory", "oatmeal",
  "sand", "camel", "taupe", "teal", "indigo", "denim", "slate",
];

function matchColorKeyword(text: string): string {
  const lower = text.toLowerCase();
  for (const color of COLORS_SORTED) {
    const escaped = color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`);
    if (re.test(lower)) return color.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return "";
}

// --- Color Swatch Image ---

function extractColorSwatchImage(
  $: cheerio.CheerioAPI,
  url: string,
  colorCode: string | null
): string {
  // Look for small swatch/chip images that represent the color
  const swatchImgSelectors = [
    '[class*="color"] [class*="selected"] img',
    '[class*="color"] [class*="active"] img',
    '[class*="color"] [aria-checked="true"] img',
    '[class*="swatch"][class*="selected"] img',
    '[class*="chip"][class*="selected"] img',
    '[data-testid*="color-swatch"] img',
  ];

  for (const selector of swatchImgSelectors) {
    const src = $(selector).first().attr("src") || $(selector).first().attr("data-src");
    if (src) return resolveUrl(url, src);
  }

  // If we have a color code, find a small swatch image containing it
  if (colorCode) {
    const swatchImgs = $('[class*="color"] img, [class*="swatch"] img, [class*="chip"] img')
      .map((_, el) => $(el).attr("src") || $(el).attr("data-src"))
      .get()
      .filter(Boolean) as string[];

    const match = swatchImgs.find(
      (src) =>
        src.includes(`_${colorCode}`) ||
        src.includes(`/${colorCode}`) ||
        src.includes(`-${colorCode}`)
    );
    if (match) return resolveUrl(url, match);
  }

  return "";
}

// --- Season Detection ---

const SUMMER_SIGNALS = [
  "linen", "lightweight", "sleeveless", "tank", "short sleeve", "shorts",
  "sandal", "open-toe", "breathable", "seersucker", "swim", "tropical",
  "floral", "sundress", "crop", "mesh", "sheer", "rayon",
  "dry-ex", "airism", "quick-dry", "moisture-wicking", "uv protection",
];

const WINTER_SIGNALS = [
  "wool", "fleece", "down", "puffer", "thermal", "heavy", "lined",
  "cashmere", "sherpa", "insulated", "parka", "beanie", "glove",
  "turtleneck", "flannel", "corduroy", "knit", "chunky", "heattech",
  "merino", "quilted", "padded", "water-resistant", "windproof",
];

function detectSeason(text: string, category: string): string {
  const lower = text.toLowerCase();

  let summerScore = 0;
  let winterScore = 0;

  for (const signal of SUMMER_SIGNALS) {
    if (lower.includes(signal)) summerScore++;
  }
  for (const signal of WINTER_SIGNALS) {
    if (lower.includes(signal)) winterScore++;
  }

  if (category === "OUTERWEAR" && winterScore === 0) winterScore += 0.5;

  if (summerScore > winterScore && summerScore >= 1) return "SUMMER";
  if (winterScore > summerScore && winterScore >= 1) return "WINTER";
  return "ALL_SEASON";
}

// --- Variant Product Image (color-correct, not a swatch) ---

// URL patterns that indicate a swatch/chip, not a real product photo
const SWATCH_PATTERNS = [
  "chip", "swatch", "color", "colour", "thumbnail", "icon", "badge",
  "mini", "tiny", "/sw/", "/cs/",
];

// URL patterns that indicate a real product photo
const PRODUCT_IMG_PATTERNS = [
  "item", "product", "goods", "large", "main", "hero", "zoom",
  "detail", "pdp", "3x4", "4x5", "full", "1000", "800", "600",
];

function isSwatchUrl(src: string): boolean {
  const lower = src.toLowerCase();
  return SWATCH_PATTERNS.some((p) => lower.includes(p));
}

function isProductImageUrl(src: string): boolean {
  const lower = src.toLowerCase();
  return PRODUCT_IMG_PATTERNS.some((p) => lower.includes(p));
}

function findVariantProductImage(
  $: cheerio.CheerioAPI,
  url: string,
  colorCode: string | null
): string | null {
  if (!colorCode) return null;

  // 1. JSON-LD: look for product images containing the color code
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const raw = $(jsonLdScripts[i]).html();
      if (!raw) continue;
      const data = JSON.parse(raw);
      const products = Array.isArray(data) ? data : data["@graph"] || [data];

      for (const item of products) {
        if (item["@type"] !== "Product" && item["@type"] !== "IndividualProduct") continue;
        if (item.image) {
          const images = Array.isArray(item.image) ? item.image : [item.image];
          const match = images.find(
            (img: string) =>
              typeof img === "string" &&
              (img.includes(`_${colorCode}`) || img.includes(`/${colorCode}/`) || img.includes(`-${colorCode}`)) &&
              !isSwatchUrl(img)
          );
          if (match) return resolveUrl(url, match);
        }
      }
    } catch { /* skip */ }
  }

  // 2. All images on page: find ones with color code that look like product photos, not swatches
  const allSrcs: string[] = [];
  $("img[src], [data-src], source[srcset]").each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || "";
    if (src) allSrcs.push(src);
    const srcset = $(el).attr("srcset");
    if (srcset) {
      srcset.split(",").forEach((entry) => {
        const u = entry.trim().split(/\s+/)[0];
        if (u) allSrcs.push(u);
      });
    }
  });

  const candidates = allSrcs.filter(
    (src) =>
      (src.includes(`_${colorCode}`) || src.includes(`/${colorCode}/`) || src.includes(`-${colorCode}`)) &&
      !isSwatchUrl(src)
  );

  // Prefer URLs that look like product images
  const productMatch = candidates.find((src) => isProductImageUrl(src));
  if (productMatch) return resolveUrl(url, productMatch);

  // Fall back to any non-swatch match
  if (candidates.length > 0) return resolveUrl(url, candidates[0]);

  return null;
}

// --- Helpers ---

function resolveUrl(base: string, path: string): string {
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

function extractColorCode(url: string): string | null {
  try {
    const u = new URL(url);
    return (
      u.searchParams.get("colorDisplayCode") ||
      u.searchParams.get("colorId") ||
      null
    );
  } catch {
    return null;
  }
}

// --- Main ---

export async function scrapeProduct(url: string): Promise<ScrapedProduct> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    return { name: "", brand: "", price: "", imageUrl: "", colorImageUrl: "", category: "TOP", color: "", season: "ALL_SEASON" };
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const colorCode = extractColorCode(url);

  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const ogImage = $('meta[property="og:image"]').attr("content") || "";
  const ogSiteName = $('meta[property="og:site_name"]').attr("content") || "";

  const name =
    ogTitle ||
    $('meta[name="title"]').attr("content") ||
    $("title").text().trim() ||
    "";

  // Primary image: try to find the color-correct product photo first
  const variantProductImage = findVariantProductImage($, url, colorCode);

  const fallbackImage = ogImage
    ? resolveUrl(url, ogImage)
    : resolveUrl(
      url,
      $('meta[itemprop="image"]').attr("content") ||
      $('[class*="product"] img, [data-testid*="product-image"] img, [class*="pdp"] img, [class*="gallery"] img').first().attr("src") ||
      $("img.product-image, img[data-testid*=product]").first().attr("src") ||
      ""
    );

  const imageUrl = variantProductImage || fallbackImage;

  // Color swatch image: the small chip showing just the color
  const colorImageUrl = extractColorSwatchImage($, url, colorCode);

  const brand =
    ogSiteName ||
    $('meta[property="product:brand"]').attr("content") ||
    $('meta[name="author"]').attr("content") ||
    "";

  const price =
    $('meta[property="product:price:amount"]').attr("content") ||
    $('meta[property="og:price:amount"]').attr("content") ||
    $('[itemprop="price"]').attr("content") ||
    $('[data-testid*="price"]').first().text().trim() ||
    "";

  const category = detectCategory($, name, url);
  const color = detectColor($, name, url);

  const descriptionText =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    $('[itemprop="description"]').text().slice(0, 500) ||
    "";
  const season = detectSeason(`${name} ${descriptionText}`, category);

  return { name, brand, price, imageUrl, colorImageUrl, category, color, season };
}
