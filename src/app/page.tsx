"use client";

import { useEffect, useState, useCallback } from "react";
import { AddItemForm } from "@/components/AddItemForm";
import { ItemCard, ItemData } from "@/components/ItemCard";

type GenerateMode = "ai" | "rules";

export default function Dashboard() {
  const [items, setItems] = useState<ItemData[]>([]);
  const [fitItems, setFitItems] = useState<ItemData[] | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [lastMode, setLastMode] = useState<GenerateMode>("ai");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/items");
    const data = await res.json();
    setItems(data.slice(0, 8));
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleGenerate(mode: GenerateMode) {
    setGenerating(true);
    setError("");
    setLastMode(mode);
    try {
      const res = await fetch("/api/fits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not generate a fit");
        return;
      }
      setFitItems(data.items);
      setRationale(mode === "ai" ? data.rationale || null : null);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveFit() {
    if (!fitItems) return;
    await fetch("/api/fits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: fitItems.map((i) => i.id) }),
    });
    setFitItems(null);
    setRationale(null);
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-ink mb-1">
          Wardrobe
        </h1>
        <p className="text-stone-500 text-sm mb-5">
          Paste a product link to add it to your collection.
        </p>
        <AddItemForm onAdded={loadItems} />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-ink">
            Generate a Fit
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerate("rules")}
              disabled={generating}
              className="px-4 py-2.5 bg-white text-stone-700 text-sm font-medium rounded-lg border border-stone-200 hover:border-stone-300 disabled:opacity-50 transition-colors"
            >
              {generating && lastMode === "rules" ? "Generating..." : "Quick"}
            </button>
            <button
              onClick={() => handleGenerate("ai")}
              disabled={generating}
              className="px-5 py-2.5 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors"
            >
              {generating && lastMode === "ai" ? "Styling..." : "AI Fit"}
            </button>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {fitItems && fitItems.length > 0 && (
          <div className="p-4 bg-white rounded-lg border border-stone-200 shadow-sm">
            {rationale && (
              <p className="text-sm text-stone-500 mb-3 leading-relaxed">{rationale}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {fitItems.map((item) => (
                <div key={item.id} className="text-center">
                  <div className="aspect-square rounded-md overflow-hidden bg-stone-100 mb-1.5">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                        No img
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 line-clamp-1">{item.name}</p>
                  <p className="text-[10px] text-stone-400">{item.category}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleSaveFit}
                className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
              >
                Save This Fit
              </button>
              <button
                onClick={() => handleGenerate(lastMode)}
                className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </section>

      {items.length > 0 && (
        <section>
          <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold text-ink mb-4">
            Recently Added
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
