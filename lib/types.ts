export type ProductCategory = "diffuser" | "oil" | "candle";

export interface ScentNotes {
  top: string[];
  heart: string[];
  base: string[];
}

export interface HotelCredential {
  line: string;
  story: string;
}

export interface FragranceOil {
  slug: string;
  name: string;
  category: "oil";
  tier: "standard" | "hotel-credential";
  tagline: string;
  description: string;
  priceINR: number;
  volumeML: number;
  notes: ScentNotes;
  mood: string;
  origin: string;
  credential?: HotelCredential;
  image: string;
  swatch: string;
  textColor: string;
}

/** A colour/finish variant of a diffuser (same model, different finish + photos). */
export interface DiffuserColor {
  name: string;
  /** CSS colour for the selector swatch. */
  swatch: string;
  finish: string;
  image: string;
  gallery: string[];
  /** Optional finish-specific copy. When present, the PDP swaps these in for the
   *  product-level defaults while this finish is selected. */
  tagline?: string;
  description?: string;
  keyFeatures?: string[];
}

export interface Diffuser {
  slug: string;
  /** Manufacturer model code from the product catalogue, e.g. "A815". */
  model: string;
  name: string;
  category: "diffuser";
  tier: "entry" | "premium";
  tagline: string;
  description: string;
  priceINR: number;
  /**
   * Undiscounted list price, shown struck through beside priceINR. Only set
   * while a model is actually marked down — Shopify's compareAtPrice is the
   * live source and overrides this, the same way it does for priceINR.
   */
  listPriceINR?: number;
  /** Companion-app control. The plug-in and the car model have none. */
  bluetooth: boolean;
  /** Absent when the manufacturer publishes no coverage figure. */
  coverageSqFt?: [number, number];
  /** Display string for coverage (e.g. "Up to 1,075 sq ft"), or where it suits
   *  when the manufacturer publishes no figure. */
  coverageLabel: string;
  /**
   * Whether a complimentary 50 ml oil ships with it. True for the room
   * diffusers; the car model is sold on its own.
   */
  includesOil: boolean;
  /** Catalogue "BEST FOR" placement tags. */
  bestFor: string[];
  /** Catalogue "KEY FEATURES" bullet list, verbatim. */
  keyFeatures: string[];
  /**
   * Four or five at-a-glance pointers for the overview dropdown under the
   * product name – the reasons to buy, in the order a shopper weighs them.
   * Restated from keyFeatures/specs only; nothing here may be new.
   */
  highlights: string[];
  image: string;
  gallery: string[];
  /** The designed key-features sheet, shown as the last gallery slide,
   *  after the specifications card. */
  featuresImage?: string;
  /** Optional product video (vertical, muted autoplay loop) for the PDP. */
  video?: string;
  finish: string;
  height: string;
  /** Present when the model ships in more than one colour/finish. The top-level
   *  image/gallery/finish mirror colors[0] (the default). */
  colors?: DiffuserColor[];
  specs: { label: string; value: string }[];
}

/**
 * A hand-poured soy candle. Unlike the oils, the sleeves carry a two-note
 * fragrance line ("Bergamot & Vetiver") rather than a top/heart/base pyramid,
 * so `notesLine` is the printed one and stays the source of truth on the page.
 */
export interface Candle {
  slug: string;
  name: string;
  category: "candle";
  /** The fragrance line exactly as printed on the label. */
  notesLine: string;
  tagline: string;
  description: string;
  priceINR: number;
  /** Undiscounted list price — see the note on Diffuser.listPriceINR. */
  listPriceINR?: number;
  /** Where the scent suits, drawn from its own description. */
  placement: string;
  /**
   * Jar volume in millilitres, as the page and the jar label state it. The
   * shipping weight stays with Shopify, which prices parcels by grams.
   */
  volumeML: number;
  /** Burn time in hours, as printed ("up to"). */
  burnHours: number;
  image: string;
  gallery: string[];
  /**
   * Four atmosphere photographs for the scent's own section on its page —
   * places and moments the fragrance belongs to. No candle appears in them.
   * Captions name the feeling rather than describing the photograph.
   */
  mood: { src: string; caption: string; alt: string }[];
  /** The heading and lede that open that section. */
  scenes: { heading: string; headingItalic: string; lede: string };
  /** The jar's glass colour. */
  swatch: string;
  textColor: string;
}

export type Product = Diffuser | FragranceOil | Candle;

export interface JournalPost {
  slug: string;
  title: string;
  eyebrow: string;
  excerpt: string;
  /**
   * One string per block. Plain strings are paragraphs, and may carry
   * [label](/path) links to pages on this site. A string beginning "## " is a
   * section heading, and "![alt](/images/…)" on its own is a full-width image.
   */
  body: string[];
  cover: string;
  publishedAt: string;
  readMinutes: number;
  /** Shorter title for the browser tab and search results, where the
   *  editorial headline would be truncated. Falls back to `title`. */
  seoTitle?: string;
  /** Set when the piece is revised, so search engines see it as fresh. */
  updatedAt?: string;
  /** Topics the piece covers, emitted in its Article markup. */
  keywords?: string[];
}
