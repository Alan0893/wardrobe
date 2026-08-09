"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/fits", label: "Fits" },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="border-b border-stone-200 bg-white/60 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link
          href="/"
          className="font-[family-name:var(--font-playfair)] text-xl font-bold tracking-tight text-ink"
        >
          Wardrobe
        </Link>
        <div className="flex items-center gap-3">
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
          {session?.user && (
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-stone-200">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-7 h-7 rounded-full"
                />
              )}
              <button
                onClick={() => signOut()}
                className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
