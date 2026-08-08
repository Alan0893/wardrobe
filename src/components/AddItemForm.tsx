"use client";

import { useState } from "react";
import { ItemForm } from "./ItemForm";

interface ScrapedData {
  name: string;
  brand: string;
  price: string;
  imageUrl: string;
  category: string;
}

export function AddItemForm({ onAdded }: { onAdded?: () => void }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [scraped, setScraped] = useState<ScrapedData | null>(null);
  const [error, setError] = useState("");

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setScraped(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to scrape");
      }

      const data = await res.json();
      setScraped(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleSaved() {
    setScraped(null);
    setUrl("");
    onAdded?.();
  }

  return (
    <div>
      <form onSubmit={handleScrape} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a product URL..."
          className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 bg-white text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-5 py-2.5 bg-stone-800 text-white text-sm font-medium rounded-lg hover:bg-stone-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Fetching..." : "Add Item"}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {scraped && (
        <div className="mt-4 p-4 bg-white rounded-lg border border-stone-200 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">
            Confirm item details
          </h3>
          <ItemForm
            initial={{ ...scraped, productUrl: url.trim() }}
            onSaved={handleSaved}
            onCancel={() => setScraped(null)}
          />
        </div>
      )}
    </div>
  );
}
