// ============================================================
//  Quint Home – category landing pages (plan T9, audit #6)
//
//  /range/waterless-diffusers, /range/fragrance-oils and
//  /range/scented-candles: the pages that can rank for "waterless
//  diffuser", "fragrance oil for diffuser" and "soy candles", which
//  /range alone could not. Titles, descriptions and H1s are the ones
//  in the SEO plan, section 07.
//
//  Every fact here restates lib/data (diffusers.ts, oils.ts,
//  candles.ts) or the FAQ and /shipping. Nothing new may be claimed.
//  Prices in the copy are the catalogue floor ("from ₹3,999"); the
//  product cards show the live Shopify price.
// ============================================================

export type CategorySlug = "waterless-diffusers" | "fragrance-oils" | "scented-candles";

export interface CategoryPage {
  slug: CategorySlug;
  /** Which products the page lists. */
  kind: "diffuser" | "oil" | "candle";
  /** Short name for breadcrumbs and navigation. */
  label: string;
  title: string;
  description: string;
  h1: string;
  /** The H1's second, italic phrase. */
  h1Accent: string;
  intro: string;
  /** Long-form sections under the products, each an H2 and paragraphs. */
  sections: { h2: string; paras: string[]; table?: { head: [string, string, string]; rows: [string, string, string][] } }[];
  faq: { q: string; a: string }[];
  /** Guides and pages to read next. */
  related: { href: string; label: string }[];
}

export const categoryPages: CategoryPage[] = [
  {
    slug: "waterless-diffusers",
    kind: "diffuser",
    label: "Waterless Diffusers",
    title: "Waterless Aroma Diffusers for Home & Office",
    description:
      "Waterless aroma diffusers that run on pure fragrance oil, never water. Six models from ₹3,999, from car-sized to 1,075 sq ft rooms. App control on three.",
    h1: "Waterless aroma diffusers",
    h1Accent: "for every room, and the car.",
    intro:
      "Six diffusers that run on fragrance oil alone. No water, no steam and no heat: the oil is turned into a fine dry mist by air pressure, so nothing is diluted and nothing gets damp.",
    sections: [
      {
        h2: "How waterless diffusion works",
        paras: [
          "An ultrasonic diffuser mixes a few drops of oil into a tank of water and vibrates it into a damp mist. A waterless, or nebulising, diffuser skips the water entirely. Cold air is pushed past the fragrance oil and atomises it into microscopic particles that hang in the air rather than settling as moisture.",
          "Because nothing is diluted, the oil goes into the air at full strength; there is no tank to clean or refill with water, and nothing is heated. That is also why our diffusers take only Quint Home oils: they are undiluted blends at 70–90% concentration, made for cold-air nebulisation.",
        ],
      },
      {
        h2: "Which diffuser for which room",
        paras: [
          "Choose by the size of the space first, then by how you want to control it. Coverage figures are the manufacturer's.",
        ],
        table: {
          head: ["Space", "Diffuser", "Why"],
          rows: [
            ["Large living room or open-plan space, up to 1,075 sq ft", "The Monolith", "The widest coverage, a 120 ml bottle and a 2200 mAh battery, so it needs no socket"],
            ["Living room or bedroom, up to 590 sq ft", "The Loom", "Soft fabric exterior, candle-like glow, simple knob control, 120 ml bottle"],
            ["Bedroom, study or office, up to 540 sq ft", "The Pillar", "Two 60 ml bottles you can run apart or together, at 35 dB or less"],
            ["Bedside, desk or bar cart, up to 540 sq ft", "The Ember", "An LED clock that sets itself, with a breathing amber light"],
            ["Bathroom, kitchen or hallway, 161–250 sq ft", "The Pebble", "Plugs straight into the wall, no app, 24-hour cyclic timer"],
            ["Car, or a basin and small shelf", "The Drift", "Sits in a cup holder and starts and stops with the engine"],
          ],
        },
      },
      {
        h2: "What comes in the box",
        paras: [
          "Every room diffuser ships with a 50 ml fragrance oil of your choice, free. The Drift, our car diffuser, is sold on its own. A 50 ml bottle lasts about 45–60 days, depending on the model and how strong you set it, and refills start at ₹899.",
          "The Monolith, Pillar and Ember work with the Quint Home companion app, which sets schedules and intensity from your phone. The app talks to the diffuser directly: no Wi-Fi, account or cloud is needed.",
        ],
      },
    ],
    faq: [
      {
        q: "Does a waterless diffuser need any water?",
        a: "No. It runs on fragrance oil alone, atomised by cold air. There is no tank to fill, no steam and no heat.",
      },
      {
        q: "How long does a 50 ml oil last?",
        a: "About 45–60 days, depending on the model and the intensity. Most models average around 50 days at moderate settings.",
      },
      {
        q: "Which diffusers work with the app?",
        a: "The Monolith, Pillar and Ember. The Loom is set by hand at its knob, the Pebble runs on its own 24-hour cyclic timer and the Drift on two buttons; none of them needs an app.",
      },
      {
        q: "Can I use other brands' oils?",
        a: "Use only Quint Home oils. Ours are undiluted, high-concentration blends made for waterless cold-air nebulisation. Diluted, water-based or third-party oils can clog the nebuliser, and void the warranty.",
      },
      {
        q: "Is there a warranty?",
        a: "Yes, a 1-year limited warranty on the device. Orders leave Mumbai within 3 business days and usually arrive 3–5 business days later.",
      },
    ],
    related: [
      { href: "/journal/what-is-a-waterless-diffuser", label: "Why we don't use water" },
      { href: "/range/fragrance-oils", label: "The fragrance oils" },
      { href: "/find-your-scent", label: "Find your scent" },
      { href: "/faq", label: "All questions" },
    ],
  },
  {
    slug: "fragrance-oils",
    kind: "oil",
    label: "Fragrance Oils",
    title: "Diffuser Fragrance Oils, IFRA-Compliant",
    description:
      "Eight 50 ml fragrance oils for waterless diffusers at 70–90% concentration, including hotel-lobby scents Grand Lobby and The Arrival. From ₹899.",
    h1: "Fragrance oils",
    h1Accent: "for waterless diffusers.",
    intro:
      "Eight scents in 50 ml bottles, blended at 70–90% concentration: strong enough to fill a room without water or heat. Each is composed to IFRA standards and written as a full fragrance, with top, heart and base notes.",
    sections: [
      {
        h2: "How to choose a scent",
        paras: [
          "Start with the mood you want in the room. For a clean, light air, look at Blanc Ritual (citrus, tea and white musk), First Rain (pear, lotus and the air after a downpour) and Solitude (bergamot, green leaves and cedar).",
          "For something warmer and deeper, Terrain is mineral and woody, with oud and vetiver; Soft Hour is almond, peony and vanilla; and Shoreline pairs salt air and sea water with warm leather and sandalwood.",
          "Not sure? The two-question quiz at Find Your Scent matches you to one of the eight.",
        ],
      },
      {
        h2: "The Hotel Credential oils",
        paras: [
          "Grand Lobby and The Arrival are composed in the spirit of a grand hotel's entrance: Grand Lobby open and generous, with peach, tuberose and sandalwood; The Arrival composed and assured, with grapefruit, rose and amber. Both are held at full home concentration.",
          "The six signature oils are ₹899 and the two Hotel Credential oils ₹1,099. When you choose one as the free oil with a diffuser, a Hotel Credential oil carries a ₹200 supplement.",
        ],
      },
      {
        h2: "How long a bottle lasts",
        paras: [
          "A 50 ml bottle lasts about 45–60 days in a diffuser, depending on the model and how strong you set it. Every room diffuser ships with your first 50 ml free, so most people start with one scent and add a second to swap between seasons or rooms.",
        ],
      },
    ],
    faq: [
      {
        q: "Are the oils IFRA-compliant?",
        a: "Yes. Every Quint Home oil is composed to IFRA (International Fragrance Association) standards, and is safe around children and pets when used as directed.",
      },
      {
        q: "What does 70–90% concentration mean?",
        a: "Most of the bottle is fragrance, not carrier. That is why the oils suit waterless diffusers, which atomise the oil undiluted, and why a little fills a room.",
      },
      {
        q: "Can I use these oils in another brand's diffuser?",
        a: "They are blended for waterless cold-air nebulisation, the way Quint Home diffusers work, rather than for water-based or heated diffusers.",
      },
      {
        q: "How long does one bottle last?",
        a: "About 45–60 days, depending on the diffuser and the intensity setting.",
      },
    ],
    related: [
      { href: "/journal/the-architecture-of-scent", label: "How to read a scent profile" },
      { href: "/find-your-scent", label: "Find your scent" },
      { href: "/range/waterless-diffusers", label: "The diffusers" },
      { href: "/faq", label: "All questions" },
    ],
  },
  {
    slug: "scented-candles",
    kind: "candle",
    label: "Scented Candles",
    title: "Luxury Soy Wax Scented Candles",
    description:
      "Hand-poured 300 ml soy wax candles in three scents: bergamot & vetiver, violet & amber, oud & wood. Up to 45 hours of burn. ₹1,699.",
    h1: "Hand-poured soy wax",
    h1Accent: "scented candles.",
    intro:
      "Three candles, hand-poured in India from 100% natural soy wax with IFRA-compliant fragrance oils. Each holds 300 ml and burns for up to 45 hours.",
    sections: [
      {
        h2: "Three scents, three rooms",
        paras: [
          "The Forest is bergamot and vetiver, a green, wooded calm for a living room or a study. The Palace is violet and amber, quietly ceremonial, for an entrance or a bedroom. The Study is oud and wood, smoky, deep and unhurried: the one for an evening in with the door closed.",
          "Each candle comes in its own sleeve, which makes it an easy gift. All three are ₹1,699.",
        ],
      },
      {
        h2: "Pair a candle with a diffuser oil",
        paras: [
          "Each candle shares notes with one of the fragrance oils, so a room can carry the same scent from the diffuser by day to the candle at night. The Forest's bergamot and vetiver run through Solitude, which adds cedar. The Palace's violet and amber are both in The Arrival, one of the two Hotel Credential oils. The Study's oud and wood sit at the heart of Terrain, with cedar and vetiver.",
        ],
      },
      {
        h2: "Candle or diffuser?",
        paras: [
          "A candle is for the hours you are in the room: the flame, the glow and a scent that builds while it burns. A waterless diffuser is for the rest of the day, running on a schedule with no flame, so it can scent a room while you are out or asleep. Many homes use both: a diffuser for the background, a candle for the evening.",
        ],
      },
      {
        h2: "Caring for your candle",
        paras: [
          "Trim the wick to 5 mm before each burn. For indoor use only. Keep away from children, pets and direct sunlight, and never leave a burning candle unattended.",
        ],
      },
    ],
    faq: [
      {
        q: "How long do the candles burn?",
        a: "Up to 45 hours each. Trimming the wick to 5 mm before every burn keeps the flame even and the jar clean.",
      },
      {
        q: "What are they made of?",
        a: "100% natural soy wax and IFRA-compliant fragrance oils, hand-poured in India.",
      },
      {
        q: "How big are they?",
        a: "Each candle holds 300 ml.",
      },
    ],
    related: [
      { href: "/range/waterless-diffusers", label: "The diffusers" },
      { href: "/range/fragrance-oils", label: "The fragrance oils" },
      { href: "/journal/diwali-gifting-guide", label: "Diwali gifting guide" },
    ],
  },
];

export function getCategoryPage(slug: CategorySlug): CategoryPage {
  return categoryPages.find((c) => c.slug === slug)!;
}
