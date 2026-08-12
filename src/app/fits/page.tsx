"use client";

import { useEffect, useState, useCallback } from "react";
import { ItemData } from "@/components/ItemCard";

interface FitData {
  id: string;
  createdAt: string;
  items: { item: ItemData }[];
}

export default function FitsPage() {
  const [fits, setFits] = useState<FitData[]>([]);
  const [currentFit, setCurrentFit] = useState<ItemData[] | null>(null);
  const [generating, setGenerating] = useState(false);

  const loadFits = useCallback(async () => {
    const res = await fetch("/api/fits");
    const data = await res.json();
    setFits(data);
  }, []);

  useEffect(() => {
    loadFits();
  }, [loadFits]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/fits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentFit(data.items);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!currentFit) return;
    await fetch("/api/fits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: currentFit.map((i) => i.id) }),
    });
    setCurrentFit(null);
    loadFits();
  }

  async function handleDelete(fitId: string) {
    await fetch(`/api/fits/${fitId}`, { method: "DELETE" });
    loadFits();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-ink mb-1">
            Fits
          </h1>
          <p className="text-stone-500 text-sm">
            Generate outfits and save the ones you like.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-5 py-2.5 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-light disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating..." : "Generate a Fit"}
        </button>
      </div>

      {currentFit && currentFit.length > 0 && (
        <div className="p-5 bg-white rounded-lg border border-stone-200 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">
            Your Generated Fit
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {currentFit.map((item) => (
              <FitItemThumb key={item.id} item={item} />
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              Save This Fit
            </button>
            <button
              onClick={handleGenerate}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
            >
              Regenerate
            </button>
            <button
              onClick={() => setCurrentFit(null)}
              className="px-4 py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {fits.length === 0 && !currentFit ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No saved fits yet</p>
          <p className="text-sm mt-1">
            Generate an outfit and save it to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {fits.map((fit) => (
            <div
              key={fit.id}
              className="p-4 bg-white rounded-lg border border-stone-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-stone-400">
                  {new Date(fit.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <button
                  onClick={() => handleDelete(fit.id)}
                  className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {fit.items.map(({ item }) => (
                  <FitItemThumb key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FitItemThumb({ item }: { item: ItemData }) {
  const categoryLabel =
    ({
      TOP: "Top",
      MIDLAYER: "Mid-layer",
      BOTTOM: "Bottom",
      SHOES: "Shoes",
      OUTERWEAR: "Outerwear",
      ACCESSORY: "Accessory",
    } as Record<string, string>)[item.category] || item.category;

  return (
    <div className="text-center">
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
      <p className="text-[10px] text-stone-400">{categoryLabel}</p>
    </div>
  );
}
