"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { globalSearchAction } from "@/actions/search";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { GlobalSearchResults } from "@/services/search";

const EMPTY_RESULTS: GlobalSearchResults = { leads: [], clients: [], orders: [], invoices: [] };

const GROUPS: { key: keyof GlobalSearchResults; heading: string }[] = [
  { key: "leads", heading: "Leads" },
  { key: "clients", heading: "Clients" },
  { key: "orders", heading: "Orders" },
  { key: "invoices", heading: "Invoices" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>(EMPTY_RESULTS);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      return;
    }
    const timeout = setTimeout(() => {
      globalSearchAction(query).then(setResults);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
    }
  }, [open]);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  const hasAnyResults = GROUPS.some((group) => results[group.key].length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
      >
        <span>Search…</span>
        <kbd className="ml-4 rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search leads, clients, orders, invoices…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length < 2 ? (
            <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
          ) : !hasAnyResults ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            GROUPS.map((group) => {
              const items = results[group.key];
              if (items.length === 0) return null;
              return (
                <CommandGroup key={group.key} heading={group.heading}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${group.key}-${item.id}`}
                      onSelect={() => handleSelect(item.href)}
                    >
                      <div className="flex flex-col">
                        <span>{item.label}</span>
                        <span className="text-xs text-muted-foreground">{item.sublabel}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
