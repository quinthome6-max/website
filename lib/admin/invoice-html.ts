import type { Invoice, InvoiceCustomer } from "./orders";
import { SUPPLIER, supplierAddressLines, supplierGaps } from "./supplier";
import { amountInWords } from "./words";
import { giftDisplayTitle } from "@/lib/cart-gift";

/**
 * Renders a tax invoice as self-contained HTML — no external CSS or fonts, so
 * it prints identically from a browser and converts to PDF unchanged.
 *
 * Laid out to match the invoice the store already issues, so the switch is
 * invisible to customers and to whoever files the returns.
 */

/**
 * The wordmark, inlined as a data URI.
 *
 * The invoice is a single self-contained file — it is served from a route,
 * printed to PDF, and may be saved or emailed on. A <img src="/images/..."> in
 * any of those places renders as a broken icon once the file leaves the site,
 * so the mark travels inside the document.
 */
export const LOGO_DATA_URI =
  "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjM2EzNTMyIiBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjIzNyAxMTE1IDI1MjYgOTMzIj4gPGc+IDxwYXRoIGQ9Ik03MjIuNzYsMTU4MC44OWMyNy44NS0zMS42Myw0Ny4yLTY3LjU2LDU3Ljk3LTEwNy45NCwxMC44NS00MC4zLDEwLjQzLTgxLjg2LTEuMTctMTI0LjY5LTE2LjY2LTU0Ljk0LTQ3LjU0LTk5LjE5LTkyLjYzLTEzMi44NS00NS4xOC0zMy43NC05NS41Ny01MC41Ni0xNTEuMjctNTAuNTYtMjEuNjIsMC00My40MSwyLjk0LTY1LjQ1LDguNzUtNjYuMTMsMjAuNzgtMTE1Ljk0LDYwLjE2LTE0OS40MiwxMTguMjEtMzMuNDksNTcuOTctNDIuMDcsMTIxLjc0LTI1LjkxLDE5MS4xNSwxNC45OCw1My4yNiw0NS42LDk2LjkyLDkxLjcxLDEzMSw0Ni4xOSwzNC4wNyw5OC42MSw1MS4xNSwxNTcuMTYsNTEuMTUsMjAuMDIsMCw0MC4zOS0yLjM2LDYxLjE3LTYuOSwyNC40OC03LjkxLDQ2Ljk1LTE4LjY4LDY3LjMxLTMyLjM5LDEwLjQzLDEyLjQ1LDE5LjM1LDI1Ljc0LDI2Ljg0LDM5Ljg4aDg3LjMzYy0xNS40LTMyLjgxLTM2LjYtNjEuMTctNjMuNjEtODQuODFaTTU1OS4zNywxNjQwLjcxYy0yMi40NiwwLTQ0LTUuMy02NC42MS0xNS45LTIwLjUzLTEwLjYtMzkuMTItMjQuODItNTUuNzgtNDIuNjYsMjYuMTYtMjQuMTUsNTYuMzctMzYuMTgsOTAuNDQtMzYuMTgsMjIuNDYsMCw0NC4wOCw1LjMsNjQuODcsMTUuOSwyMC43OCwxMC42LDM5Ljg4LDI0LjQsNTcuMzgsNDEuNDgtMjcuMDEsMjQuOS01Ny44LDM3LjM2LTkyLjMsMzcuMzZaTTY4Ny44NCwxNTU1LjMyYy00MS4xNC0yNC45OS04NS4yMy0zNy40NC0xMzIuMjYtMzcuNDRzLTkzLjEzLDEzLjk3LTEzNS45Niw0MS44MWMtMjIuNDYtMjkuOTUtMzguMjgtNjIuMTgtNDcuMzctOTYuNjctOS4xNy0zNi4xOC0xMS45NS03Mi44Ni04LjQxLTExMC4xMywzLjUzLTM3LjE5LDE0LjU1LTcwLDMzLjA3LTk4LjUyLDE4LjQyLTI4LjQ0LDQ1LjYtNDcuNyw4MS4zNi01Ny43MiwxMC4zNS0yLjQ0LDIwLjc4LTMuNywzMS4yMS0zLjcsMjkuNDUsMCw1Ny41NSw4LjgzLDg0LjEzLDI2LjUsMjYuNjcsMTcuNjcsNDkuNDcsMzkuOCw2OC42NSw2Ni4zOCwxOS4wOSwyNi42NywzMi42NCw1NC4yNyw0MC41NSw4Mi45NiwxNyw2NC40NSwxMi4wMywxMjYuNjItMTQuOTgsMTg2LjUzWiIvPiA8cGF0aCBkPSJNMTM0MC41NiwxMTczLjE1Yy04Ljc3LDExLjI1LTE0LjU2LDI1LjQtMTQuNTYsNDAuNzlsLS4xNywxMS4zNGMtLjE3LDIuNzMtLjI1LDUuNjMtLjMzLDguNjF2MjM5Ljg2YzAsMTMwLjQtNjEuNDgsMTk2LjQyLTE4NC41OSwxOTguMDgtNzguMTEsMC0xMzEuMzktMjcuMDYtMTU5Ljc3LTgxLjE3LTEyLTIzLTE3LjIxLTQ4LjktMTcuMjEtNzQuNzF2LTI2Ni4wOWwtLjUtMzUuOTFjMC0xNS4zOS01Ljc5LTI5LjU0LTE0LjU2LTQwLjc5aDEwMS42Yy04Ljc3LDExLjI1LTE0LjU2LDI1LjQtMTQuNTYsNDAuNzlsLS41LDM1djIxMi40OGMwLDU4LjA4LDkuNTIsMTAxLjk0LDI4LjU1LDEzMS42NCwxOC45NSwyOS42Miw0OS41Niw0NC40Myw5MS42Nyw0NC40M3M3My43Mi0xNC4zMSw5Ny4yMi00Mi45NGMyMy41LTI4LjYzLDM1LjI1LTcxLjE2LDM1LjI1LTEyNy41OHYtMjE3LjExbC0uMjUtMTUuNDctLjI1LTIwLjQ0YzAtMTUuMzktNS43OS0yOS41NC0xNC41Ni00MC43OWg2Ny41MloiLz4gPGc+IDxwYXRoIGQ9Ik0xNjE3LjMxLDEyMTMuOTRjMC0xNS4zOSw1Ljc5LTI5LjU0LDE0LjU2LTQwLjc5aC0xMDEuNmM4Ljg1LDExLjI1LDE0LjU2LDI1LjQsMTQuNTYsNDAuNzl2NDEwLjk3YzAsMTUuMzktNS43MSwyOS41NC0xNC41Niw0MC43OWgxMDEuNmMtOC43Ny0xMS4yNS0xNC41Ni0yNS40LTE0LjU2LTQwLjc5di00MTAuOTdaIi8+IDxwYXRoIGQ9Ik0yMTk5Ljc1LDExNzMuMTVoLTY2Ljg1YzkuMDIsMTEuNDIsMTQuODEsMjUuODEsMTQuODEsNDEuMzdsLjA4LDQwMS41NC0yMjIuNTctNDQyLjkxaC05NC45OWM4Ljg1LDExLjI1LDE0LjU2LDI1LjQsMTQuNTYsNDAuNzl2NDEwLjk3YzAsMTUuMzktNS43MSwyOS41NC0xNC41Niw0MC43OWg2NS44NmMtOC44NS0xMS4yNS0xNC40OC0yNS40LTE0LjQ4LTQwLjc5di0zNzguNzhsMjEwLjk5LDQxOS41N2g5Mi41OXMuMjUtNDQzLjUuNS00NTkuOTJjMS42OS0xMi4xOCw2Ljc2LTIzLjM5LDE0LjA2LTMyLjYzWiIvPiA8cGF0aCBkPSJNMjcxMy4wNSwxMTczLjE1aC0zNzMuODJ2NDQuNTdjMTEuMTItOC42NywyNS4wNy0xNC40LDQwLjI1LTE0LjU0aDEwOS41MWMuNTgsMy40Ny45MSw3LjEyLjkxLDEwLjc2djQxMC45N2MwLDE1LjM5LTUuNzEsMjkuNTQtMTQuNTYsNDAuNzloMTAxLjYxYy04Ljc3LTExLjI1LTE0LjU2LTI1LjQtMTQuNTYtNDAuNzl2LTQxMC45N2MwLTMuNjQuMzMtNy4yOC45OS0xMC43Nmg3Mi45OGM5LjQ4LDAsMjguMTkuMzQsNDQuNzYuNjksMTEuOTIsMS43NCwyMi44NCw2LjgxLDMxLjg4LDEzLjg1di0xMy4xM3MuMDYsMCwuMDYsMHYtMzEuNDRaIi8+IDwvZz4gPC9nPiA8Zz4gPHBhdGggZD0iTTEwOTEuMTcsMTgyOC45MmgyNy4xM3MwLDE2NC41NywwLDE2NC41N2gtMjcuMTNzMC0xNjQuNTcsMC0xNjQuNTdaTTExMDQuNDcsMTg5Ny44NmgxMDIuOTRzMCwyNC40MSwwLDI0LjQxaC0xMDIuOTRzMC0yNC40MSwwLTI0LjQxWk0xMTk2LjI0LDE4MjguOTJoMjcuMzlzMCwxNjQuNTcsMCwxNjQuNTdoLTI3LjM5czAtMTY0LjU3LDAtMTY0LjU3WiIvPiA8cGF0aCBkPSJNMTMxNS45MywxOTc1LjI0Yy0xMy4zLTE1LjM1LTE5Ljk1LTM2LjY5LTE5Ljk1LTY0LjAzLDAtMjcuMzQsNi42OS00OC43OCwyMC4wOC02NC4yOSwxMy4zOS0xNS41MiwzMS4zNC0yMy4yNyw1My44Ny0yMy4yNywyMS4xLDAsMzguNjUsNy44OCw1Mi42NywyMy42NSwxNC4wMSwxNS43NywyMS4wMSwzNy4wNywyMS4wMSw2My45MSwwLDI3LjM0LTYuNjEsNDguNjgtMTkuODIsNjQuMDMtMTMuMjEsMTUuMzUtMzEuMTYsMjMuMDMtNTMuODYsMjMuMDMtMjIuNywwLTQwLjctNy42Ny01NC0yMy4wM1pNMTMzNS43NSwxODY1LjE1Yy04LjI1LDExLjA3LTEyLjM3LDI2LjQyLTEyLjM3LDQ2LjA1LDAsMTkuNjIsNC4xMiwzNC44NSwxMi4zNyw0NS42Nyw4LjI1LDEwLjgyLDE5LjY0LDE2LjIzLDM0LjE4LDE2LjIzLDE0LjUzLDAsMjUuODktNS40MSwzNC4wNC0xNi4yMyw4LjE2LTEwLjgyLDEyLjIzLTI2LjA0LDEyLjIzLTQ1LjY3LDAtMTkuNjMtNC4wOC0zNC45OC0xMi4yMy00Ni4wNS04LjE2LTExLjA3LTE5LjUxLTE2LjYxLTM0LjA0LTE2LjYxLTE0LjU1LDAtMjUuOTQsNS41My0zNC4xOCwxNi42MVoiLz4gPHBhdGggZD0iTTE2MTUuNywxOTU3LjVsNTYuOTMtMTI4LjU4aDM1LjkxczAsMTY0LjU3LDAsMTY0LjU3aC0yNi4wN3MwLTEyNS4zMSwwLTEyNS4zMWwtNTMuNzMsMTI1LjMxaC0zMi45OHMtNTIuNjctMTI1LjMxLTUyLjY3LTEyNS4zMXYxMjUuMzFzLTI3LjEzLDAtMjcuMTMsMHYtMTY0LjU3czM3LjI0LDAsMzcuMjQsMGw1NS42LDEyOC41OCwzLjE5LDExLjA3LDMuNzItMTEuMDdaIi8+IDxwYXRoIGQ9Ik0xNzg1LjE0LDE4MjguOTJoMTIzLjY5czAsMjQuMTYsMCwyNC4xNmgtOTYuNTZzMCw0Ni4wNCwwLDQ2LjA0aDkyLjU3czAsMjQuNDEsMCwyNC40MWgtOTIuNTdzMCw0NS41NCwwLDQ1LjU0aDk2LjU2czAsMjQuNDEsMCwyNC40MWgtMTIzLjY5czAtMTY0LjU3LDAtMTY0LjU3WiIvPiA8L2c+IDwvc3ZnPg==";

/**
 * Name for the saved file, used both as the document title and as the
 * Content-Disposition filename.
 *
 * Browsers seed the "Save as PDF" filename from the document title, so this is
 * what turns a folder of "Tax-Invoice.pdf" into something identifiable without
 * opening each one. Punctuation in a customer's name is stripped rather than
 * escaped, because a slash or a colon breaks the download on some platforms.
 */
export function invoiceFilename(inv: Invoice): string {
  // NFC, not NFKD: decomposing splits Devanagari and other Indic scripts into
  // base letters plus combining marks, and the mark class is not \p{L}, so a
  // name like "राज कुमार" would lose its vowel signs. Composed form keeps each
  // character whole, and the class filter still removes anything — a slash, a
  // colon — that breaks a download on some platforms.
  const customer = (inv.billTo.name || inv.customer.name || "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
  return ["Tax-Invoice", inv.invoiceNumber, customer].filter(Boolean).join("-");
}

const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

/** ₹ with two decimals and Indian grouping — invoices show paise. */
const money = (n: number): string =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DATE_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit", month: "short", year: "numeric",
  timeZone: "Asia/Kolkata",
});

function partyBlock(title: string, c: InvoiceCustomer): string {
  const lines = [
    ...c.addressLines,
    [c.city, c.zip].filter(Boolean).join(", "),
    [c.province, c.country].filter(Boolean).join(", "),
  ].filter(Boolean);
  return `<div class="party">
    <h3>${esc(title)}</h3>
    <p class="name">${esc(c.name)}</p>
    ${lines.map((l) => `<p>${esc(l)}</p>`).join("")}
    ${c.phone ? `<p>Phone: ${esc(c.phone)}</p>` : ""}
    ${c.email ? `<p>Email: ${esc(c.email)}</p>` : ""}
    ${c.gstin ? `<p class="gstin">GSTIN: ${esc(c.gstin)}</p>` : ""}
  </div>`;
}

export function invoiceHtml(inv: Invoice, opts: { autoPrint?: boolean } = {}): string {
  const gaps = supplierGaps();
  const inter = inv.interState;

  // Only the columns that apply: CGST+SGST inside the state, IGST outside.
  const taxHeads = inter
    ? `<th class="num">IGST</th>`
    : `<th class="num">CGST</th><th class="num">SGST</th>`;

  const rows = inv.lines
    .map((l) => {
      // A ₹0 line is the complimentary bottle. Labelling it says plainly why
      // the row is free, which is what a courier claim or an assessing officer
      // needs to see — a bare zero looks like an error.
      const isGift = l.tax.gross === 0;
      // The gift ships from a duplicate product called "Terrain Free"; the
      // customer chose Terrain, and the Complimentary badge beside it already
      // says the rest.
      const shown = isGift ? giftDisplayTitle(l.title) : l.title;
      const name = l.variantTitle && l.variantTitle !== "Default Title"
        ? `<span class="item">${esc(shown)} <span class="variant">· ${esc(l.variantTitle)}</span></span>`
        : `<span class="item">${esc(shown)}</span>`;
      const taxCells = inter
        ? `<td class="num">${money(l.tax.igst)}</td>`
        : `<td class="num">${money(l.tax.cgst)}</td><td class="num">${money(l.tax.sgst)}</td>`;
      return `<tr>
        <td>${name}${l.unclassified ? ` <span class="flag">HSN unconfirmed</span>` : ""}${
          isGift ? ` <span class="gift">Complimentary</span>` : ""
        }</td>
        <td class="hsn">${esc(l.hsn)}</td>
        <td class="num">${l.quantity}</td>
        <td class="num">${money(isGift ? l.listPrice : l.unitPrice)}</td>
        <td class="num">${money(l.tax.taxable)}</td>
        <td class="num">${isGift ? "—" : `${l.tax.ratePercent}%`}</td>
        ${taxCells}
        <td class="num">${l.discount > 0 ? "−" + money(l.discount) : money(0)}</td>
        <td class="num strong">${isGift ? "Free" : money(l.tax.gross)}</td>
      </tr>`;
    })
    .join("");

  const shippingRow = inv.shipping
    ? `<tr>
        <td>Shipping</td><td class="hsn">—</td><td class="num">1</td>
        <td class="num">${money(inv.shipping.gross)}</td>
        <td class="num">${money(inv.shipping.taxable)}</td>
        <td class="num">${inv.shipping.ratePercent}%</td>
        ${inter
          ? `<td class="num">${money(inv.shipping.igst)}</td>`
          : `<td class="num">${money(inv.shipping.cgst)}</td><td class="num">${money(inv.shipping.sgst)}</td>`}
        <td class="num">${money(0)}</td>
        <td class="num strong">${money(inv.shipping.gross)}</td>
      </tr>`
    : "";

  const totalTaxCells = inter
    ? `<td class="num">${money(inv.totals.igst)}</td>`
    : `<td class="num">${money(inv.totals.cgst)}</td><td class="num">${money(inv.totals.sgst)}</td>`;

  const qty = inv.lines.reduce((t, l) => t + l.quantity, 0);

  // Tax grouped by rate (candles are 5%, everything else 18%), so a mixed
  // order shows each rate rather than one label over the lot.
  const rateMap = new Map<number, { rate: number; cgst: number; sgst: number; igst: number }>();
  for (const t of [...inv.lines.map((l) => l.tax), ...(inv.shipping ? [inv.shipping] : [])]) {
    if (t.gst === 0) continue;
    const r = rateMap.get(t.ratePercent) ?? { rate: t.ratePercent, cgst: 0, sgst: 0, igst: 0 };
    r.cgst += t.cgst;
    r.sgst += t.sgst;
    r.igst += t.igst;
    rateMap.set(t.ratePercent, r);
  }
  const taxByRate = [...rateMap.values()].sort((a, b) => b.rate - a.rate);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>${esc(invoiceFilename(inv))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
  /* Brand tokens, copied from app/globals.css rather than imported: this file
     is served standalone and printed, so it cannot rely on the site's
     stylesheet being present. */
  :root{
    --white:#ffffff; --stardust:#eee4d8; --stardust-soft:#f5efe6; --ivory:#faf8f3;
    --aerial:#77918d; --aerial-deep:#5a7370; --verdant:#293329;
    --clay:#c15a27; --clay-deep:#6a2e0c;
    --charcoal:#3a3532; --charcoal-soft:#6a625e;
    --rule:#e6dfd2; --rule-soft:#efe9dd;
  }
  *{box-sizing:border-box}
  body{font-family:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
       font-size:12.5px;line-height:1.55;color:var(--charcoal);margin:0;padding:34px 30px;
       background:var(--white);-webkit-font-smoothing:antialiased}
  .sheet{max-width:860px;margin:0 auto}
  .serif{font-family:'Literata',Georgia,'Times New Roman',serif}

  .printhint{border-left-color:var(--aerial)}
  .warn{background:var(--stardust-soft);border-left:2px solid var(--clay);
        padding:10px 14px;margin-bottom:20px;font-size:11.5px;color:var(--charcoal)}

  /* Masthead — the wordmark leads, on the warm ground the site uses. */
  .masthead{display:flex;justify-content:space-between;align-items:center;gap:34px;
            background:var(--stardust-soft);border:1px solid var(--rule);
            padding:24px 28px}
  .brand{display:flex;flex-direction:column;gap:14px}
  /* viewBox cropped to the artwork's measured bounds (getBBox), so the mark
     fills its box instead of floating in the source file's 3000x3000 canvas.
     Height is fixed and width follows the 2.9:1 ratio. */
  .logo{height:62px;width:auto;display:block}
  .doctype{font-family:'Literata',Georgia,serif;font-size:23px;font-weight:400;
           letter-spacing:-0.01em;margin:0;color:var(--charcoal);
           padding-top:13px;border-top:1px solid var(--rule)}
  .supplier{text-align:right;font-size:11.5px;max-width:290px;line-height:1.65}
  .supplier .name{font-family:'Literata',Georgia,serif;font-weight:600;font-size:15px;
                  margin:0 0 5px;color:var(--charcoal)}
  .supplier p{margin:0;color:var(--charcoal-soft)}
  .supplier .gstin{margin-top:8px;font-weight:600;color:var(--charcoal);
                   letter-spacing:.02em}

  /* Meta strip */
  .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:0;
        border:1px solid var(--rule);border-top:none}
  .meta div{padding:11px 14px;border-right:1px solid var(--rule)}
  .meta div:nth-child(3n){border-right:none}
  .meta dt{font-size:8.5px;text-transform:uppercase;letter-spacing:.18em;
           color:var(--charcoal-soft);margin:0 0 3px;font-weight:500}
  .meta dd{margin:0;font-size:12px;color:var(--charcoal);font-weight:500}

  .parties{display:flex;gap:0;margin-top:22px;border:1px solid var(--rule)}
  .party{flex:1;padding:16px 18px;font-size:11.5px;line-height:1.6}
  .party + .party{border-left:1px solid var(--rule)}
  .party h3{font-size:8.5px;text-transform:uppercase;letter-spacing:.18em;
            color:var(--clay);margin:0 0 7px;font-weight:600}
  .party p{margin:0;color:var(--charcoal-soft)}
  .party .name{font-family:'Literata',Georgia,serif;font-weight:600;font-size:13.5px;
               color:var(--charcoal);margin-bottom:4px}
  .party .gstin{margin-top:6px;font-weight:600;color:var(--charcoal)}

  table{width:100%;border-collapse:collapse;margin-top:22px;font-size:11.5px}
  th{background:var(--verdant);color:var(--ivory);text-align:left;padding:10px 9px;
     font-size:8.5px;text-transform:uppercase;letter-spacing:.14em;font-weight:600}
  td{padding:11px 9px;border-bottom:1px solid var(--rule-soft);vertical-align:top}
  tbody tr:nth-child(even){background:var(--ivory)}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .hsn{font-variant-numeric:tabular-nums;color:var(--charcoal-soft);letter-spacing:.02em}
  .strong{font-weight:600}
  .item{font-family:'Literata',Georgia,serif;font-size:13px;color:var(--charcoal)}
  .variant{color:var(--charcoal-soft);font-weight:400}
  .flag{background:var(--clay);color:var(--ivory);font-size:8.5px;padding:2px 6px;
        letter-spacing:.08em;text-transform:uppercase}
  .gift{display:inline-block;margin-left:6px;color:var(--clay);font-size:8.5px;
        letter-spacing:.14em;text-transform:uppercase;font-weight:600;
        vertical-align:1px}
  tfoot td{border-bottom:none;border-top:1.5px solid var(--charcoal);font-weight:600;
           padding-top:11px;background:var(--white)}

  .tablewrap{position:relative}
  .paid{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);
        font-family:'Literata',Georgia,serif;font-size:82px;font-weight:600;
        letter-spacing:.16em;color:var(--clay);opacity:.13;pointer-events:none;z-index:2;
        border:4px solid var(--clay);border-radius:8px;padding:6px 26px}
  .tablewrap table{position:relative;z-index:1;background:transparent}
  .tablewrap tbody tr:nth-child(even){background:rgba(250,248,243,.72)}

  .foot{display:flex;justify-content:space-between;align-items:flex-start;
        gap:36px;margin-top:24px}
  .summary{width:320px;font-size:11.5px;flex-shrink:0}
  .summary div{display:flex;justify-content:space-between;padding:6px 12px;
               border-bottom:1px solid var(--rule-soft)}
  .summary .sub{color:var(--charcoal-soft)}
  .summary .band{background:var(--stardust-soft)}
  .summary .grand{background:var(--verdant);color:var(--ivory);border-bottom:none;
                  padding:13px 12px;margin-top:8px;font-size:15px;font-weight:600}
  .summary .grand span:last-child{font-family:'Literata',Georgia,serif;font-size:17px}

  .words{max-width:400px}
  .words h4{font-size:8.5px;text-transform:uppercase;letter-spacing:.18em;
            color:var(--clay);margin:0 0 6px;font-weight:600}
  .inwords{margin:0;font-family:'Literata',Georgia,serif;font-size:12.5px;
           font-weight:500;line-height:1.55;color:var(--charcoal)}
  .fine{margin:10px 0 0;font-size:10.5px;color:var(--charcoal-soft);line-height:1.6}

  footer{margin-top:30px;border-top:1px solid var(--rule);padding-top:16px;
         display:flex;justify-content:space-between;gap:26px;font-size:10.5px;
         color:var(--charcoal-soft)}
  footer strong{color:var(--charcoal);font-family:'Literata',Georgia,serif;
                font-size:12px;font-weight:600}
  .sign{text-align:right}
  .sign .line{margin-top:40px;border-top:1px solid var(--rule);padding-top:6px;
              min-width:200px;color:var(--charcoal-soft)}

  /* Browsers drop background colours when printing to save ink, which would
     strip the masthead, the dark table head and the grand-total band and leave
     the document looking broken rather than merely plain. This asks for them
     to be kept. Chrome and Safari honour it; Firefox needs "Print
     backgrounds" ticked in the print dialog. */
  html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .masthead,th,.summary .grand,.summary .band,tbody tr:nth-child(even),
  .paid,.flag,.warn{-webkit-print-color-adjust:exact;print-color-adjust:exact}

  @media print{
    html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{padding:0}
    .noprint{display:none}
    thead{display:table-header-group}
    tr{break-inside:avoid}
    .masthead,.parties,.meta{break-inside:avoid}
    .foot{break-inside:avoid}
    @page{size:A4;margin:12mm 10mm}
  }
</style></head><body><div class="sheet">

<div class="warn noprint printhint">
  <strong>Printing:</strong> choose <em>Save as PDF</em> as the destination, and
  make sure “Background graphics” (Chrome) or “Print backgrounds” (Firefox) is
  ticked so the colours are kept.
</div>
${gaps.length ? `<div class="warn noprint"><strong>Not ready to issue.</strong>
  The supplier block is missing: ${esc(gaps.join(", "))}.</div>` : ""}
${inv.needsAttention.length ? `<div class="warn noprint"><strong>Needs attention.</strong>
  ${inv.needsAttention.map(esc).join("; ")}.</div>` : ""}

<div class="masthead">
  <div class="brand">
    <img class="logo" src="${LOGO_DATA_URI}" alt="${esc(SUPPLIER.legalName)}" />
    <p class="doctype">Tax Invoice</p>
  </div>
  <div class="supplier">
    <p class="name">${esc(SUPPLIER.legalName)}</p>
    ${supplierAddressLines().map((l) => `<p>${esc(l)}</p>`).join("")}
    <p>${esc(SUPPLIER.phone)}</p>
    <p>${esc(SUPPLIER.email)}</p>
    <p class="gstin">GSTIN ${esc(SUPPLIER.gstin)}</p>
  </div>
</div>

<div class="meta">
  <div><dt>Invoice No.</dt><dd>${esc(inv.invoiceNumber)}</dd></div>
  <div><dt>Order No.</dt><dd>${esc(inv.orderName)}</dd></div>
  <div><dt>Invoice Date</dt><dd>${esc(DATE_FMT.format(new Date(inv.createdAt)))}</dd></div>
  <div><dt>Payment</dt><dd>${esc(inv.paymentMode)}</dd></div>
  <div><dt>Place of Supply</dt><dd>${esc(inv.placeOfSupply)}</dd></div>
  <div><dt>Supply Type</dt><dd>${inter ? "Inter-state · IGST" : "Intra-state · CGST + SGST"}</dd></div>
</div>

<div class="parties">
  ${partyBlock("Bill to", inv.billTo)}
  ${partyBlock("Ship to", inv.customer)}
</div>

<div class="tablewrap">
<span class="paid" aria-hidden="true">PAID</span>
<table>
  <thead><tr>
    <th>Item description</th><th>HSN</th><th class="num">Qty</th>
    <th class="num">Unit price</th><th class="num">Taxable value</th>
    <th class="num">GST</th>${taxHeads}<th class="num">Discount</th><th class="num">Total</th>
  </tr></thead>
  <tbody>${rows}${shippingRow}</tbody>
  <tfoot><tr>
    <td>Total</td><td></td><td class="num">${qty}</td>
    <td class="num">${money(inv.totals.gross + inv.discountTotal)}</td>
    <td class="num">${money(inv.totals.taxable)}</td>
    <td></td>
    ${totalTaxCells}
    <td class="num">${inv.discountTotal > 0 ? "−" + money(inv.discountTotal) : money(0)}</td>
    <td class="num">${money(inv.totals.gross)}</td>
  </tr></tfoot>
</table>
</div>

<div class="foot">
<div class="words">
  <h4>Total in words</h4>
  <p class="inwords">${esc(amountInWords(inv.totals.gross).toUpperCase())}</p>
  <p class="fine">Prices are inclusive of GST. Amounts in Indian Rupees.</p>
</div>

<div class="summary">
  <div><span>Value of items</span><span>${money(inv.totals.gross + inv.giftDiscount + inv.codeDiscount)}</span></div>
  <div class="band"><span>Complimentary${inv.giftDiscount > 0 ? "" : " discount"}</span><span>−${money(inv.giftDiscount)}</span></div>
  ${inv.codeDiscount > 0
    ? `<div class="band"><span>Discount${inv.discountCodes.length ? ` (${esc(inv.discountCodes.join(", "))})` : ""}</span><span>−${money(inv.codeDiscount)}</span></div>`
    : ""}
  <div><span>Total Before Tax</span><span>${money(inv.totals.taxable)}</span></div>
  ${taxByRate
    .map((r) =>
      inter
        ? `<div><span>IGST @ ${r.rate}%</span><span>${money(r.igst)}</span></div>`
        : `<div><span>CGST @ ${r.rate / 2}%</span><span>${money(r.cgst)}</span></div>
       <div><span>SGST @ ${r.rate / 2}%</span><span>${money(r.sgst)}</span></div>`
    )
    .join("")}
  <div class="band"><span>Total Tax</span><span>${money(inv.totals.gst)}</span></div>
  <div><span>Total After Tax</span><span>${money(inv.totals.gross)}</span></div>
  <div class="sub"><span>Shipping Amount</span><span>${money(inv.shipping ? inv.shipping.taxable : 0)}</span></div>
  <div class="sub"><span>Shipping Tax</span><span>${money(inv.shipping ? inv.shipping.gst : 0)}</span></div>
  <div class="sub"><span>Shipping Total</span><span>${money(inv.shipping ? inv.shipping.gross : 0)}</span></div>
  <div class="grand"><span>Grand Total</span><span>${money(inv.totals.gross)}</span></div>
</div>
</div>

<footer>
  <div><strong>Thank you for your business.</strong><br />
    Questions? ${esc(SUPPLIER.email)}</div>
  <div class="sign">For ${esc(SUPPLIER.legalName)}<div class="line">Authorised signatory</div></div>
</footer>


${opts.autoPrint ? `<script>
  // Opened from the "Print / Save as PDF" action: go straight to the dialog so
  // nobody has to hunt for it in a menu.
  window.addEventListener("load", function () { window.print(); });
</script>` : ""}
</div></body></html>`;
}
