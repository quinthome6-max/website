/**
 * Quint Home — print catalogue (A4 portrait).
 *
 * Generates marketing/catalogue/out/catalogue.html from the same data the website runs
 * on, so a spec, a finish or a scent note can never read one way in print and
 * another online. The words live in marketing/catalogue/copy.json; everything factual
 * about a diffuser, an oil or a candle comes from lib/data.
 *
 *   npx tsx marketing/catalogue/build.ts            → marketing/catalogue/out/catalogue.html
 *   python3 marketing/catalogue/tools/render.py     → marketing/catalogue/out/*.pdf
 *
 * Rendering to PDF is a separate step (Playwright, print to A4 with
 * backgrounds), kept out of this file so the repo does not need a browser as a
 * dependency and `next build` never type-checks one.
 *
 * The book is short on purpose, and reads in one order:
 *
 *   Our Story · Quintessence · Why Waterless Diffusion Is Better ·
 *   Our Product Range (diffusers, oils, candles) · For Gifting ·
 *   Custom Scent Solutions
 *
 * That order is written down once, in CHAPTERS below. The contents page, the
 * chapter numerals and the page sequence are all read from it, so the index
 * cannot list the book in a different order from the one it is bound in.
 *
 * No prices anywhere, by design: the catalogue outlives a price list.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { diffusers } from "../../lib/data/diffusers";
import { oils } from "../../lib/data/oils";
import { candles, CANDLE_CARE, CANDLE_MAKE } from "../../lib/data/candles";
import type { Candle, Diffuser, FragranceOil } from "../../lib/types";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "marketing", "catalogue", "out");

// ─── Copy ────────────────────────────────────────────────────────────────────

interface TitledBody {
  title: string;
  body: string;
}
interface Headed {
  headline: string;
  headlineItalic: string;
}
interface CatalogueCopy {
  cover: { title: string; titleItalic: string; subtitle: string };
  story: Headed & { title: string; standfirst: string; body: string[]; vision: string };
  quintessence: {
    title: string;
    definitionLead: string;
    definitionItalic: string;
    definitionTail: string;
    body: string;
    closing: string;
    closingItalic: string;
  };
  waterless: Headed & { title: string; lede: string; principles: TitledBody[] };
  range: {
    title: string;
    diffusers: Headed & { label: string; lede: string };
    oils: Headed & { label: string; lede: string };
    candles: Headed & { label: string };
  };
  products: (Headed & { slug: string; description: string })[];
  gifting: Headed & {
    title: string;
    lede: string;
    occasions: TitledBody[];
    guideTitle: string;
    guide: { who: string; what: string; why: string }[];
    notes: TitledBody[];
  };
  custom: Headed & {
    title: string;
    lede: string;
    offerings: TitledBody[];
    process: TitledBody[];
    contactTitle: string;
    contactLede: string;
    closing: string;
  };
}

const copy = JSON.parse(
  readFileSync(join(ROOT, "marketing", "catalogue", "copy.json"), "utf8")
) as CatalogueCopy;

// ─── Website comparison data, read from the component itself ────────────────

interface CompareFacts {
  power: string;
  control: string;
  clock: string;
  light: string;
  material: string;
}

/**
 * The comparison table on the website keeps its rows as module constants.
 * Print no longer carries the table, but still borrows its wording where a
 * product's own spec sheet cannot be printed (see UNCONFIRMED_SPECS). Parsing
 * it here, rather than copying it, keeps the two saying the same thing.
 */
function readSiteComparison(): {
  facts: Record<string, CompareFacts>;
  images: Record<string, string>;
} {
  const src = readFileSync(
    join(ROOT, "components", "sections", "diffuser-compare.tsx"),
    "utf8"
  );
  const facts: Record<string, CompareFacts> = {};
  for (const m of src.matchAll(
    /(?:"([A-Z0-9-]+)"|([A-Z][A-Z0-9-]*)):\s*\{\s*power:\s*"([^"]*)",\s*control:\s*"([^"]*)",\s*clock:\s*"([^"]*)",\s*light:\s*"([^"]*)",\s*material:\s*"([^"]*)"/g
  )) {
    facts[m[1] ?? m[2]] = {
      power: m[3],
      control: m[4],
      clock: m[5],
      light: m[6],
      material: m[7],
    };
  }
  const images: Record<string, string> = {};
  const block = src.slice(src.indexOf("COMPARE_IMAGES"));
  for (const m of block.matchAll(
    /(?:"([A-Z0-9-]+)"|([A-Z][A-Z0-9-]*)):\s*"(\/images\/[^"]+)"/g
  )) {
    images[m[1] ?? m[2]] = m[3];
  }
  return { facts, images };
}

const SITE_COMPARE = readSiteComparison();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Print typography, applied to every string on its way into the page:
 * apostrophes are typeset (’), a number never parts from its unit ("50 ml",
 * "1,075 sq ft") and a range never breaks at its dash ("70–90%"). NBSP and the
 * word joiner are both inside the bundled fonts' latin subset.
 */
const typeset = (s: string): string =>
  s
    .replace(/(\w)'(\w)/g, "$1\u2019$2")
    .replace(/(\d) (?=(?:ml|sq ft|mm|g|kg|W|mAh|days|hours)\b)/g, "$1\u00a0")
    .replace(/\bsq ft\b/g, "sq\u00a0ft")
    .replace(/(\d)–(\d)/g, "$1–\u2060$2");

const esc = (v: unknown): string =>
  typeset(String(v ?? "")).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string
  );

/** Keep the last two words of a short paragraph together: no one-word last line. */
const tie = (v: unknown): string => esc(v).replace(/ (\S+)$/, "\u00a0$1");

/** A site image as a file URL — the HTML is rendered locally, not served. */
const img = (sitePath: string): string =>
  pathToFileURL(join(ROOT, "public", sitePath)).href;

/** A print-only image from marketing/catalogue/assets (see tools/prepare_assets.py). */
const asset = (name: string): string =>
  pathToFileURL(join(ROOT, "marketing", "catalogue", "assets", name)).href;

/**
 * Atmosphere photographs, all from the website's own vibe set. Each was picked
 * for warmth: the brand is 60% Stardust, 30% Aerial, 10% Solar Clay, and
 * several vibe images are mostly foliage or olive water, which on paper reads
 * as a green book. Those are left out on purpose.
 */
const VIBE = {
  cover: "/images/vibe/vibe-11.webp", // still water in clay-coloured light
  story: "/images/vibe/vibe-07.webp", // golden haze; the site pairs it with Udaipur
} as const;

const WORD_NUMBERS = [
  "Zero", "One", "Two", "Three", "Four", "Five",
  "Six", "Seven", "Eight", "Nine", "Ten",
];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The catalogue data mixes "aluminum" and "aluminium", and the comparison
 * table uses spaced em dashes where the copy uses en dashes. A printed book
 * should read one way throughout, so both are normalised here — for print
 * only; lib/data is left exactly as the website has it.
 */
const tidy = (s: string): string =>
  s
    .replace(/\bAluminum\b/g, "Aluminium")
    .replace(/\baluminum\b/g, "aluminium")
    .replace(/\bAluminium Alloy\b/g, "Aluminium alloy")
    .replace(/\bCafes\b/g, "Cafés")
    .replace(/ — /g, " – ")
    // One spec style across the book: "12 V DC", "161–250", lower-case parts.
    .replace(/(\d) – (\d)/g, "$1–$2")
    .replace(/\bDC (\d+(?:\.\d+)?)V\b/g, "$1 V DC")
    .replace(/(\d)V DC\b/g, "$1 V DC")
    .replace(/\+ Fabric\b/g, "+ fabric")
    .replace(/\+ Glass\b/g, "+ glass")
    .replace(/\((Shell|Bottle)\)/g, (_, w: string) => `(${w.toLowerCase()})`)
    .replace(/\b24h\b|\b24-Hour\b/g, "24-hour")
    .replace(/Intelligent Cyclic/g, "intelligent cyclic")
    // "≤" is not in any subset the bundled fonts ship with, and a missing glyph
    // falls back to whatever the rendering machine has — a system font the
    // print shop does not. Same meaning, glyphs the fonts do carry.
    .replace(/≤\s*(\d[\d.]*)\s*dB/g, "$1 dB or less");

/**
 * Brand marks, inlined and recoloured through currentColor.
 *
 * The source SVGs declare a 3000×3000 canvas with the artwork floating in the
 * middle, and the "light" variants carry a full-canvas background shape. So
 * the dark artwork is used everywhere, cropped to bounds measured with getBBox
 * in a real browser — a guessed crop clipped the Q on the invoice once already.
 */
function brandMark(file: string, viewBox: string, cls: string): string {
  const raw = readFileSync(join(ROOT, "public", "images", "brand", file), "utf8")
    .replace(/<\?xml[^>]*\?>/, "")
    .replace(/<svg\b[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .trim();
  return `<svg class="${cls}" viewBox="${viewBox}" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${raw}</svg>`;
}
const LOGO = (cls = "logo") => brandMark("logo-dark.svg", "245 1123 2509 917", cls);
const MONO = (cls = "mono") => brandMark("monogram-dark.svg", "345 290 2537 2424", cls);

// ─── Page scaffolding ────────────────────────────────────────────────────────

/**
 * Page grounds are the site's light neutrals only. The website keeps its
 * deepest green for a thin announcement bar and one enquiry band; a book of
 * full-bleed green pages read as a different brand, so print has none.
 */
type Ground = "white" | "stardust-soft" | "stardust";

interface PageSpec {
  key: string;
  section: string;
  ground: Ground;
  folio: boolean;
  html: (n: number) => string;
}

/**
 * The chapter numeral, a hairline, and whatever belongs at the far end of it.
 * The title itself is the headline directly beneath, so it is not repeated
 * here; the folio at the foot of the page carries it as the running title.
 */
function eyebrow(chapter: number | null, label = "", extra?: string): string {
  const lead = [chapter ? WORD_NUMBERS[chapter] : "", label].filter(Boolean).join(" · ");
  return `<div class="eyebrow">${MONO()}<span>${esc(lead)}</span>${
    extra ? `<span class="eyebrow-extra">${esc(extra)}</span>` : ""
  }</div>`;
}

function headline(h: Headed, cls = "display"): string {
  return `<h1 class="${cls}">${esc(h.headline)} <em>${esc(h.headlineItalic)}</em></h1>`;
}

function folio(section: string, n: number): string {
  return `<footer class="folio"><span>Quint Home</span><span>${esc(section)}</span><span>№ ${pad(n)}</span></footer>`;
}

// ─── Data joins ──────────────────────────────────────────────────────────────

const copyFor = (slug: string) => {
  const c = copy.products.find((p) => p.slug === slug);
  if (!c) throw new Error(`catalogue/copy.json has no product entry for "${slug}"`);
  return c;
};

/**
 * The Pebble's power row reads "AC 120V ~ 60Hz" in the catalogue data — a US
 * mains figure for a product sold in India. It is left off the print, with the
 * website's own wording used in its place, until the real rating is confirmed.
 * Printing a wrong electrical rating in a document people specify from is
 * worse than printing none.
 */
const UNCONFIRMED_SPECS: Record<string, string[]> = {
  pebble: ["Voltage / Power"],
  // The Pillar's spec says "≤35 dB" and the site's FAQ says "under 18 dB".
  // No decibel figure is printed until one is confirmed.
  pillar: ["Noise Level"],
};

/**
 * Print-only rewording of spec values from lib/data (keys are tidy() output),
 * where the site's wording carries something print cannot back.
 */
const PRINT_TEXT: Record<string, string> = {
  "LED Clock with Auto Network Time Sync": "LED clock with automatic time sync",
};
const printText = (s: string): string => {
  const t = tidy(s);
  return PRINT_TEXT[t] ?? t;
};

function specRows(d: Diffuser): { label: string; value: string }[] {
  const drop = new Set(UNCONFIRMED_SPECS[d.slug] ?? []);
  const rows = d.specs.filter((s) => !drop.has(s.label));
  const site = SITE_COMPARE.facts[d.model];
  if (drop.has("Voltage / Power") && site) rows.unshift({ label: "Power", value: site.power });
  // Finishes join the Material line rather than adding a cell: the strip
  // holds eight, in two rows of four.
  if (d.colors && d.colors.length > 1) {
    const fin = d.colors.map((c) => c.name.toLowerCase()).join(" or ");
    return rows.map((r) => (r.label === "Material" ? { label: r.label, value: `${r.value} – ${fin}` } : r));
  }
  return rows;
}

// ─── The order of the book ───────────────────────────────────────────────────

/**
 * Chapters, in the order they are bound. Everything that numbers or lists them
 * reads this array: the numeral at the head of a page, the entry on the
 * contents page, and the sequence the pages are assembled in.
 */
const CHAPTERS = ["story", "quintessence", "waterless", "range", "gifting", "custom"] as const;
type Chapter = (typeof CHAPTERS)[number];
const chapterNo = (c: Chapter): number => CHAPTERS.indexOf(c) + 1;

const CHAPTER_TITLE: Record<Chapter, string> = {
  story: copy.story.title,
  quintessence: copy.quintessence.title,
  waterless: copy.waterless.title,
  range: copy.range.title,
  gifting: copy.gifting.title,
  custom: copy.custom.title,
};

/**
 * Which diffusers come without an oil, said the same way wherever it is said.
 * The Drift is sold on its own, so "every diffuser ships with an oil" — true
 * when the first catalogue was written — would now be a promise in print that
 * the box does not keep.
 */
const WITHOUT_OIL = diffusers.filter((d) => !d.includesOil).map((d) => d.name.replace(/^The /, "the "));
const OIL_LINE =
  WITHOUT_OIL.length === 0
    ? "Every diffuser ships with a 50 ml fragrance oil of your choice"
    : `Every diffuser except ${WITHOUT_OIL.join(" and ")} ships with a 50 ml fragrance oil of your choice`;

// ─── Pages ───────────────────────────────────────────────────────────────────

const coverPage = (): string => `
  <div class="cover">
    <div class="cover-top">
      ${MONO("cover-mono")}
      ${LOGO("cover-logo")}
    </div>
    <div class="cover-plate">
      <img src="${img(VIBE.cover)}" alt="" />
    </div>
    <div class="cover-title">
      <h1>${esc(copy.cover.title)} <em>${esc(copy.cover.titleItalic)}</em></h1>
      <p>${esc(copy.cover.subtitle)}</p>
    </div>
    <div class="cover-foot"><span>The Collection</span><span>www.quinthome.in</span></div>
  </div>`;

interface ContentsEntry {
  label: string;
  page: number;
  /** Parts of a chapter, listed beneath it: the three halves of the range. */
  parts?: { label: string; page: number }[];
}

function contentsPage(entries: ContentsEntry[]): () => string {
  return () => `
    ${eyebrow(null, "Contents")}
    <div class="contents">
      <h1 class="display">In <em>this book.</em></h1>
      <ol>
        ${entries
          .map(
            (e, i) => `<li${e.parts ? ' class="has-parts"' : ""}>
              <div class="c-row"><span class="c-num">${pad(i + 1)}</span><span class="c-label">${esc(
                e.label
              )}</span><span class="c-rule"></span><span class="c-page">№ ${pad(e.page)}</span></div>
              ${
                e.parts
                  ? `<ol class="c-parts">${e.parts
                      .map(
                        (p) => `<li><span class="c-label">${esc(p.label)}</span><span class="c-rule"></span><span class="c-page">№ ${pad(
                          p.page
                        )}</span></li>`
                      )
                      .join("")}</ol>`
                  : ""
              }
            </li>`
          )
          .join("")}
      </ol>
      <div class="contents-foot"><span>Quint Home · Mumbai</span><span>www.quinthome.in</span></div>
    </div>`;
}

const storyPage = () => `
  ${eyebrow(chapterNo("story"))}
  <div class="story">
    ${headline(copy.story)}
    <p class="standfirst">${esc(copy.story.standfirst)}</p>
    <div class="story-grid">
      <figure class="founder">
        <img src="${img("/images/founder/semil.webp")}" alt="" />
        <figcaption>Founder · Quint Home</figcaption>
      </figure>
      <div class="prose">${copy.story.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    </div>
    <div class="story-foot">
      <figure class="story-vibe"><img src="${img(VIBE.story)}" alt="" /></figure>
      <blockquote class="vision"><p class="sub-eyebrow">Our vision</p><p>${esc(copy.story.vision)}</p></blockquote>
    </div>
  </div>`;

/**
 * The word, set as it is on the About page: "Quint" in charcoal, "essence" in
 * clay. Every sentence beneath it is the website's, word for word.
 */
const quintessencePage = () => {
  const q = copy.quintessence;
  return `
  ${eyebrow(chapterNo("quintessence"))}
  <div class="quint">
    <div class="q-head">
      <h1 class="q-word">${esc(q.title.slice(0, 5))}<em>${esc(q.title.slice(5))}</em></h1>
      <!-- Set in capitals, where "ɪ" becomes "Ɪ" — a letter neither bundled font
           carries, so it fell back to a platform font the print shop would not
           have. Written as it already reads on the About page: KWIN. -->
      <p class="q-meta">Noun<br />/KWINˈTƐSƏNS/<br /><span>The fifth element</span></p>
    </div>
    <div class="q-cols">
      <p class="q-def">${esc(q.definitionLead)} <em>${esc(q.definitionItalic)}</em> ${esc(q.definitionTail)}</p>
      <div class="q-body">
        <p>${esc(q.body)}</p>
        <p class="q-close">${esc(q.closing)} <em>${esc(q.closingItalic)}</em></p>
      </div>
    </div>
    <figure class="band"><img src="${img("/images/indoor/indoor-02.webp")}" alt="" /></figure>
  </div>`;
};

const waterlessPage = () => `
  ${eyebrow(chapterNo("waterless"))}
  <div class="concept">
    ${headline(copy.waterless)}
    <p class="lede">${esc(copy.waterless.lede)}</p>
    <div class="principles">
      ${copy.waterless.principles
        .map(
          (p, i) => `<div class="principle"><span class="num">${pad(i + 1)}</span><h3>${esc(
            p.title
          )}</h3><p>${tie(p.body)}</p></div>`
        )
        .join("")}
    </div>
    <figure class="band"><img src="${img("/images/usp/usp-1.webp")}" alt="" /></figure>
  </div>`;

/**
 * A diffuser in half a page: what it is, where it suits, and its spec sheet.
 * The feature bullets the website lists are left out here — each one restates
 * a line of the description or a cell of the specs, and at two to a page there
 * is room to say a thing once.
 */
function productCard(d: Diffuser): string {
  const c = copyFor(d.slug);
  return `
    <article class="pcard">
      <div class="pc-top">
        <figure class="pc-hero"><img src="${img(d.image)}" alt="${esc(d.name)}" /></figure>
        <div class="pc-text">
          <p class="p-name">${esc(tidy(d.coverageLabel))}<span>Model ${esc(d.model)}</span></p>
          ${headline(c, "p-headline")}
          <p class="p-desc">${esc(c.description)}</p>
          <p class="p-best"><span>Best for</span>${d.bestFor.map((b) => esc(tidy(b)).replace(/ /g, " ")).join(" · ")}</p>
        </div>
      </div>
      <dl class="specs">
        ${specRows(d)
          .map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(printText(s.value))}</dd></div>`)
          .join("")}
      </dl>
    </article>`;
}

/** Two diffusers to a page. */
const PER_PAGE = 2;
const diffuserSets: Diffuser[][] = [];
for (let i = 0; i < diffusers.length; i += PER_PAGE) diffuserSets.push(diffusers.slice(i, i + PER_PAGE));

const diffusersPage = (set: Diffuser[], index: number) => () => {
  const r = copy.range.diffusers;
  const first = index === 0;
  return `
  ${eyebrow(chapterNo("range"), "", `${r.label} · ${index + 1} of ${diffuserSets.length}`)}
  <div class="range">
    ${headline(r)}
    ${
      first
        ? `<p class="lede">${esc(
            r.lede.replace("{count}", WORD_NUMBERS[diffusers.length] ?? String(diffusers.length))
          )} ${esc(OIL_LINE)}.</p>`
        : ""
    }
    <div class="pcards">${set.map(productCard).join("")}</div>
  </div>`;
};

/** One note per run: "Lily of the Valley" never breaks into two notes. */
const noteLine = (notes: string[]): string => notes.map((n) => esc(n).replace(/ /g, " ")).join(" · ");

/** Grand Lobby's backdrop warmed for print (tools/prepare_assets.py). */
const PRINT_OIL: Record<string, string> = { "grand-lobby": "oil-grand-lobby.jpg" };

/**
 * Every oil photograph on the site is composed the same way (1215 × 1519, the
 * bottle standing in the middle), so one crop — set in the stylesheet — closes
 * in on the bottle and its label in all eight.
 */
function oilCard(o: FragranceOil): string {
  return `<article class="oil">
    <figure><img src="${PRINT_OIL[o.slug] ? asset(PRINT_OIL[o.slug]) : img(o.image)}" alt="${esc(o.name)}" /></figure>
    <div class="oil-body">
      <p class="s-mood">${esc(o.mood)}</p>
      <h3>${esc(o.name)}${o.tier === "hotel-credential" ? `<span class="badge">Hotel Credential</span>` : ""}</h3>
      <p class="s-tag">${tie(o.tagline)}</p>
      <dl class="notes">
        <div><dt>Top</dt><dd>${noteLine(o.notes.top)}</dd></div>
        <div><dt>Heart</dt><dd>${noteLine(o.notes.heart)}</dd></div>
        <div><dt>Base</dt><dd>${noteLine(o.notes.base)}</dd></div>
      </dl>
    </div>
  </article>`;
}

const oilsPage = () => {
  const r = copy.range.oils;
  return `
  ${eyebrow(chapterNo("range"), "", "50 ml · 70–90% concentration · IFRA-compliant")}
  <div class="range">
    ${headline(r)}
    <p class="lede">${esc(r.lede)}</p>
    <div class="oil-grid">${oils.map(oilCard).join("")}</div>
  </div>`;
};

/**
 * The photograph of each candle that shows its jar and label best in print.
 * All are from the candle's own gallery on the website.
 */
const PRINT_CANDLE: Record<string, string> = {
  "the-forest": "/images/candles/the-forest-02.webp",
  "the-palace": "/images/candles/the-palace-02.webp",
};

function candleCard(c: Candle): string {
  return `<article class="candle">
    <figure><img src="${img(PRINT_CANDLE[c.slug] ?? c.image)}" alt="${esc(c.name)}" /></figure>
    <p class="cd-notes">${esc(c.notesLine)}</p>
    <h3>${esc(c.name)}</h3>
    <p class="s-tag">${tie(c.tagline)}</p>
    <p class="cd-desc">${esc(c.description)}</p>
    <p class="p-best"><span>Suits</span>${esc(c.placement)}</p>
  </article>`;
}

/** One figure for all three only while all three share it. */
const same = <T,>(values: T[]): T | null => (values.every((v) => v === values[0]) ? values[0] : null);

const candlesPage = () => {
  const r = copy.range.candles;
  const volume = same(candles.map((c) => c.volumeML));
  const burn = same(candles.map((c) => c.burnHours));
  return `
  ${eyebrow(chapterNo("range"), "", `${WORD_NUMBERS[candles.length] ?? candles.length} scents`)}
  <div class="range">
    ${headline(r)}
    <p class="lede">${esc(CANDLE_MAKE)}</p>
    <div class="candle-grid">${candles.map(candleCard).join("")}</div>
    <div class="notes3 candle-notes">
      ${volume ? `<p><span>Size</span>${esc(`${volume} ml`)}</p>` : ""}
      ${burn ? `<p><span>Burn time</span>${esc(`Up to ${burn} hours`)}</p>` : ""}
      <p class="wide"><span>Care</span>${esc(CANDLE_CARE)}</p>
    </div>
  </div>`;
};

const giftingPage = () => {
  const g = copy.gifting;
  return `
  ${eyebrow(chapterNo("gifting"))}
  <div class="gifting">
    <div class="gift-top">
      <div>
        ${headline(g)}
        <p class="lede">${esc(g.lede)}</p>
      </div>
      <figure class="gift-img"><img src="${img("/images/candles/the-study-01.webp")}" alt="" /></figure>
    </div>
    <div class="occasions">
      ${g.occasions
        .map((o) => `<div class="offering"><h3>${esc(o.title)}</h3><p>${tie(o.body)}</p></div>`)
        .join("")}
    </div>
    <p class="sub-eyebrow">${esc(g.guideTitle)}</p>
    <dl class="gift-guide">
      ${g.guide
        .map((r) => `<div><dt>${esc(r.who)}</dt><dd class="g-what">${esc(r.what)}</dd><dd>${tie(r.why)}</dd></div>`)
        .join("")}
    </dl>
    <div class="notes3">
      ${g.notes
        .map(
          (n) => `<p><span>${esc(n.title)}</span>${tie(
            n.body.replace("{oilLine}", `${OIL_LINE}, so it can be given and switched on the same evening.`)
          )}</p>`
        )
        .join("")}
    </div>
  </div>`;
};

/**
 * The last chapter is also the back cover: bespoke work ends, naturally, on
 * how to begin it, so the page closes on the contact details and the mark.
 */
const customPage = () => {
  const c = copy.custom;
  return `
  <div class="custom">
    ${eyebrow(chapterNo("custom"))}
    ${headline(c)}
    <p class="lede">${esc(c.lede)}</p>
    <div class="offerings">
      ${c.offerings
        .map((o) => `<div class="offering"><h3>${esc(o.title)}</h3><p>${tie(o.body)}</p></div>`)
        .join("")}
    </div>
    <p class="sub-eyebrow">How it works</p>
    <ol class="process">
      ${c.process
        .map(
          (s, i) => `<li><span class="step">${pad(i + 1)}</span><h4>${esc(s.title)}</h4><p>${tie(s.body)}</p></li>`
        )
        .join("")}
    </ol>
    <div class="begin">
      <div class="begin-text">
        <p class="sub-eyebrow">${esc(c.contactTitle)}</p>
        <p class="begin-lede">${esc(c.contactLede)}</p>
        <p class="closing">${esc(c.closing)}</p>
      </div>
      <dl class="contact-grid">
        <div><dt>Email</dt><dd>hello@quinthome.in</dd></div>
        <div><dt>Phone &amp; WhatsApp</dt><dd>+91 98196 16668</dd></div>
        <div><dt>Website</dt><dd>www.quinthome.in</dd></div>
        <div><dt>Instagram</dt><dd>@shopquinthome</dd></div>
        <div><dt>Studio</dt><dd>Mumbai, India</dd></div>
        <div><dt>Delivery</dt><dd>Across India</dd></div>
      </dl>
    </div>
    <div class="contact-foot">${MONO("contact-mono")}${LOGO("contact-logo")}</div>
  </div>`;
};

// ─── Assembly ────────────────────────────────────────────────────────────────

/** Each chapter's pages, in the order of CHAPTERS. */
const CHAPTER_PAGES: Record<Chapter, PageSpec[]> = {
  story: [{ key: "story", section: CHAPTER_TITLE.story, ground: "stardust-soft", folio: true, html: storyPage }],
  quintessence: [
    { key: "quintessence", section: CHAPTER_TITLE.quintessence, ground: "stardust-soft", folio: true, html: quintessencePage },
  ],
  waterless: [{ key: "waterless", section: CHAPTER_TITLE.waterless, ground: "white", folio: true, html: waterlessPage }],
  range: [
    ...diffuserSets.map((set, i) => ({
      key: `diffusers-${i + 1}`,
      section: CHAPTER_TITLE.range,
      ground: "white" as Ground,
      folio: true,
      html: diffusersPage(set, i),
    })),
    { key: "oils", section: CHAPTER_TITLE.range, ground: "white", folio: true, html: oilsPage },
    { key: "candles", section: CHAPTER_TITLE.range, ground: "white", folio: true, html: candlesPage },
  ],
  gifting: [{ key: "gifting", section: CHAPTER_TITLE.gifting, ground: "stardust-soft", folio: true, html: giftingPage }],
  // The back cover: no folio, as on the front.
  custom: [{ key: "custom", section: CHAPTER_TITLE.custom, ground: "stardust", folio: false, html: customPage }],
};

const body: PageSpec[] = CHAPTERS.flatMap((c) => CHAPTER_PAGES[c]);

// Cover and contents come first, so the first chapter opens on page 3.
const FIRST_BODY_PAGE = 3;
const pageOf = (key: string): number => {
  const i = body.findIndex((b) => b.key === key);
  if (i < 0) throw new Error(`No page with key "${key}"`);
  return FIRST_BODY_PAGE + i;
};

const contentsEntries: ContentsEntry[] = CHAPTERS.map((c) => ({
  label: CHAPTER_TITLE[c],
  page: pageOf(CHAPTER_PAGES[c][0].key),
  ...(c === "range"
    ? {
        parts: [
          { label: copy.range.diffusers.label, page: pageOf("diffusers-1") },
          { label: copy.range.oils.label, page: pageOf("oils") },
          { label: copy.range.candles.label, page: pageOf("candles") },
        ],
      }
    : {}),
}));

const pages: PageSpec[] = [
  { key: "cover", section: "", ground: "stardust", folio: false, html: coverPage },
  { key: "contents", section: "Contents", ground: "white", folio: false, html: contentsPage(contentsEntries) },
  ...body,
];

const css = readFileSync(join(ROOT, "marketing", "catalogue", "catalogue.css"), "utf8");

/**
 * Two editions from one source. The screen edition is exact A4, for email and
 * on-screen reading. The print edition adds 3mm of bleed on every side:
 * several pages are solid colour to the edge, and a trimmer's tolerance would
 * otherwise leave a hairline of white paper along them.
 */
const edition = (bleed: boolean) => `<!doctype html>
<html lang="en-IN"><head><meta charset="utf-8" />
<title>Quint Home – The Collection</title>
<style>${css}
@page { size: ${bleed ? "216mm 303mm" : "210mm 297mm"}; margin: 0; }</style>
</head><body${bleed ? ' class="bleed"' : ""}>
${pages
  .map(
    (p, i) => `<section class="page ground-${p.ground}" data-key="${p.key}">
  ${p.html(i + 1)}
  ${p.folio ? folio(p.section, i + 1) : ""}
</section>`
  )
  .join("\n")}
</body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "catalogue.html"), edition(false));
writeFileSync(join(OUT_DIR, "catalogue-print-bleed.html"), edition(true));
console.log(
  `catalogue.html — ${pages.length} pages:`,
  pages.map((p, i) => `${pad(i + 1)} ${p.key}`).join(", ")
);
// A saddle-stitched booklet is folded sheets, four pages each.
if (pages.length % 4 !== 0) {
  console.warn(
    `Note: ${pages.length} pages is not a multiple of four — a stapled booklet would need ${
      4 - (pages.length % 4)
    } blank page(s).`
  );
}
