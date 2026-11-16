// JPEG copies of each product's main photo, in public/images/products/
// (one per product slug, plus "<slug>-<finish>" for each finish). They are
// what share previews, structured data, Google Shopping and AI assistants are
// pointed at first: WebP, which the gallery uses, isn't shown everywhere
// (some WhatsApp versions and AI chat tools skip it). Regenerate a file when
// a product's main photo changes, under a new name if the photo is replaced.

export function productJpeg(slug: string, finish?: string): string {
  return `/images/products/${finish ? `${slug}-${finish.toLowerCase()}` : slug}.jpg`;
}
