"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Calendar" },
  { href: "/meals", label: "Meal Library" },
];

const COMING_SOON = ["Pantry", "Shopping List"];

export default function Nav() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <nav className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2">
        <span className="mr-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">🍽️</span>
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              pathname === href
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </Link>
        ))}
        {COMING_SOON.map((label) => (
          <span
            key={label}
            className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm text-zinc-400 dark:text-zinc-600"
            title="Coming soon"
          >
            {label}
          </span>
        ))}
      </nav>
    </header>
  );
}
