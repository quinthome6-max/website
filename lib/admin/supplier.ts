/**
 * The supplier block that heads every tax invoice.
 *
 * A GST tax invoice must carry the supplier's registered name, full address and
 * GSTIN, so these are compliance data rather than presentation copy — change
 * them only against the GST registration certificate.
 *
 * The GSTIN below was checked before being written down: 15 characters, valid
 * format, state code 27 (Maharashtra, which matches the place of supply used
 * for the CGST/SGST split), PAN AIAPR7406F, and a checksum that verifies.
 */
export interface Supplier {
  legalName: string;
  addressLines: string[];
  city: string;
  state: string;
  stateCode: string;
  pin: string;
  phone: string;
  email: string;
  gstin: string;
}

export const SUPPLIER: Supplier = {
  legalName: "Rusera Lifestyle",
  // The street lines (building, floor and flat) were removed at the owner's
  // request on 27 Oct 2026: the registered address is a home. Invoices,
  // quotes and order emails now show the city, state and PIN only. GST
  // rules ask for the supplier's address on a tax invoice, so confirm this
  // with the accountant, or add a business address here.
  addressLines: [],
  city: "Mumbai",
  state: "Maharashtra",
  stateCode: "27",
  pin: "400019",
  phone: "+91 98196 16668",
  email: "hello@quinthome.in",
  gstin: "27AIAPR7406F1ZB",
};

/** Address as printed on the invoice, skipping anything not yet confirmed. */
export function supplierAddressLines(s: Supplier = SUPPLIER): string[] {
  const tail = [s.city, s.state, s.pin].filter(Boolean).join(", ");
  return [...s.addressLines, tail].filter(Boolean);
}

/** True when nothing required by a tax invoice is still missing. */
export function supplierIsComplete(s: Supplier = SUPPLIER): boolean {
  return Boolean(s.legalName && s.gstin && s.city && s.state && s.pin);
}

/** Which required fields are still blank, for the dashboard to surface. */
export function supplierGaps(s: Supplier = SUPPLIER): string[] {
  const gaps: string[] = [];
  if (!s.pin) gaps.push("PIN code");
  if (!s.city) gaps.push("City");
  if (!s.gstin) gaps.push("GSTIN");
  return gaps;
}
