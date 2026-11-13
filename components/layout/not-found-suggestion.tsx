"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";

const products = [...diffusers, ...oils, ...candles].map((p) => ({
  slug: p.slug,
  name: p.name,
  image: p.image,
  // "The Monolith" is matched on "monolith"; "Grand Lobby" on "grand lobby".
  key: p.name.toLowerCase().replace(/^the\s+/, ""),
}));

const noSubscription = () => () => {};

/**
 * "Were you looking for …?" on the 404 page. AI assistants sometimes build a
 * link out of a sentence ("/ — My favourite for design- Monolith: …"); the
 * product's name is usually still in it, so offer that product first.
 */
export function NotFoundSuggestion() {
  const path = useSyncExternalStore(
    noSubscription,
    () => {
      try {
        return decodeURIComponent(window.location.pathname + " " + window.location.search).toLowerCase();
      } catch {
        return window.location.pathname.toLowerCase();
      }
    },
    () => ""
  );
  if (!path) return null;
  const words = path.replace(/[^a-z0-9]+/g, " ");
  const hits = products.filter((p) => words.includes(p.key) || words.includes(p.slug.replace(/-/g, " ")));
  if (!hits.length) return null;

  return (
    <div className="mx-auto mt-10 w-full max-w-[34rem] border border-[color:var(--color-rule)] bg-[color:var(--color-stardust-soft)] p-4 text-left">
      <p className="text-[0.6rem] uppercase tracking-[0.32em] text-[color:var(--color-charcoal-soft)]">
        Were you looking for
      </p>
      <ul className="mt-3 grid gap-3">
        {hits.slice(0, 3).map((p) => (
          <li key={p.slug}>
            <Link href={`/range/${p.slug}`} className="group flex items-center gap-4 bg-[color:var(--color-white)] p-3">
              <span className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden bg-[color:var(--color-aerial-soft)]">
                <Image src={p.image} alt={p.name} fill sizes="64px" className="object-cover" />
              </span>
              <span className="flex-1" style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem" }}>
                {p.name}
              </span>
              <span className="text-[0.62rem] uppercase tracking-[0.22em] text-[color:var(--color-clay)] group-hover:underline group-hover:underline-offset-4">
                View →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
