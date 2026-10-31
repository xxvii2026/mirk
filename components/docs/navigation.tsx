"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { docs, docHref } from "./content";

export function DocsNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const searchId = useId();
  const path = usePathname();
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();
  const matches = docs.filter((doc) =>
    `${doc.title} ${doc.description} ${doc.sections.map((s) => `${s.title} ${s.text}`).join(" ")}`
      .toLowerCase()
      .includes(term),
  );
  return (
    <div>
      <label htmlFor={searchId} className="sr-only">
        Search documentation
      </label>
      <input
        id={searchId}
        type="search"
        placeholder="Search documentation…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border-line bg-surface placeholder:text-muted min-h-11 w-full rounded-xl border px-3 text-sm outline-offset-4"
      />
      <nav aria-label="Documentation" className="mt-7 space-y-7">
        {[...new Set(docs.map((doc) => doc.group))].map((group) => {
          const items = matches.filter((doc) => doc.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <h2 className="mb-2 px-3 text-[13px] font-medium">{group}</h2>
              <ul className="space-y-0.5">
                {items.map((doc) => (
                  <li key={doc.slug}>
                    <Link
                      href={docHref(doc.slug)}
                      onClick={onNavigate}
                      aria-current={path === docHref(doc.slug) ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${path === docHref(doc.slug) ? "bg-signal-tint text-signal-text font-medium" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}
                    >
                      {doc.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {matches.length === 0 ? (
          <p role="status" className="text-muted px-3 text-sm">
            No guides found. Try “backup”, “payment”, or “wallet”.
          </p>
        ) : null}
        {term && matches.length > 0 ? (
          <p role="status" className="sr-only">
            {matches.length} guides found
          </p>
        ) : null}
      </nav>
    </div>
  );
}

export function DocsMobileNavigation() {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={details} className="border-line mx-5 border-b py-4 md:hidden">
      <summary className="cursor-pointer py-2 text-sm font-medium">Browse documentation</summary>
      <div className="py-4">
        <DocsNavigation
          onNavigate={() => {
            if (details.current) details.current.open = false;
          }}
        />
      </div>
    </details>
  );
}
