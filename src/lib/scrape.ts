import * as cheerio from "cheerio";

export interface ScrapedProduct {
  name: string;
  brand: string;
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
    "jacket", "coat", "parka", "blazer", "windbreaker", "anorak", "bomber",
    "overcoat", "trench", "raincoat", "puffer", "down jacket", "denim jacket",
    "shacket", "overshirt",
  ],
  MIDLAYER: [
    "sweater", "hoodie", "cardigan", "pullover", "fleece", "knit",
    "crewneck", "crew neck", "sweatshirt", "turtleneck", "vest", "knitwear",
  ],
  BOTTOM: [
    "pant", "jean", "short", "skirt", "trouser", "legging", "jogger",
    "chino", "cargo", "sweatpant", "culottes", "wide leg", "slim fit pant",
    "straight leg", "tapered", "bermuda", "denim",
  ],
  TOP: [
    "shirt", "tee", "t-shirt", "blouse", "polo", "tank", "camisole",
    "henley", "button-down", "oxford shirt", "v-neck", "long sleeve",
    "short sleeve", "dress shirt", "flannel shirt", "top",
  ],
  ACCESSORY: [
    "hat", "bag", "belt", "scarf", "watch", "jewelry", "sunglasses",
    "wallet", "necklace", "bracelet", "ring", "earring", "cap", "beanie",
    "glove", "sock", "tie", "tote", "backpack", "crossbody", "clutch",
  ],
};

const CATEGORY_PATH_SIGNALS: Record<string, string[]> = {
  SHOES: ["shoes", "footwear", "sneakers", "boots", "sandals"],
  OUTERWEAR: ["outerwear", "jackets", "coats"],
  MIDLAYER: ["sweaters", "hoodies", "knitwear", "fleece"],
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

function cleanColorLabel(text: string): string {
  let t = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^colou?r\s*[:#-]\s*/i, "")
    .replace(/^shown\s*[:#-]\s*/i, "")
    .replace(/^colorway\s*[:#-]\s*/i, "")
    .replace(/^\d{1,3}\s+/, "")
    // Size / gender chrome that often trails Uniqlo-style labels
    .replace(/\s+(?:men|women|unisex|kids)\b.*$/i, "")
    .replace(/\s+(?:xxs|xs|s|m|l|xl|xxl|3xl)\b.*$/i, "")
    .replace(/\s*(?:style|size|qty|quantity|view product|select a?)\b.*$/i, "")
    .trim();

  if (!t || t.length > 80) return "";
  if (
    /^(select|choose|available|shop by|color)$/i.test(t) ||
    /click|cookie|privacy|page \d|add to|wishlist|shipping|sign in/i.test(t) ||
    (/t-shirt|hoodie|jacket|pants|shoes|default image/i.test(t) && t.length > 25)
  ) {
    return "";
  }

  // Keep colorway slashes (Nike: "Black/White/Clover")
  return t
    .split("/")
    .map((seg) =>
      seg
        .trim()
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    )
    .filter(Boolean)
    .join("/");
}

function looksLikeColorCode(value: string): boolean {
  if (!value) return false;
  if (/^(black|white|navy|blue|red|green|grey|gray|pink|olive|cream|beige|brown)$/i.test(value)) {
    return false;
  }
  return /^[A-Z0-9]{1,8}$/i.test(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function labelFromElement($: cheerio.CheerioAPI, el: any): string {
  const node = $(el);
  const candidates = [
    node.attr("aria-label"),
    node.attr("title"),
    node.attr("data-displayname"),
    node.attr("data-display-name"),
    node.attr("data-color-name"),
    node.attr("data-name"),
    node.attr("data-value-name"),
    node.find("img").first().attr("alt"),
    node.find("img").first().attr("title"),
    node.attr("alt"),
    node.text(),
  ];
  for (const raw of candidates) {
    const cleaned = cleanColorLabel(raw || "");
    if (cleaned) return cleaned;
  }
  return "";
}

function extractColorFromEmbeddedJson(html: string, colorCode: string | null): string {
  const patterns = [
    /"colorDescription"\s*:\s*"([^"]{2,80})"/gi,
    /"selectedColorDescription"\s*:\s*"([^"]{2,80})"/gi,
    /"currentColor(?:Description)?"\s*:\s*"([^"]{2,80})"/gi,
    /"colorName"\s*:\s*"([^"]{2,80})"/gi,
    /"displayColor(?:Name)?"\s*:\s*"([^"]{2,80})"/gi,
    /"selectedColor(?:Name)?"\s*:\s*"([^"]{2,80})"/gi,
    /"colorway"\s*:\s*"([^"]{2,80})"/gi,
  ];

  for (const re of patterns) {
    const hits = [...html.matchAll(re)]
      .map((m) => cleanColorLabel(m[1]))
      .filter(Boolean)
      .filter((v) => !/#[0-9a-f]{3,8}|rgb\(|var\(--/i.test(v));
    if (!hits.length) continue;

    // If we have a color code, prefer a nearby hit — otherwise first plausible one
    if (colorCode) {
      const codeRe = new RegExp(
        `${colorCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]{0,180}"(?:colorDescription|colorName|colorway)"\\s*:\\s*"([^"]+)"|"([^"]+)"\\s*[\\s\\S]{0,180}${colorCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "i"
      );
      const near = html.match(codeRe);
      if (near) {
        const cleaned = cleanColorLabel(near[1] || near[2] || "");
        if (cleaned) return cleaned;
      }
    }

    // Prefer the first hit that contains a known color word
    const withKnown = hits.find((h) => matchColorKeyword(h));
    if (withKnown) return withKnown;
    if (hits[0]) return hits[0];
  }

  return "";
}

function detectColor(
  $: cheerio.CheerioAPI,
  name: string,
  url: string,
  colorCode: string | null,
  html: string
): string {
  // 1. Selected swatch / option (aria state + selected/active classes)
  const selectedSelectors = [
    '[aria-checked="true"]',
    '[aria-pressed="true"]',
    '[aria-current="true"]',
    '[aria-selected="true"]',
    '[class*="swatch"][class*="selected"]',
    '[class*="swatch"][class*="active"]',
    '[class*="color"][class*="selected"]',
    '[class*="color"][class*="active"]',
    '[class*="Color"][class*="selected"]',
    '[data-testid*="color"][class*="selected"]',
    '[data-attr="color"] [class*="selected"]',
    '[data-attribute="color"] [class*="selected"]',
    '.swatch.selected',
    '.selected-swatch',
  ];
  for (const selector of selectedSelectors) {
    for (const el of $(selector).toArray().slice(0, 8)) {
      const label = labelFromElement($, el);
      if (label) return label;
    }
  }

  // 2. URL color code → matching swatch/option label/alt/src
  if (colorCode) {
    const codeLower = colorCode.toLowerCase();

    // Chip/swatch images whose filename embeds the code (works on Uniqlo and similar CDNs)
    const chipImgs = $(
      'img[src*="chip"], img[src*="swatch"], img[src*="color"], [class*="swatch"] img, [class*="color"] img'
    );
    for (const el of chipImgs.toArray()) {
      const src = ($(el).attr("src") || $(el).attr("data-src") || "").toLowerCase();
      if (
        src.includes(`_${codeLower}_`) ||
        src.includes(`_${codeLower}.`) ||
        src.includes(`goods_${codeLower}_`) ||
        src.includes(`/${codeLower}/`) ||
        src.includes(`-${codeLower}.`) ||
        src.includes(`color=${codeLower}`)
      ) {
        const label = cleanColorLabel($(el).attr("alt") || $(el).attr("title") || "");
        if (label) return label;
      }
    }

    const candidates = $(
      "button, a, input, li, div, span, img, [role='option'], [role='radio'], [role='button']"
    ).toArray();

    for (const el of candidates) {
      const node = $(el);
      const attrs = [
        node.attr("data-value"),
        node.attr("data-color"),
        node.attr("data-attr-value"),
        node.attr("data-id"),
        node.attr("value"),
        node.attr("href"),
        node.attr("src"),
        node.attr("data-src"),
        node.attr("id"),
        node.attr("class"),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesCode =
        attrs === codeLower ||
        attrs.includes(`=${codeLower}`) ||
        attrs.includes(`_${codeLower}_`) ||
        attrs.includes(`_${codeLower}.`) ||
        attrs.includes(`-${codeLower}.`) ||
        attrs.includes(`/${codeLower}/`) ||
        attrs.includes(`color=${codeLower}`) ||
        attrs.includes(`colordisplaycode=${codeLower}`) ||
        attrs.includes(`goods_${codeLower}_`);

      if (!matchesCode) continue;
      const label = labelFromElement($, el);
      if (label && !looksLikeColorCode(label.replace(/\s/g, ""))) return label;
    }
  }

  // 3. Explicit color-name nodes
  for (const selector of [
    '[class*="selectedColor"]',
    '[class*="color-name"]',
    '[class*="colorName"]',
    '[data-testid*="selected-color"]',
    '[data-testid*="color-name"]',
    '#selected-color-value',
    '[class*="product-color"]',
  ]) {
    const el = $(selector).get(0);
    if (!el) continue;
    const label = labelFromElement($, el);
    if (label) return label;
  }

  // 4. Visible labels: "Shown:", "Color:", "Colour:", "Colorway:"
  const bodyText = $("body").text().replace(/\s+/g, " ");
  const visiblePatterns = [
    /Shown\s*[:]\s*([A-Za-z][A-Za-z0-9\s\/,-]{1,70}?)(?:\s*Style\s*:|\s*Size\s*:|$)/i,
    /Colou?rway\s*[:]\s*([A-Za-z][A-Za-z0-9\s\/,-]{1,70}?)(?:\s*Style\s*:|\s*Size\s*:|$)/i,
    /Colou?r\s*[:]\s*(?:\d{1,3}\s+)?([A-Za-z][A-Za-z\s\/-]{1,40}?)(?:\s*(?:Style|Size|Qty|Select|Add|Men|Women|Unisex|\||•)|\s*$)/i,
  ];
  for (const re of visiblePatterns) {
    const m = bodyText.match(re);
    if (m) {
      const cleaned = cleanColorLabel(m[1]);
      if (cleaned) return cleaned;
    }
  }

  // 5. Embedded product JSON (Nike colorDescription, generic colorName, etc.)
  const fromJson = extractColorFromEmbeddedJson(html, colorCode);
  if (fromJson) return fromJson;

  // 6. JSON-LD / microdata / meta
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
          const cleaned = cleanColorLabel(item.color);
          if (cleaned) return cleaned;
        }
      }
    } catch { /* skip */ }
  }

  const metaColor =
    $('meta[property="product:color"]').attr("content") ||
    $('[itemprop="color"]').attr("content") ||
    $('[itemprop="color"]').text().trim();
  if (metaColor) {
    const cleaned = cleanColorLabel(metaColor);
    if (cleaned) return cleaned;
  }

  // 7. URL param that is already a human color name (not a SKU code)
  try {
    const u = new URL(url);
    for (const [key, value] of u.searchParams) {
      if (!/color/i.test(key) || !value) continue;
      if (looksLikeColorCode(value)) continue;
      const cleaned = cleanColorLabel(value.replace(/[-_]/g, " "));
      if (cleaned) return cleaned;
    }
  } catch { /* skip */ }

  // 8. Keyword fallback from title/description
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
    const direct =
      u.searchParams.get("colorDisplayCode") ||
      u.searchParams.get("colorId") ||
      u.searchParams.get("dwvar_color") ||
      u.searchParams.get("color");
    if (direct) return direct;

    for (const [key, value] of u.searchParams) {
      if (/^dwvar_.*_color$/i.test(key) && value) return value;
      if (/color/i.test(key) && value && looksLikeColorCode(value)) return value;
    }
    return null;
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
    return { name: "", brand: "", imageUrl: "", colorImageUrl: "", category: "TOP", color: "", season: "ALL_SEASON" };
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

  const category = detectCategory($, name, url);
  const color = detectColor($, name, url, colorCode, html);

  const descriptionText =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    $('[itemprop="description"]').text().slice(0, 500) ||
    "";
  const season = detectSeason(`${name} ${descriptionText}`, category);

  return { name, brand, imageUrl, colorImageUrl, category, color, season };
}
