"use client";

import { useState } from "react";
import { colorToHex } from "@/lib/colorHex";

const CATEGORIES = ["TOP", "BOTTOM", "SHOES", "OUTERWEAR", "ACCESSORY"];
const SEASONS = ["ALL_SEASON", "SUMMER", "WINTER"];

interface ItemFormProps {
  initial: {
    name: string;
    brand: string;
    price: string;
    imageUrl: string;
    colorImageUrl?: string;
    productUrl: string;
    category: string;
    color?: string | null;
    season?: string;
  };
  itemId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function ItemForm({ initial, itemId, onSaved, onCancel }: ItemFormProps) {
  const [form, setForm] = useState({
    name: initial.name || "",
    brand: initial.brand || "",
    price: initial.price || "",
    imageUrl: initial.imageUrl || "",
    colorImageUrl: initial.colorImageUrl || "",
    productUrl: initial.productUrl || "",
    category: initial.category || "TOP",
    color: initial.color || "",
    season: initial.season || "ALL_SEASON",
  });
  const [saving, setSaving] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const endpoint = itemId ? `/api/items/${itemId}` : "/api/items";
    const method = itemId ? "PATCH" : "POST";

    await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setSaving(false);
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Name" value={form.name} onChange={(v) => update("name", v)} />
        <Field label="Brand" value={form.brand} onChange={(v) => update("brand", v)} />
        <Field label="Price" value={form.price} onChange={(v) => update("price", v)} />
        <Field label="Color" value={form.color} onChange={(v) => update("color", v)} />
        <Field label="Image URL" value={form.imageUrl} onChange={(v) => update("imageUrl", v)} />
        <Field label="Color Swatch URL" value={form.colorImageUrl} onChange={(v) => update("colorImageUrl", v)} />
        <Field label="Product URL" value={form.productUrl} onChange={(v) => update("productUrl", v)} />
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Season</label>
          <select
            value={form.season}
            onChange={(e) => update("season", e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL_SEASON" ? "All Season" : s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {form.imageUrl && (
          <div>
            <span className="block text-xs text-stone-500 mb-1">Product</span>
            <div className="w-20 h-20 rounded-md overflow-hidden border border-stone-200 bg-stone-50">
              <img
                src={form.imageUrl}
                alt="Product preview"
                className="w-full h-full object-cover"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            </div>
          </div>
        )}
        {(form.colorImageUrl || form.color) && (
          <div>
            <span className="block text-xs text-stone-500 mb-1">Color</span>
            {form.colorImageUrl ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border border-stone-200 bg-stone-50">
                <img
                  src={form.colorImageUrl}
                  alt="Color swatch"
                  className="w-full h-full object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
            ) : (
              (() => {
                const hex = colorToHex(form.color);
                if (!hex) return null;
                const isGradient = hex.includes("gradient");
                return (
                  <div
                    className="w-10 h-10 rounded-full border border-stone-200"
                    style={isGradient ? { background: hex } : { backgroundColor: hex }}
                  />
                );
              })()
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !form.name}
          className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : itemId ? "Update" : "Save to Wardrobe"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-stone-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
    </div>
  );
}
