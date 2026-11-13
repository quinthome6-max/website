// What each product photo shows, for its alt text (plan T17). The gallery
// used to give every photo of a product the same text ("The Monolith – Gold
// – Quint Home"); search engines and screen readers get more from a line
// that says what is in the picture. Written from the photos themselves.

import { oils } from "./oils";

const PHOTOS: Record<string, string> = {
  // The Monolith, brushed gold
  "/images/diffusers/a326-gold/gold-v3-01.webp": "The Monolith in brushed gold on a bedside table, beside two books",
  "/images/diffusers/a326-gold/gold-v2-02.webp": "The Monolith in brushed gold on a side table by a bed with white cushions and a lit candle",
  "/images/diffusers/a326-gold/gold-v2-03.webp": "The Monolith in brushed gold on a wooden sideboard against a terracotta wall",
  "/images/diffusers/a326-gold/gold-v2-04.webp": "The Monolith in brushed gold misting on a side table as a woman stretches on the sofa",
  // The Monolith, matte black
  "/images/diffusers/a326-black/black-v2-01.webp": "The Monolith in matte black on a bedside table beside the bed",
  "/images/diffusers/a326-black/black-v2-02.webp": "The Monolith in matte black on a side table next to an armchair with a knitted throw",
  "/images/diffusers/a326-black/black-v2-03.webp": "The Monolith in matte black releasing a fine mist among plants against a terracotta wall",
  "/images/diffusers/a326-black/black-v2-04.webp": "The Monolith in matte black on a side table, with a woman standing by the window",
  // The Ember
  "/images/diffusers/clock-at370/ember-v2-01.webp": "The Ember with its clock glowing on a marble coffee table in a living room",
  "/images/diffusers/clock-at370/ember-v2-02.webp": "The Ember showing the time on a wooden console beside a coffee cup",
  "/images/diffusers/clock-at370/ember-v2-03.webp": "The Ember's LED clock and amber glow on a stone surface in afternoon light",
  "/images/diffusers/clock-at370/ember-v2-04.webp": "The Ember on a side table beside a bathtub with a view of a forest",
  // The Drift
  "/images/diffusers/drift-m22/01.webp": "The Drift misting in a car's cup holder, beside leather seats",
  "/images/diffusers/drift-m22/02.webp": "The Drift in the cup holder of a car's centre console",
  "/images/diffusers/drift-m22/03.webp": "The Drift on a windowsill beside a bathroom basin",
  "/images/diffusers/drift-m22/04.webp": "The Drift in matte black on a wooden shelf, releasing a fine mist",
  // The Pillar
  "/images/diffusers/dual-mist-at302/pillar-v2-01.webp": "The Pillar on a stone bedside table with a bowl and two books",
  "/images/diffusers/dual-mist-at302/pillar-v2-02.webp": "The Pillar misting on a ledge in a warm-lit corner",
  "/images/diffusers/dual-mist-at302/pillar-v2-03b.webp": "The Pillar on a low table as a woman reads in an armchair",
  "/images/diffusers/dual-mist-at302/pillar-v2-04b.webp": "The Pillar misting on a wooden stool beside a bathtub",
  // The Loom
  "/images/diffusers/fabric-a974/loom-v2-01.webp": "The Loom's fabric exterior and glowing base on a bedside table",
  "/images/diffusers/fabric-a974/loom-v2-02.webp": "The Loom on a stone plinth against a terracotta wall",
  "/images/diffusers/fabric-a974/loom-v2-03.webp": "The Loom misting on a bedside table among plants",
  "/images/diffusers/fabric-a974/loom-v2-04.webp": "The Loom on a console table as a woman walks past",
  // The Pebble
  "/images/diffusers/plug-in-a815/01.webp": "The Pebble plugged into a wall socket, showing its control panel",
  "/images/diffusers/plug-in-a815/02.webp": "The Pebble plug-in diffuser on a wall in a softly lit room",
  "/images/diffusers/plug-in-a815/03.webp": "The Pebble plug-in diffuser beside the words \"Designed to Transform\"",
  "/images/diffusers/plug-in-a815/04.webp": "The Pebble plugged into a wall beside a living-room sofa",
  "/images/diffusers/plug-in-a815/05.webp": "The Pebble plugged into a dark wall in a living room",
  // Candles
  "/images/candles/the-forest-01.webp": "The Forest soy wax candle, lit, in a green glass jar",
  "/images/candles/the-forest-02.webp": "The Forest candle lit beside dried eucalyptus stems",
  "/images/candles/the-forest-03.webp": "The Forest candle with its gold lid on, against green tiles and driftwood",
  "/images/candles/the-palace-01.webp": "The Palace soy wax candle in a blue jar with a gold lid, on a marble ledge",
  "/images/candles/the-palace-02.webp": "The Palace candle on a balcony ledge, with a palace in the distance",
  "/images/candles/the-palace-03.webp": "The Palace candle on a marble table in front of a gilded mirror",
  "/images/candles/the-palace-04.webp": "A hand lifting the gold lid off The Palace candle on a wooden stool",
  "/images/candles/the-study-01.webp": "The Study candle being lit with a match, beside dried flowers",
  "/images/candles/the-study-02.webp": "The Study soy wax candle in an amber jar, in a pool of light",
  "/images/candles/the-study-03.webp": "The Study candle, lit, on stacked stones",
  "/images/candles/the-study-04.webp": "The Study candle, lit, held in an open hand",
};

// Each oil's gallery is its bottle, then a card of its notes.
for (const o of oils) {
  PHOTOS[o.image] ??= `${o.name} fragrance oil, ${o.volumeML} ml bottle`;
  PHOTOS[`/images/oils/notes/${o.slug}.webp`] ??= `${o.name} scent notes: top, heart and base`;
}

/** The photo's own description, or the gallery's general one if it has none. */
export function photoAlt(src: string, fallback: string): string {
  return PHOTOS[src] ?? fallback;
}
