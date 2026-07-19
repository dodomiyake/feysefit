"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { FolderKanban, Search, User, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { searchAdminDirectory, type AdminSearchResult } from "@/lib/admin-search";
import { cn } from "@/lib/cn";

const typeLabels = {
  designer: "Designer",
  customer: "Client",
  project: "Project",
} as const;

function ResultIcon({ type }: { type: AdminSearchResult["type"] }) {
  if (type === "designer") return <Users className="h-4 w-4 shrink-0 text-primary/45" />;
  if (type === "customer") return <User className="h-4 w-4 shrink-0 text-primary/45" />;
  return <FolderKanban className="h-4 w-4 shrink-0 text-primary/45" />;
}

export function AdminGlobalSearch() {
  const { designers, customers, projects } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevQuery, setPrevQuery] = useState(query);
  const containerRef = useRef<HTMLDivElement>(null);

  if (query !== prevQuery) {
    setPrevQuery(query);
    setActiveIndex(0);
  }

  const results = useMemo(
    () => searchAdminDirectory(query, { designers, customers, projects }),
    [query, designers, customers, projects]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = open && query.trim().length >= 2;

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || results.length === 0) {
      if (event.key === "Escape") setOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selected = results[activeIndex];
      if (selected) {
        window.location.href = selected.href;
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative max-w-xl flex-1">
      <div className="flex items-center gap-3 rounded-full border border-primary/10 bg-surface-container/80 px-4 py-2 transition-all focus-within:ring-1 focus-within:ring-accent">
        <Search className="h-[18px] w-[18px] shrink-0 text-primary/40" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search designers, clients, or projects…"
          className="w-full bg-transparent text-sm text-primary placeholder:text-primary/40 focus:outline-none"
          aria-label="Search admin directory"
          aria-expanded={showDropdown}
          aria-controls="admin-search-results"
          role="combobox"
          autoComplete="off"
        />
      </div>

      {showDropdown && (
        <div
          id="admin-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-primary/10 bg-card shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-primary/50">No matches for &ldquo;{query.trim()}&rdquo;</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result, index) => (
                <li key={`${result.type}-${result.id}`} role="option" aria-selected={index === activeIndex}>
                  <Link
                    href={result.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-primary/5",
                      index === activeIndex && "bg-primary/5"
                    )}
                  >
                    <ResultIcon type={result.type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-primary">{result.title}</p>
                      <p className="truncate text-xs text-primary/50">{result.subtitle}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-primary/40">
                      {typeLabels[result.type]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
