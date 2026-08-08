"use client";

import { useState } from "react";

export interface ItemData {
  id: string;
  name: string;
  brand: string | null;
  price: string | null;
  imageUrl: string | null;
  productUrl: string;
  category: string;
  color: string | null;
  season: string;
  createdAt: string;
}

interface ItemCardProps {
  item: ItemData;
  onDelete?: (id: string) => void;
  onEdit?: (item: ItemData) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  TOP: "Top",
  BOTTOM: "Bottom",
  SHOES: "Shoes",
  OUTERWEAR: "Outerwear",
  ACCESSORY: "Accessory",
};

export function ItemCard({ item, onDelete, onEdit }: ItemCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group bg-white rounded-lg border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-square bg-stone-100 relative overflow-hidden">
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">
            No image
          </div>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(item)}
              className="bg-white/90 backdrop-blur-sm text-stone-700 p-1.5 rounded-md text-xs hover:bg-white shadow-sm"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="bg-white/90 backdrop-blur-sm text-red-600 p-1.5 rounded-md text-xs hover:bg-white shadow-sm"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <div className="p-3">
        <a
          href={item.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-ink hover:text-accent line-clamp-2 leading-snug"
        >
          {item.name || "Untitled"}
        </a>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-stone-500">
          {item.brand && <span>{item.brand}</span>}
          <span className="px-1.5 py-0.5 bg-stone-100 rounded text-stone-600">
            {CATEGORY_LABELS[item.category] || item.category}
          </span>
        </div>
        {item.price && (
          <div className="mt-1 text-sm font-medium text-stone-700">
            {item.price.startsWith("$") ? item.price : `$${item.price}`}
          </div>
        )}
      </div>
    </div>
  );
}
