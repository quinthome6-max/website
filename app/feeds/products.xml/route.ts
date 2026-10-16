// Product feed in Google Merchant Center's format (RSS 2.0 with the g:
// namespace), at /feeds/products.xml. Also accepted by other shopping
// surfaces that take a Google-format feed, ChatGPT's merchant programme among
// them.
//
// Built from the same catalogue data and Shopify prices the product pages
// render, so the feed can never advertise a price or stock state the site
// does not. Shipping mirrors /shipping. No GTINs: the products have none, and
// diffusers carry their manufacturer model number as the MPN instead.

import { diffusers } from "@/lib/data/diffusers";
import { oils } from "@/lib/data/oils";
import { candles } from "@/lib/data/candles";
import { getCommerceByName, type ShopifyCommerce } from "@/lib/shopify/commerce";
import { numericId } from "@/lib/shopify/admin";
import { FREE_SHIPPING_FROM, SHIPPING_FLAT } from "@/lib/checkout-config";
import { BRAND, abs } from "@/lib/seo";
import type { Candle, Diffuser, FragranceOil } from "@/lib/types";

export const revalidate = 3600;

const esc = (s: string): string =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

const money = (n: number) => `${n.toFixed(2)} INR`;

interface FeedItem {
  id: string;
  groupId?: string;
  title: string;
  description: string;
  link: string;
  image: string;
  extraImages: string[];
  available: boolean;
  price: number;
  compareAt?: number;
  productType: string;
  mpn?: string;
  color?: string;
}

function item(i: FeedItem): string {
  const tags: [string, string][] = [
    ["g:id", i.id],
    ...(i.groupId ? ([["g:item_group_id", i.groupId]] as [string, string][]) : []),
    ["g:title", i.title.slice(0, 150)],
    ["g:description", i.description.slice(0, 5000)],
    ["g:link", i.link],
    ["g:image_link", i.image],
    ...i.extraImages.slice(0, 10).map((u) => ["g:additional_image_link", u] as [string, string]),
    ["g:availability", i.available ? "in_stock" : "out_of_stock"],
    // A genuine Shopify compare-at becomes the regular price with the selling
    // price as the sale price; otherwise the selling price stands alone.
    ...(i.compareAt && i.compareAt > i.price
      ? ([["g:price", money(i.compareAt)], ["g:sale_price", money(i.price)]] as [string, string][])
      : ([["g:price", money(i.price)]] as [string, string][])),
    ["g:brand", BRAND],
    ["g:condition", "new"],
    ...(i.mpn ? ([["g:mpn", i.mpn]] as [string, string][]) : ([["g:identifier_exists", "no"]] as [string, string][])),
    ["g:product_type", i.productType],
    ...(i.color ? ([["g:color", i.color]] as [string, string][]) : []),
  ];
  const shipping = `<g:shipping><g:country>IN</g:country><g:service>Standard</g:service><g:price>${money(
    i.price >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FLAT
  )}</g:price><g:min_handling_time>0</g:min_handling_time><g:max_handling_time>3</g:max_handling_time><g:min_transit_time>3</g:min_transit_time><g:max_transit_time>5</g:max_transit_time></g:shipping>`;
  return `<item>${tags.map(([k, v]) => `<${k}>${esc(v)}</${k}>`).join("")}${shipping}</item>`;
}

const firstParagraph = (s: string) => s.split("\n\n")[0].trim();

function paidVariants(c: ShopifyCommerce | undefined) {
  return (c?.variants ?? []).filter((v) => v.price > 0);
}

async function diffuserItems(d: Diffuser): Promise<FeedItem[]> {
  const c = await getCommerceByName(d.name);
  const paid = paidVariants(c);
  const base = {
    title: d.coverageLabel.startsWith("Cars")
      ? `${d.name} Waterless Car & Bathroom Diffuser`
      : `${d.name} Waterless Aroma Diffuser`,
    description: firstParagraph(d.description),
    link: abs(`/range/${d.slug}`),
    productType: "Home Fragrance > Waterless Diffusers",
    mpn: d.model,
  };
  if (paid.length > 1) {
    return paid.map((v) => {
      const color = d.colors?.find((x) => v.title.toLowerCase().includes(x.name.toLowerCase()));
      return {
        ...base,
        id: String(numericId(v.id) ?? v.id),
        groupId: d.slug,
        title: `${base.title} — ${v.title}`,
        image: abs(color?.image ?? d.image),
        extraImages: (color?.gallery ?? d.gallery).map(abs),
        available: v.available,
        price: v.price,
        compareAt: v.compareAt,
        color: color?.name ?? v.title,
      };
    });
  }
  const v = paid[0];
  return [{
    ...base,
    id: v ? String(numericId(v.id) ?? v.id) : d.slug,
    image: abs(d.image),
    extraImages: d.gallery.map(abs),
    available: c?.available ?? true,
    price: v?.price ?? d.priceINR,
    compareAt: v?.compareAt,
    color: d.finish,
  }];
}

async function simpleItem(
  p: FragranceOil | Candle,
  title: string,
  productType: string,
  gallery: string[]
): Promise<FeedItem> {
  const c = await getCommerceByName(p.name);
  const v = paidVariants(c)[0];
  return {
    id: v ? String(numericId(v.id) ?? v.id) : p.slug,
    title,
    description: firstParagraph(p.description),
    link: abs(`/range/${p.slug}`),
    image: abs(p.image),
    extraImages: gallery.map(abs),
    available: c?.available ?? true,
    price: v?.price ?? p.priceINR,
    compareAt: v?.compareAt,
    productType,
  };
}

export async function GET(): Promise<Response> {
  const items: FeedItem[] = [];
  for (const d of diffusers) items.push(...(await diffuserItems(d)));
  for (const o of oils) {
    items.push(await simpleItem(o, `${o.name} Fragrance Oil for Diffusers, ${o.volumeML} ml`, "Home Fragrance > Fragrance Oils", []));
  }
  for (const k of candles) {
    items.push(await simpleItem(k, `${k.name} Soy Wax Scented Candle, ${k.notesLine}, ${k.volumeML} ml`, "Home Fragrance > Scented Candles", k.gallery));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${esc(BRAND)} products</title>
<link>${abs("/range")}</link>
<description>Waterless aroma diffusers, fragrance oils and soy candles from ${esc(BRAND)}, Mumbai.</description>
${items.map(item).join("\n")}
</channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
