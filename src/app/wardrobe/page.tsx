"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { ItemCard, ItemData } from "@/components/ItemCard";
import { ItemForm } from "@/components/ItemForm";

const CATEGORIES = ["ALL", "TOP", "MIDLAYER", "BOTTOM", "SHOES", "OUTERWEAR", "ACCESSORY"];

const CATEGORY_LABELS: Record<string, string> = {
  ALL: "All",
  TOP: "Top",
  MIDLAYER: "Mid-layer",
  BOTTOM: "Bottom",
  SHOES: "Shoes",
  OUTERWEAR: "Outerwear",
  ACCESSORY: "Accessory",
};

interface ItemGroup {
  key: string;
  items: ItemData[];
}

function groupItems(items: ItemData[]): ItemGroup[] {
  const map = new Map<string, ItemData[]>();
  for (const item of items) {
    // Normalize: strip common suffixes retailers add (e.g. "| UNIQLO US")
    const normalized = item.name
      .replace(/\s*\|.*$/, "")
      .replace(/\s*[-–].*(?:official|store|shop).*$/i, "")
      .trim()
      .toLowerCase();
    const key = `${normalized}::${item.category}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
}

export default function WardrobePage() {
  const [items, setItems] = useState<ItemData[]>([]);
  const [category, setCategory] = useState("ALL");
  const [colorFilter, setColorFilter] = useState("");
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);
  /** Which colorway is active per group key */
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string>>({});

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
    if (editingItem?.id === id) setEditingItem(null);
    loadItems();
  }

  function handleEdit(item: ItemData) {
    setEditingItem((current) => (current?.id === item.id ? null : item));
  }

  function handleEditSaved() {
    setEditingItem(null);
    loadItems();
  }

  function renderEditableCard(
    item: ItemData,
    options?: {
      groupKey?: string;
      variants?: ItemData[];
    }
  ) {
    const isEditing = editingItem?.id === item.id;
    const variants = options?.variants;
    const groupKey = options?.groupKey;

    return (
      <Fragment key={groupKey || item.id}>
        <ItemCard
          item={item}
          variants={variants}
          onSelectVariant={
            groupKey
              ? (variant) => {
                  setSelectedByGroup((prev) => ({ ...prev, [groupKey]: variant.id }));
                  // Keep edit panel in sync if it was open for another colorway
                  setEditingItem((current) =>
                    current && variants?.some((v) => v.id === current.id) ? variant : current
                  );
                }
              : undefined
          }
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
        {isEditing && (
          <div className="col-span-full p-4 bg-white rounded-lg border border-stone-200 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">
              Edit Item
              {editingItem.color ? (
                <span className="ml-2 font-normal text-stone-500">· {editingItem.color}</span>
              ) : null}
            </h3>
            <ItemForm
              key={editingItem.id}
              initial={{
                name: editingItem.name,
                brand: editingItem.brand || "",
                imageUrl: editingItem.imageUrl || "",
                colorImageUrl: editingItem.colorImageUrl || "",
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
      </Fragment>
    );
  }

  const groups = groupItems(items);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-ink mb-1">
          My Wardrobe
        </h1>
        <p className="text-stone-500 text-sm">
          {items.length} item{items.length !== 1 ? "s" : ""} in your collection
          {groups.length !== items.length
            ? ` · ${groups.length} unique style${groups.length !== 1 ? "s" : ""}`
            : ""}
          .
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
              {CATEGORY_LABELS[cat] || cat}
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

      {items.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-lg">No items yet</p>
          <p className="text-sm mt-1">Add your first item from the Dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {groups.map((group) => {
            if (group.items.length === 1) {
              return renderEditableCard(group.items[0]);
            }

            const selectedId = selectedByGroup[group.key] || group.items[0].id;
            const selected =
              group.items.find((i) => i.id === selectedId) || group.items[0];

            return renderEditableCard(selected, {
              groupKey: group.key,
              variants: group.items,
            });
          })}
        </div>
      )}
    </div>
  );
}
