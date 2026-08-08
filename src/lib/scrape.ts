import * as cheerio from "cheerio";

export interface ScrapedProduct {
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  category: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  SHOES: ["shoe", "sneaker", "boot", "sandal", "loafer", "heel", "slipper", "footwear"],
  OUTERWEAR: ["jacket", "coat", "hoodie", "parka", "blazer", "cardigan", "sweater", "vest"],
  BOTTOM: ["pant", "jean", "short", "skirt", "trouser", "legging", "jogger"],
  TOP: ["shirt", "tee", "blouse", "polo", "tank", "top", "camisole", "turtleneck"],
  ACCESSORY: ["hat", "bag", "belt", "scarf", "watch", "jewelry", "sunglasses", "wallet", "necklace", "bracelet", "ring", "earring"],
};

function guessCategory(title: string): string {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return cat;
  }
  return "TOP";
}

function resolveUrl(base: string, path: string): string {
  try {
    return new URL(path, base).href;
  } catch {
    return path;
  }
}

/**
 * Extract color code from URL for sites that encode variant in query params or path.
 * Uniqlo: ?colorDisplayCode=09 or /09 in path
 */
function extractColorCode(url: string): string | null {
  try {
    const u = new URL(url);
    return (
      u.searchParams.get("colorDisplayCode") ||
      u.searchParams.get("color") ||
      u.searchParams.get("colorId") ||
      u.searchParams.get("dwvar_color") ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Try to find a color-specific product image from structured data (JSON-LD)
 * or page markup. Many retailers embed per-variant images in JSON-LD or in
 * data attributes that the OG tag doesn't reflect.
 */
function extractVariantImage(
  $: cheerio.CheerioAPI,
  url: string,
  colorCode: string | null
): string | null {
  // 1. Parse JSON-LD for product structured data with variant images
  const jsonLdScripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < jsonLdScripts.length; i++) {
    try {
      const raw = $(jsonLdScripts[i]).html();
      if (!raw) continue;
      const data = JSON.parse(raw);
      const products = Array.isArray(data) ? data : data["@graph"] || [data];

      for (const item of products) {
        if (item["@type"] !== "Product" && item["@type"] !== "IndividualProduct") continue;

        // If there are offers with variant images matching color
        if (colorCode && item.offers) {
          const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
          for (const offer of offers) {
            if (offer.image && typeof offer.sku === "string" && offer.sku.includes(colorCode)) {
              return resolveUrl(url, Array.isArray(offer.image) ? offer.image[0] : offer.image);
            }
          }
        }

        // Check "image" array — some sites order variant images by color
        if (item.image) {
          const images = Array.isArray(item.image) ? item.image : [item.image];
          if (colorCode) {
            const match = images.find((img: string) =>
              typeof img === "string" && img.includes(colorCode)
            );
            if (match) return resolveUrl(url, match);
          }
        }
      }
    } catch {
      // malformed JSON-LD, skip
    }
  }

  // 2. Look for color-specific images in the page (common patterns)
  if (colorCode) {
    // Uniqlo-style: image URLs contain the color code (e.g., _09_ or /09/)
    const allImages = $("img[src]")
      .map((_, el) => $(el).attr("src"))
      .get() as string[];

    const match = allImages.find(
      (src) =>
        src.includes(`_${colorCode}`) ||
        src.includes(`/${colorCode}/`) ||
        src.includes(`-${colorCode}`)
    );
    if (match) return resolveUrl(url, match);

    // data-src or data-image attributes (lazy loaded images)
    const lazySrcs = $("[data-src], [data-image], [data-zoom-image]")
      .map((_, el) => $(el).attr("data-src") || $(el).attr("data-image") || $(el).attr("data-zoom-image"))
      .get() as string[];

    const lazyMatch = lazySrcs.find(
      (src) =>
        src &&
        (src.includes(`_${colorCode}`) ||
          src.includes(`/${colorCode}/`) ||
          src.includes(`-${colorCode}`))
    );
    if (lazyMatch) return resolveUrl(url, lazyMatch);
  }

  // 3. Fall back to first large product gallery image (not icons/logos)
  const galleryImg =
    $('[class*="product"] img[src*="large"], [class*="product"] img[src*="zoom"], [class*="gallery"] img').first().attr("src") ||
    $('[data-testid*="product-image"] img, [class*="pdp"] img').first().attr("src");

  if (galleryImg) return resolveUrl(url, galleryImg);

  return null;
}

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
    return { name: "", brand: "", price: "", imageUrl: "", category: "TOP" };
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

  // Try variant-specific image first, then fall back to OG image
  const variantImage = extractVariantImage($, url, colorCode);

  const imageUrl = variantImage
    ? variantImage
    : ogImage
      ? resolveUrl(url, ogImage)
      : resolveUrl(
        url,
        $('meta[itemprop="image"]').attr("content") ||
        $("img.product-image, img[data-testid*=product]").first().attr("src") ||
        ""
      );

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

  const category = guessCategory(name);

  return { name, brand, price, imageUrl, category };
}
