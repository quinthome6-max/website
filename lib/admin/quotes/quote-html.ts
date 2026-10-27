/**
 * A quotation as one self-contained HTML document, printed to PDF as it is.
 *
 * It follows the tax invoice (lib/admin/invoice-html.ts) so the two read as
 * one family: the same wordmark, ground, table head and summary band. Fonts
 * come from Google Fonts and product photos from the live site, so a PDF made
 * from it carries everything inside.
 */
import { LOGO_DATA_URI } from "@/lib/admin/invoice-html";
import { SUPPLIER } from "@/lib/admin/supplier";
import { amountInWords } from "@/lib/admin/words";
import { SITE } from "@/lib/seo";
import { calcQuote, formatINR as money } from "./calc";
import type { Quote } from "./types";

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

const DATE = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const day = (iso: string) => DATE.format(new Date(`${iso}T12:00:00+05:30`));

/** A small copy of the product photo, through the site's image optimiser. */
const thumb = (src: string) => `${SITE}/_next/image?url=${encodeURIComponent(src)}&w=128&q=75`;

/** "Quotation-QT-26-27-0007-Taj-Hotels", for the saved file and the tab. */
export function quoteFilename(q: Quote): string {
  const client = (q.client.company || q.client.contactName || "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
  return ["Quotation", q.number.replace(/\//g, "-"), client].filter(Boolean).join("-");
}

export function quoteHtml(q: Quote, opts: { autoPrint?: boolean; printHint?: boolean } = {}): string {
  const c = calcQuote(q);
  const inter = c.interState;
  const basis = q.pricesIncludeGst ? "incl. GST" : "excl. GST";
  const byId = new Map(c.lines.map((l) => [l.id, l]));

  const rows = q.lines
    .map((l, i) => {
      const r = byId.get(l.id)!;
      const name = [l.title, l.variant].filter(Boolean).map(esc).join(` <span class="variant">· `) + (l.variant ? "</span>" : "");
      return `<tr>
        <td class="idx">${i + 1}</td>
        <td><div class="itemcell">
          ${l.image ? `<img class="thumb" src="${esc(thumb(l.image))}" alt="" />` : `<span class="thumb blank"></span>`}
          <div><span class="item">${name}</span>${l.description ? `<span class="desc">${esc(l.description)}</span>` : ""}</div>
        </div></td>
        <td class="hsn">${esc(l.hsn || "—")}</td>
        <td class="num">${l.quantity.toLocaleString("en-IN")}</td>
        <td class="num">${money(l.unitPrice)}</td>
        <td class="num">${l.discountPercent > 0 ? `${l.discountPercent}%` : "—"}</td>
        <td class="num">${money(r.tax.taxable)}</td>
        <td class="num">${money(r.tax.gst)}<span class="rate">${l.gstRate}%</span></td>
        <td class="num strong">${money(r.tax.gross)}</td>
      </tr>`;
    })
    .join("");

  const taxRows = c.byRate
    .map((r) =>
      inter
        ? `<div><span>IGST @ ${r.rate}%</span><span>${money(r.igst)}</span></div>`
        : `<div><span>CGST @ ${r.rate / 2}%</span><span>${money(r.cgst)}</span></div>
           <div><span>SGST @ ${r.rate / 2}%</span><span>${money(r.sgst)}</span></div>`
    )
    .join("");

  const clientLines = [
    q.client.contactName && q.client.company ? q.client.contactName : "",
    ...q.client.address.split("\n"),
    [q.client.city, q.client.pin].filter(Boolean).join(" "),
    q.client.state,
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  const contact = [
    q.client.phone ? `<p>Phone: ${esc(q.client.phone)}</p>` : "",
    q.client.email ? `<p>Email: ${esc(q.client.email)}</p>` : "",
    q.client.gstin ? `<p class="gstin">GSTIN: ${esc(q.client.gstin)}</p>` : "",
  ].join("");

  const terms = q.terms.split("\n").map((t) => t.trim()).filter(Boolean);
  const supplierPlace = [SUPPLIER.city, SUPPLIER.state, SUPPLIER.pin].filter(Boolean).join(", ");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(quoteFilename(q))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  :root{
    --white:#ffffff; --stardust:#eee4d8; --stardust-soft:#f5efe6; --ivory:#faf8f3;
    --aerial:#77918d; --aerial-deep:#5a7370; --verdant:#293329;
    --clay:#b55423; --charcoal:#3a3532; --charcoal-soft:#6a625e;
    --rule:#e6dfd2; --rule-soft:#efe9dd;
  }
  *{box-sizing:border-box}
  body{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
       font-size:11.5px;line-height:1.5;color:var(--charcoal);margin:0;padding:28px 26px;
       background:var(--white);-webkit-font-smoothing:antialiased}
  .sheet{max-width:860px;margin:0 auto}
  .warn{background:var(--stardust-soft);border-left:2px solid var(--aerial);
        padding:10px 14px;margin-bottom:20px;font-size:11.5px}

  .masthead{display:flex;justify-content:space-between;align-items:center;gap:34px;
            background:var(--stardust-soft);border:1px solid var(--rule);padding:18px 24px}
  .brand{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
  .logo{height:52px;width:auto;display:block}
  .doctype{align-self:stretch;font-family:'Literata',Georgia,serif;font-size:24px;font-weight:400;letter-spacing:-0.01em;
           margin:0;padding-top:10px;border-top:1px solid var(--rule)}
  .doctype em{font-style:italic;color:var(--aerial-deep);font-size:15px;margin-left:8px}
  .supplier{text-align:right;font-size:10.5px;max-width:330px;line-height:1.6}
  .supplier .name{font-family:'Literata',Georgia,serif;font-weight:600;font-size:15px;margin:0 0 4px}
  .supplier p{margin:0;color:var(--charcoal-soft)}
  .supplier .gstin{margin-top:7px;font-weight:600;color:var(--charcoal);letter-spacing:.02em}

  .meta{display:grid;grid-template-columns:1.15fr .95fr .95fr 1fr 1.15fr 1fr;border:1px solid var(--rule);border-top:none}
  .meta div{padding:7px 12px;border-right:1px solid var(--rule)}
  .meta div:last-child{border-right:none}
  .meta dt{font-size:8px;white-space:nowrap;text-transform:uppercase;letter-spacing:.14em;color:var(--charcoal-soft);margin:0 0 3px;font-weight:500}
  .meta dd{margin:0;font-size:11px;font-weight:500;white-space:nowrap}

  .parties{display:flex;margin-top:14px;border:1px solid var(--rule)}
  .party{flex:1;padding:11px 16px;font-size:11px;line-height:1.5}
  .party + .party{border-left:1px solid var(--rule)}
  .party h3{font-size:8.5px;text-transform:uppercase;letter-spacing:.18em;color:var(--clay);margin:0 0 7px;font-weight:600}
  .party p{margin:0;color:var(--charcoal-soft);white-space:pre-line}
  .party .name{font-family:'Literata',Georgia,serif;font-weight:600;font-size:14px;color:var(--charcoal);margin-bottom:3px}
  .party .gstin{margin-top:6px;font-weight:600;color:var(--charcoal)}
  .party .cols{display:flex;gap:24px}
  .party .cols > div{flex:1}

  .message{margin:14px 0 0;padding:10px 16px;border-left:2px solid var(--clay);background:var(--ivory);
           font-family:'Literata',Georgia,serif;font-size:12.5px;line-height:1.55;white-space:pre-line}

  table{width:100%;border-collapse:collapse;margin-top:14px;font-size:10.5px}
  th{background:var(--verdant);color:var(--ivory);text-align:left;padding:9px 8px;font-size:8px;
     text-transform:uppercase;letter-spacing:.14em;font-weight:600}
  td{padding:7px 7px;border-bottom:1px solid var(--rule-soft);vertical-align:middle}
  tbody tr:nth-child(even){background:var(--ivory)}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .idx{color:var(--charcoal-soft);width:22px}
  .hsn{font-variant-numeric:tabular-nums;color:var(--charcoal-soft);font-size:10.5px}
  .strong{font-weight:600}
  .itemcell{display:flex;align-items:center;gap:11px}
  .thumb{width:32px;height:40px;object-fit:cover;border:1px solid var(--rule);background:var(--stardust-soft);flex-shrink:0}
  .thumb.blank{display:inline-block}
  .item{font-family:'Literata',Georgia,serif;font-size:12.5px;display:block}
  .variant{color:var(--charcoal-soft)}
  .desc{display:block;color:var(--charcoal-soft);font-size:10px;margin-top:1px}
  .rate{display:block;color:var(--charcoal-soft);font-size:9px}
  tfoot td{border-top:1.5px solid var(--charcoal);border-bottom:none;font-weight:600;background:var(--white)}

  .foot{display:flex;justify-content:space-between;align-items:flex-start;gap:30px;margin-top:16px}
  .left{max-width:410px}
  .left h4,.terms h4{font-size:8.5px;text-transform:uppercase;letter-spacing:.18em;color:var(--clay);margin:0 0 6px;font-weight:600}
  .inwords{margin:0;font-family:'Literata',Georgia,serif;font-size:12.5px;font-weight:500;line-height:1.55}
  .save{display:inline-block;margin-top:14px;background:var(--stardust-soft);border:1px solid var(--rule);
        padding:8px 12px;font-size:11.5px}
  .save strong{color:var(--clay)}
  .fine{margin:10px 0 0;font-size:10px;color:var(--charcoal-soft);line-height:1.6}
  .summary{width:310px;font-size:11.5px;flex-shrink:0}
  .summary div{display:flex;justify-content:space-between;padding:4.5px 12px;border-bottom:1px solid var(--rule-soft)}
  .summary .band{background:var(--stardust-soft)}
  .summary .sub{color:var(--charcoal-soft)}
  .summary .grand{background:var(--verdant);color:var(--ivory);border-bottom:none;padding:10px 12px;margin-top:6px;font-size:13.5px;font-weight:600}
  .summary .grand span:last-child{font-family:'Literata',Georgia,serif;font-size:18px}

  .terms{margin-top:18px;border-top:1px solid var(--rule);padding-top:12px}
  .terms ol{margin:0;padding-left:18px;font-size:10px;color:var(--charcoal-soft);line-height:1.6}

  footer{margin-top:16px;border-top:1px solid var(--rule);padding-top:12px;display:flex;justify-content:space-between;
         gap:26px;font-size:10.5px;color:var(--charcoal-soft)}
  footer strong{color:var(--charcoal);font-family:'Literata',Georgia,serif;font-size:12.5px;font-weight:600}
  .sign{text-align:right}
  .sign .line{margin-top:28px;border-top:1px solid var(--rule);padding-top:6px;min-width:200px}

  html,body,.masthead,th,.summary .grand,.summary .band,tbody tr:nth-child(even),.message,.save{
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
  @media print{
    body{padding:0}
    .noprint{display:none}
    thead{display:table-header-group}
    tr{break-inside:avoid}
    .masthead,.parties,.meta,.foot,.terms,footer{break-inside:avoid}
    @page{size:A4;margin:12mm 10mm}
  }
</style></head><body><div class="sheet">

${opts.printHint ? `<div class="warn noprint"><strong>Printing:</strong> choose <em>Save as PDF</em>, and tick
“Background graphics” so the colours are kept.</div>` : ""}

<div class="masthead">
  <div class="brand">
    <img class="logo" src="${LOGO_DATA_URI}" alt="Quint Home" />
    <p class="doctype">Quotation<em>for ${esc(q.client.company || q.client.contactName || "you")}</em></p>
  </div>
  <div class="supplier">
    <p class="name">Quint Home</p>
    <p>${esc(SUPPLIER.legalName)} · ${esc(supplierPlace)}</p>
    <p>${esc(SUPPLIER.phone)} · ${esc(SUPPLIER.email)}</p>
    <p class="gstin">GSTIN ${esc(SUPPLIER.gstin)}</p>
  </div>
</div>

<div class="meta">
  <div><dt>Quotation No.</dt><dd>${esc(q.number)}</dd></div>
  <div><dt>Date</dt><dd>${esc(day(q.date))}</dd></div>
  <div><dt>Valid until</dt><dd>${esc(day(q.validUntil))}</dd></div>
  <div><dt>Place of supply</dt><dd>${esc(c.placeOfSupply)}</dd></div>
  <div><dt>Supply type</dt><dd>${inter ? "Inter-state · IGST" : "Intra-state · CGST + SGST"}</dd></div>
  <div><dt>Prices</dt><dd>${q.pricesIncludeGst ? "Inclusive of GST" : "Exclusive of GST"}</dd></div>
</div>

<div class="parties">
  <div class="party">
    <h3>Prepared for</h3>
    <p class="name">${esc(q.client.company || q.client.contactName || "—")}</p>
    ${q.deliverTo
      ? `${clientLines.map((l) => `<p>${esc(l)}</p>`).join("")}${contact}`
      : `<div class="cols"><div>${clientLines.map((l) => `<p>${esc(l)}</p>`).join("")}</div><div>${contact}</div></div>`}
  </div>
  ${q.deliverTo ? `<div class="party"><h3>Deliver to</h3><p>${esc(q.deliverTo)}</p></div>` : ""}
</div>

${q.message ? `<p class="message">${esc(q.message)}</p>` : ""}

<table>
  <thead><tr>
    <th>#</th><th>Item</th><th>HSN</th><th class="num">Qty</th><th class="num">Unit price<br/>${basis}</th>
    <th class="num">Disc.</th><th class="num">Taxable value</th><th class="num">GST</th><th class="num">Amount</th>
  </tr></thead>
  <tbody>${rows || `<tr><td colspan="9" style="text-align:center;color:var(--charcoal-soft)">No items yet</td></tr>`}</tbody>
  <tfoot><tr>
    <td></td><td>Total · ${c.units.toLocaleString("en-IN")} unit${c.units === 1 ? "" : "s"}</td><td></td><td></td><td></td><td></td>
    <td class="num">${money(c.lines.reduce((t, l) => t + l.tax.taxable, 0))}</td>
    <td class="num">${money(c.lines.reduce((t, l) => t + l.tax.gst, 0))}</td>
    <td class="num">${money(c.lines.reduce((t, l) => t + l.tax.gross, 0))}</td>
  </tr></tfoot>
</table>

<div class="foot">
  <div class="left">
    <h4>Amount in words</h4>
    <p class="inwords">${esc(amountInWords(c.grandTotal).toUpperCase())}</p>
    ${c.savings > 0 ? `<p class="save">Your saving on this order: <strong>${money(c.savings)}</strong></p>` : ""}
    <p class="fine">Amounts in Indian Rupees. Unit prices are ${q.pricesIncludeGst ? "inclusive" : "exclusive"} of GST;
      GST is shown ${q.pricesIncludeGst ? "as contained in each line" : "added on each line"}.</p>
  </div>
  <div class="summary">
    <div><span>Subtotal (${basis})</span><span>${money(c.subtotal)}</span></div>
    ${c.lineDiscounts > 0 ? `<div class="band"><span>Item discounts</span><span>−${money(c.lineDiscounts)}</span></div>` : ""}
    ${c.extraDiscount > 0 ? `<div class="band"><span>Additional discount${q.extraDiscount.type === "percent" ? ` (${q.extraDiscount.value}%)` : ""}</span><span>−${money(c.extraDiscount)}</span></div>` : ""}
    ${c.delivery ? `<div class="sub"><span>Delivery (${basis})</span><span>${money(q.delivery)}</span></div>` : ""}
    <div><span>Taxable value</span><span>${money(c.taxable)}</span></div>
    ${taxRows}
    <div class="band"><span>Total GST</span><span>${money(c.gst)}</span></div>
    ${c.roundOff !== 0 ? `<div class="sub"><span>Round off</span><span>${c.roundOff > 0 ? "+" : "−"}${money(Math.abs(c.roundOff))}</span></div>` : ""}
    <div class="grand"><span>Grand total</span><span>${money(c.grandTotal, 0)}</span></div>
  </div>
</div>

${terms.length ? `<div class="terms"><h4>Terms &amp; conditions</h4><ol>${terms.map((t) => `<li>${esc(t)}</li>`).join("")}</ol></div>` : ""}

<footer>
  <div><strong>Thank you for considering Quint Home.</strong><br />
    Questions about this quotation: ${esc(SUPPLIER.email)} · ${esc(SUPPLIER.phone)} · www.quinthome.in<br />
    This is a quotation, not a tax invoice. A GST invoice is issued with the order.</div>
  <div class="sign">For ${esc(SUPPLIER.legalName)}<div class="line">Authorised signatory</div></div>
</footer>

${opts.autoPrint ? `<script>window.addEventListener("load", function () { setTimeout(function(){ window.print(); }, 300); });</script>` : ""}
</div></body></html>`;
}
