"use client";

import { useEffect, useState, useCallback } from "react";
import { ItemCard, ItemData } from "@/components/ItemCard";
import { ItemForm } from "@/components/ItemForm";

const CATEGORIES = ["ALL", "TOP", "BOTTOM", "SHOES", "OUTERWEAR", "ACCESSORY"];

export default function WardrobePage() {
  const [items, setItems] = useState<ItemData[]>([]);
  const [category, setCategory] = useState("ALL");
  const [colorFilter, setColorFilter] = useState("");
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);

  const loadItems = useCallback(async () => {
    const params = new URLSearchParams();
    if (category !== "ALL") params.set("category", category);
    if (colorFilter.trim()) params.set("color", colorFilter.trim());

    const res = await fetch(`/api/items?${params.toString()}`);
    const data = await res.json();
    setItems(data);
  }, [category, colorFilter]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    loadItems();
  }

  function handleEdit(item: ItemData) {
    setEditingItem(item);
  }

  function handleEditSaved() {
    setEditingItem(null);
    loadItems();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-ink mb-1">
          My Wardrobe
        </h1>
        <p className="text-stone-500 text-sm">
          {items.length} item{items.length !== 1 ? "s" : ""} in your collection.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${category === cat
                  ? "bg-stone-800 text-white"
                  : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300"
                }`}
            >
              {cat === "ALL" ? "All" : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={colorFilter}
          onChange={(e) => setColorFilter(e.target.value)}
          placeholder="Filter by color..."
          className="px-3 py-1.5 rounded-md border border-stone-300 bg-white text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-accent/30 w-40"
        />
      </div>

      {editingItem && (
        <div className="p-4 bg-white rounded-lg border border-stone-200 shadow-sm">
          <h3 className="text-sm font-semibold text-stone-700 mb-3">Edit Item</h3>
          <ItemForm
            initial={{
              name: editingItem.name,
              brand: editingItem.brand || "",
              price: editingItem.price || "",
              imageUrl: editingItem.imageUrl || "",
              productUrl: editingItem.productUrl,
              category: editingItem.category,
              color: editingItem.color,
              season: editingItem.season,
            }}
            itemId={editingItem.id}
            onSaved={handleEditSaved}
            onCancel={() => setEditingItem(null)}
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No items yet</p>
          <p className="text-sm mt-1">Add your first item from the Dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
