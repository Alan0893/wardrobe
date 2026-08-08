"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/fits", label: "Fits" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-stone-200 bg-white/60 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link
          href="/"
          className="font-[family-name:var(--font-playfair)] text-xl font-bold tracking-tight text-ink"
        >
          Wardrobe
        </Link>
        <nav className="flex gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${active
                    ? "bg-stone-800 text-white"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
