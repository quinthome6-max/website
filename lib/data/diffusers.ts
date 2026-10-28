import type { Diffuser } from "../types";

// ============================================================
//  Quint Home – Diffuser range
//  Source of truth: "Aroma Diffuser Collection – Product
//  Catalogue 2026" (6 models). Specs, key features, taglines and
//  "best for" tags are transcribed VERBATIM from the catalogue,
//  per-model – do not move values between models.
//
//  NOTE ON PRICING: the catalogue carries no prices. The figures
//  below are the owner's, and listPriceINR is the pre-discount list
//  price shown struck through. Both are only the FALLBACK for when
//  Shopify can't be reached — the store's price and compareAtPrice
//  are what shoppers actually see, so a repricing happens there
//  first and these are brought into line with it.
//
//  IMAGERY: per-product lifestyle photography (5 images each) lives
//  under /images/diffusers/<slug>/. The A326 ships in two finishes,
//  so it carries separate gold + black image sets.
// ============================================================

// ------------------------------------------------------------
//  Product description = the brief's "Electronic Diffusers –
//  Product Value Proposition", used VERBATIM. Connectivity /
//  scheduling sentences are included only on the models they
//  actually apply to (the Pebble has no app; morning/evening
//  scheduling is the Dual Mist / Pillar only). Per-model facts
//  (materials, dimensions, coverage) live in `specs`.
// ------------------------------------------------------------
const DESC_INTRO =
  "Waterless cold-air nebulising electronic diffuser. Cold-air nebulisation – no water, no steam, no heat. Fragrance oil atomised into microscopic particles using air pressure.";
const DESC_DESIGN =
  "A sculpted decor object – designed to be displayed on a shelf, not hidden. Form and finish matter as much as function.";
const DESC_CARE =
  "Oil refill: approximately 45–60 days depending on usage intensity. No open flame. No heat. No water. Safe around children and pets when used as directed.";
const OP_SILENT = "Silent – no fan noise, no water gurgling.";
const OP_APP =
  OP_SILENT +
  " App-controllable via the companion app, alongside physical controls.";
const OP_APP_SCHEDULE =
  OP_APP +
  " Set morning and evening fragrance schedules and intensity levels once via app.";
const descFor = (operation: string) =>
  `${DESC_INTRO}\n\n${operation}\n\n${DESC_DESIGN}\n\n${DESC_CARE}`;

const diffusersByDefinition: Diffuser[] = [
  {
    slug: "drift",
    model: "M22",
    name: "The Drift",
    category: "diffuser",
    tier: "entry",
    tagline: "Scent that travels with you.",
    description:
      "The Drift is the smallest diffuser in the range, turned from a single piece of aluminium alloy and sized to stand in a car cup holder, on a bathroom shelf or beside a basin. It works the same way the larger models do – fragrance oil atomised by air pressure, with no water, no heat and no cartridge to replace.\n\nTwo controls do everything. Mode sets how much scent the room gets, at a light, medium or strong setting. Timer sets how long it runs: one, two or four hours, releasing a measured burst every 15, 60 or 120 seconds. In a car it starts and stops with the engine, so it is scenting the cabin by the time you have pulled away.",
    priceINR: 3999,
    bluetooth: false,
    // The spec sheet publishes no coverage figure, so none is printed. The
    // label says where it belongs instead of inventing a square-foot range.
    coverageLabel: "Cars and compact spaces",
    includesOil: false,
    bestFor: ["Cars", "Bathrooms", "Desks", "Travel"],
    highlights: [
      "Sits in a car cup holder and starts and stops with the engine",
      "Machined aluminium body, just 50 g",
      "Light, medium and strong intensity",
      "Timer for 1, 2 or 4 hours",
      "Waterless – fragrance oil only, no cartridge to replace",
    ],
    keyFeatures: [
      "Waterless nebulising – fragrance oil only, no water and no heat",
      "Machined aluminium alloy body in matte black, 50 g and 137 mm tall",
      "Three intensity settings – light, medium and strong",
      "Timer for 1, 2 or 4 hours, with a burst every 15, 60 or 120 seconds",
      "Starts and stops with the car, so it runs only when you are driving",
      "Cordless placement – no cable trailing across the cabin",
    ],
    image: "/images/diffusers/drift-m22/01.webp",
    featuresImage: "/images/diffusers/key-features/drift.webp",
    gallery: [
      "/images/diffusers/drift-m22/01.webp",
      "/images/diffusers/drift-m22/02.webp",
      "/images/diffusers/drift-m22/03.webp",
      "/images/diffusers/drift-m22/04.webp",
    ],
    finish: "Machined aluminium alloy, matte black",
    height: "Ø70 × 137 mm",
    specs: [
      { label: "Voltage / Power", value: "DC 12V" },
      { label: "Material", value: "Aluminium Alloy" },
      { label: "Dimensions", value: "Ø70 × 137 mm" },
      { label: "Net Weight", value: "50 g" },
      { label: "Intensity", value: "Light · Medium · Strong" },
      { label: "Timer", value: "1 / 2 / 4 hours" },
      { label: "Interval", value: "Every 15 / 60 / 120 seconds" },
    ],
  },
  {
    slug: "pebble",
    model: "A815",
    name: "The Pebble",
    category: "diffuser",
    tier: "entry",
    tagline: "Scent Your Space. No Setup Required.",
    description:
      "The Pebble is the effortless way to fill any room with your favourite Quint Home fragrance oil. Simply plug it into any wall socket and let its ultra-quiet, waterless diffusion do the rest. Its compact, rotatable plug fits virtually any outlet orientation – perfect for bathrooms, kitchens, and tight spaces where a larger diffuser just won't fit.\n\nA built-in 24-hour intelligent cyclic timer takes care of the scheduling, so you get consistent fragrance without lifting a finger. No fussing with apps, no mess, no noise.",
    priceINR: 3999,
    bluetooth: false,
    coverageSqFt: [161, 250],
    coverageLabel: "161–250 sq ft",
    includesOil: true,
    bestFor: ["Bathrooms", "Kitchens", "Compact Spaces"],
    highlights: [
      "Plug and play – no assembly, no app",
      "Rotatable plug fits any socket orientation",
      "24-hour intelligent cyclic timer",
      "Ultra-quiet, waterless mist",
      "Covers 161–250 sq ft – bathrooms, kitchens, hallways",
    ],
    keyFeatures: [
      "Plug & Play – no installation or assembly required",
      "Rotatable plug fits any wall socket orientation",
      "Ultra-quiet operation with a delicate, steady mist",
      "24-Hour intelligent cyclic timer for hands-free fragrance",
      "15 ml glass bottle with PP shell – lightweight and durable",
    ],
    image: "/images/diffusers/plug-in-a815/01.webp",
    featuresImage: "/images/diffusers/key-features/pebble.webp",
    video: "https://res.cloudinary.com/dnv4kq8ml/video/upload/v1780760006/Video_Display_pjm1fk.mp4",
    gallery: [
      "/images/diffusers/plug-in-a815/01.webp",
      "/images/diffusers/plug-in-a815/02.webp",
      "/images/diffusers/plug-in-a815/03.webp",
      "/images/diffusers/plug-in-a815/04.webp",
      "/images/diffusers/plug-in-a815/05.webp",
    ],
    finish: "PP shell with 15 ml glass bottle",
    height: "160.5 × 44 × 56.5 mm",
    specs: [
      { label: "Bottle Capacity", value: "15 ml" },
      { label: "Voltage / Power", value: "AC 120V ~ 60Hz / 2.5 W" },
      { label: "Material", value: "PP (Shell) + Glass (Bottle)" },
      { label: "Dimensions", value: "160.5 × 44 × 56.5 mm" },
      { label: "Net Weight", value: "135 g" },      { label: "Coverage Area", value: "161 – 250 sq ft" },
      { label: "Timer", value: "24-Hour Intelligent Cyclic" },
    ],
  },
  {
    slug: "monolith",
    model: "A326",
    name: "The Monolith",
    category: "diffuser",
    tier: "premium",
    tagline: "Elevate Every Room. Effortlessly.",
    seoTitle: "The Monolith Cordless Waterless Diffuser",
    seoDescription:
      "Cordless waterless diffuser in brushed gold or matte black aluminium, for rooms up to 1,075 sq ft. App schedules and a free 50 ml oil. {price}.",
    description:
      "The Monolith in brushed gold is where function meets design. Standing tall in premium aluminum, this column diffuser brings a refined, hotel-like quality to any space. Its large 120 ml bottle keeps fragrance flowing for hours, and the built-in 2200 mAh rechargeable battery means it goes wherever you do – no outlet required.\n\nConnect via Bluetooth to control diffusion intensity and scheduling directly from your phone. Set a schedule and let the Monolith run your ambience on autopilot. A leak-proof design ensures spill-free placement, always.",
    priceINR: 18999,
    listPriceINR: 23750,
    bluetooth: true,
    coverageSqFt: [108, 1075],
    coverageLabel: "Up to 1,075 sq ft",
    includesOil: true,
    bestFor: ["Living Rooms", "Larger Rooms", "Open-Plan Spaces", "Brand Stores", "Cafes", "Offices"],
    highlights: [
      "Truly wireless – built-in 2200 mAh rechargeable battery",
      "Solid aluminium column in brushed gold or matte black",
      "Bluetooth app for intensity and schedules",
      "Covers up to 1,075 sq ft from a 120 ml leak-proof bottle",
      "Waterless cold-air diffusion – no water, no heat",
    ],
    keyFeatures: [
      "Premium aluminum column construction in warm gold finish",
      "Built-in 2200 mAh rechargeable Li-ion battery – truly wireless",
      "Intuitive touch control panel with ambient mood lighting",
      "Programmable timer for scheduled, automated diffusion",
      "Leak-proof design for safe placement anywhere",
      "Bluetooth connectivity – control from your phone via the companion app",
    ],
    image: "/images/diffusers/a326-gold/gold-v3-01.webp",
    featuresImage: "/images/diffusers/key-features/monolith.webp",
    gallery: [
      "/images/diffusers/a326-gold/gold-v3-01.webp",
      "/images/diffusers/a326-gold/gold-v2-02.webp",
      "/images/diffusers/a326-gold/gold-v2-03.webp",
      "/images/diffusers/a326-gold/gold-v2-04.webp",
    ],
    finish: "Brushed gold aluminum column",
    height: "Ø117.5 × 342 mm",
    colors: [
      {
        name: "Gold",
        swatch: "#B5946A",
        finish: "Brushed gold aluminum column",
        image: "/images/diffusers/a326-gold/gold-v3-01.webp",
        gallery: [
          "/images/diffusers/a326-gold/gold-v3-01.webp",
          "/images/diffusers/a326-gold/gold-v2-02.webp",
          "/images/diffusers/a326-gold/gold-v2-03.webp",
          "/images/diffusers/a326-gold/gold-v2-04.webp",
        ],
        tagline: "Elevate Every Room. Effortlessly.",
        description:
          "The Monolith in brushed gold is where function meets design. Standing tall in premium aluminum, this column diffuser brings a refined, hotel-like quality to any space. Its large 120 ml bottle keeps fragrance flowing for hours, and the built-in 2200 mAh rechargeable battery means it goes wherever you do – no outlet required.\n\nConnect via Bluetooth to control diffusion intensity and scheduling directly from your phone. Set a schedule and let the Monolith run your ambience on autopilot. A leak-proof design ensures spill-free placement, always.",
        keyFeatures: [
          "Premium aluminum column construction in warm gold finish",
          "Built-in 2200 mAh rechargeable Li-ion battery – truly wireless",
          "Intuitive touch control panel with ambient mood lighting",
          "Programmable timer for scheduled, automated diffusion",
          "Leak-proof design for safe placement anywhere",
          "Bluetooth connectivity – control from your phone via the companion app",
        ],
      },
      {
        name: "Black",
        swatch: "#2A2A2A",
        finish: "Matte black aluminum column",
        image: "/images/diffusers/a326-black/black-v2-01.webp",
        gallery: [
          "/images/diffusers/a326-black/black-v2-01.webp",
          "/images/diffusers/a326-black/black-v2-02.webp",
          "/images/diffusers/a326-black/black-v2-03.webp",
          "/images/diffusers/a326-black/black-v2-04.webp",
        ],
        tagline: "Bold Presence. Pure Fragrance.",
        description:
          "The Monolith in matte black delivers the same powerful performance as its gold counterpart, wrapped in a sleek finish that complements modern and minimalist interiors. The same premium aluminum build, the same wireless battery freedom, the same whisper-quiet mist output – just dressed for spaces that favour a darker, more dramatic aesthetic.\n\nBluetooth connectivity lets you control intensity and scheduling from your phone – no fussing with buttons. A natural choice for boutique hotels, brand stores, design-forward offices, or any home that takes its interiors seriously.",
        keyFeatures: [
          "Matte black aluminum finish – contemporary and understated",
          "Built-in 2200 mAh rechargeable Li-ion battery – cord-free flexibility",
          "Touch control panel with ambient mood lighting",
          "Programmable timer for scheduled, automated diffusion",
          "Leak-proof design for safe, stable placement",
          "Bluetooth connectivity – control from your phone via the companion app",
        ],
      },
    ],
    specs: [
      { label: "Bottle Capacity", value: "120 ml" },
      { label: "Voltage / Power", value: "DC 12V / 4 W" },
      { label: "Battery", value: "Built-in 2200 mAh Li-ion" },
      { label: "Material", value: "Aluminum" },
      { label: "Dimensions", value: "Ø117.5 × 342 mm" },
      { label: "Net Weight", value: "1.35 kg" },      { label: "Coverage Area", value: "Up to 1,075 sq ft" },
      { label: "Connectivity", value: "Companion app" },
    ],
  },
  {
    slug: "loom",
    model: "A974",
    name: "The Loom",
    category: "diffuser",
    tier: "entry",
    tagline: "Soft to the Touch. Warm in Every Sense.",
    description:
      "The Loom reimagines the aroma diffuser with a soft fabric exterior that feels as good as it looks. Where most diffusers are cold and clinical, this one is warm and tactile – designed to sit naturally on a bedside table, salon counter, or living room shelf. The candle-like ambient glow adds a gentle flicker of warmth to evening routines.\n\nThere is no app to pair and no screen to learn: reach for the satisfying knob and dial in the intensity by hand. Intuitive by design, it fits any space and any lifestyle.",
    priceINR: 11999,
    listPriceINR: 14999,
    bluetooth: false,
    coverageSqFt: [108, 590],
    coverageLabel: "Up to 590 sq ft",
    includesOil: true,
    bestFor: ["Living Rooms", "Bedrooms", "Salons", "Brand Stores"],
    highlights: [
      "Soft fabric exterior – warm to the touch",
      "Candle-like ambient glow for evenings",
      "Simple knob control – no app needed",
      "Covers up to 590 sq ft from a 120 ml leak-proof bottle",
      "Waterless cold-air diffusion – no water, no heat",
    ],
    keyFeatures: [
      "Soft fabric exterior – warm, organic tactile finish",
      "Candle-like ambient light for evening ambience",
      "Simple knob control – no digital interface needed",
      "Leak-proof design for spill-free placement",
      "120 ml capacity for long, uninterrupted diffusion sessions",
    ],
    image: "/images/diffusers/fabric-a974/loom-v2-01.webp",
    featuresImage: "/images/diffusers/key-features/loom-v2.webp",
    gallery: [
      "/images/diffusers/fabric-a974/loom-v2-01.webp",
      "/images/diffusers/fabric-a974/loom-v2-02.webp",
      "/images/diffusers/fabric-a974/loom-v2-03.webp",
      "/images/diffusers/fabric-a974/loom-v2-04.webp",
    ],
    finish: "PP body with soft fabric exterior",
    height: "Ø103 × 293 mm",
    specs: [
      { label: "Bottle Capacity", value: "120 ml" },
      { label: "Voltage / Power", value: "DC 12V / 6 W" },
      { label: "Material", value: "PP + Fabric" },
      { label: "Dimensions", value: "Ø103 × 293 mm" },
      { label: "Net Weight", value: "660 g" },
      { label: "Coverage Area", value: "Up to 590 sq ft" },
      { label: "Control", value: "Knob" },
    ],
  },
  {
    slug: "pillar",
    model: "A-T302",
    name: "The Pillar",
    category: "diffuser",
    tier: "premium",
    tagline: "Two Scents. One Space. Infinite Combinations.",
    seoTitle: "The Pillar Dual-Scent Waterless Diffuser",
    seoDescription:
      "Runs two fragrance oils at once, or one at a time, from twin 60 ml bottles. Near-silent and app controlled, for rooms up to 540 sq ft. {price}.",
    description:
      "The Pillar does something no ordinary diffuser can: run two completely independent essential oil blends at once. Each of its dual 60 ml bottles operates separately, so you can diffuse two scents individually or layer them for a custom blend. Near-silent operation at ≤35 dB makes it whisper-quiet enough for a study, bedroom, or yoga session.\n\nBluetooth connectivity gives you full control from your phone – adjust each mist outlet independently without leaving your seat. Built from premium aluminum alloy and powered via USB.",
    priceINR: 11999,
    listPriceINR: 14999,
    bluetooth: true,
    coverageSqFt: [108, 538],
    coverageLabel: "Up to 540 sq ft",
    includesOil: true,
    bestFor: ["Living Rooms", "Bedrooms", "Study Rooms", "Offices"],
    highlights: [
      "Two independent 60 ml bottles – run one scent or layer both",
      "Bluetooth app controls each mist outlet separately",
      "Near-silent at ≤35 dB",
      "Aluminium alloy body, USB powered",
      "Covers up to 540 sq ft",
    ],
    keyFeatures: [
      "Dual independent 60 ml mist outlets – run one or both simultaneously",
      "Ultra-quiet at ≤35 dB – barely a whisper in any room",
      "Spill-proof design for safe, worry-free placement",
      "USB-powered (5V DC) – works with any standard adapter",
      "Bluetooth compatible – independently control each mist outlet from your phone",
    ],
    image: "/images/diffusers/dual-mist-at302/pillar-v2-01.webp",
    featuresImage: "/images/diffusers/key-features/pillar.webp",
    video: "https://res.cloudinary.com/dnv4kq8ml/video/upload/v1780759975/Video_Display_r7dj6z.mp4",
    gallery: [
      "/images/diffusers/dual-mist-at302/pillar-v2-01.webp",
      "/images/diffusers/dual-mist-at302/pillar-v2-02.webp",
      "/images/diffusers/dual-mist-at302/pillar-v2-03b.webp",
      "/images/diffusers/dual-mist-at302/pillar-v2-04b.webp",
    ],
    finish: "Aluminum alloy with PP + PET",
    height: "140 × 93 × 218 mm",
    specs: [
      { label: "Bottle Capacity", value: "60 ml × 2 (dual independent)" },
      { label: "Voltage / Power", value: "5V DC (USB) / 2.3 W" },
      { label: "Material", value: "Aluminum Alloy + PP + PET" },
      { label: "Dimensions", value: "140 × 93 × 218 mm" },
      { label: "Net Weight", value: "740 g (±15%)" },
      { label: "Noise Level", value: "≤35 dB" },      { label: "Coverage Area", value: "Up to 540 sq ft" },
      { label: "Connectivity", value: "Companion app" },
    ],
  },
  {
    slug: "ember",
    model: "A-T370",
    name: "The Ember",
    category: "diffuser",
    tier: "premium",
    tagline: "Always Know the Time. Always Set the Mood.",
    description:
      "The Ember is more than a diffuser – it is a desktop companion. An integrated LED clock with automatic network time synchronisation keeps you grounded in your day, while a soft natural breathing light and steady fragrance mist keep your space feeling calm. The glass-like acrylic finish gives it a premium, almost sculptural quality.\n\nBluetooth connectivity means you can adjust fragrance intensity from your phone without disturbing the calm the Ember creates. Right at home on a work desk, bar cart, or bedside table.",
    priceINR: 8799,
    listPriceINR: 10999,
    bluetooth: true,
    coverageSqFt: [108, 538],
    coverageLabel: "Up to 540 sq ft",
    includesOil: true,
    bestFor: ["Bedrooms", "Living Rooms", "Offices", "Bars"],
    highlights: [
      "LED clock that sets itself by network time",
      "Soft, breathing ambient light",
      "Glass-like acrylic (PMMA) body",
      "Bluetooth app for fragrance intensity",
      "Covers up to 540 sq ft from a 60 ml spill-proof bottle",
    ],
    keyFeatures: [
      "Integrated LED clock with automatic network time sync",
      "Natural breathing ambient light – soft, rhythmic glow",
      "Premium glass-like acrylic (PMMA) finish",
      "Upgraded spill-proof design for reliable daily use",
      "USB-powered (5V DC) – easy placement anywhere",
      "Bluetooth compatible – adjust fragrance settings from your phone",
    ],
    image: "/images/diffusers/clock-at370/ember-v2-01.webp",
    featuresImage: "/images/diffusers/key-features/ember.webp",
    video: "https://res.cloudinary.com/dnv4kq8ml/video/upload/Video_Display_gggg5v.mp4",
    gallery: [
      "/images/diffusers/clock-at370/ember-v2-01.webp",
      "/images/diffusers/clock-at370/ember-v2-02.webp",
      "/images/diffusers/clock-at370/ember-v2-03.webp",
      "/images/diffusers/clock-at370/ember-v2-04.webp",
    ],
    finish: "Glass-like acrylic (PMMA)",
    height: "154 × 88.5 × 132 mm",
    specs: [
      { label: "Bottle Capacity", value: "60 ml" },
      { label: "Voltage / Power", value: "5V DC (USB) / 4 W" },
      { label: "Material", value: "PMMA + PP + POM" },
      { label: "Dimensions", value: "154 × 88.5 × 132 mm" },
      { label: "Net Weight", value: "580 g (±5%)" },      { label: "Coverage Area", value: "Up to 540 sq ft" },
      { label: "Display", value: "LED Clock with Auto Network Time Sync" },
      { label: "Connectivity", value: "Companion app" },
    ],
  },
];

// Display order across the site: largest room first, down to the car.
const DIFFUSER_ORDER = [
  "monolith",
  "loom",
  "ember",
  "pillar",
  "pebble",
  "drift",
];
export const diffusers: Diffuser[] = DIFFUSER_ORDER.map(
  (slug) => diffusersByDefinition.find((d) => d.slug === slug)!,
);

export function getDiffuser(slug: string) {
  return diffusers.find((d) => d.slug === slug);
}

export function getRelatedOils() {
  return ["blanc-ritual", "shoreline", "grand-lobby", "the-arrival"];
}
