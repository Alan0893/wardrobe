"use client";

import { useState } from "react";
import { colorToHex } from "@/lib/colorHex";

export interface ItemData {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  colorImageUrl: string | null;
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
  badge?: React.ReactNode;
}

const CATEGORY_LABELS: Record<string, string> = {
  TOP: "Top",
  MIDLAYER: "Mid-layer",
  BOTTOM: "Bottom",
  SHOES: "Shoes",
  OUTERWEAR: "Outerwear",
  ACCESSORY: "Accessory",
};

function ColorDot({ item }: { item: ItemData }) {
  const [swatchError, setSwatchError] = useState(false);

  if (item.colorImageUrl && !swatchError) {
    return (
      <img
        src={item.colorImageUrl}
        alt={item.color || "color"}
        className="w-3.5 h-3.5 rounded-full border border-stone-200 object-cover"
        onError={() => setSwatchError(true)}
      />
    );
  }

  const hex = colorToHex(item.color);
  if (hex) {
    const isGradient = hex.includes("gradient");
    return (
      <span
        className="inline-block w-3.5 h-3.5 rounded-full border border-stone-200"
        style={isGradient ? { background: hex } : { backgroundColor: hex }}
      />
    );
  }

  return null;
}

export function ItemCard({ item, onDelete, onEdit, badge }: ItemCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group bg-white rounded-lg border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow relative">
      {badge}
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
          {(item.color || item.colorImageUrl) && (
            <span className="flex items-center gap-1">
              <ColorDot item={item} />
              {item.color && <span>{item.color}</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
