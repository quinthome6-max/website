# 02 · Google Analytics 4

GA4 counts visitors, where they come from (Google search, Instagram, ads,
direct), what they do, and what they buy. The website code is already in place
and switches on as soon as the measurement ID is added in Vercel.

## Step 1 — Check whether a GA4 property already exists

1. Go to https://analytics.google.com and sign in with the business Google account.
2. Bottom left → **Admin** (gear icon). Look at the **Account** and **Property** columns.
3. If a property for quinthome.in exists, open **Data streams**, click the web
   stream and copy the **Measurement ID** (`G-XXXXXXXXXX`). Go to Step 3.

## Step 2 — Create the property (if none exists)

1. **Admin → Create → Account** (or **Property** if an account exists).
   - Account name: `Quint Home`
   - Property name: `quinthome.in`
   - **Reporting time zone:** India (GMT+05:30)
   - **Currency:** Indian Rupee (₹)
2. Business details: industry **Home & Garden** (or Shopping), size Small.
3. Business objectives: tick **Drive online sales** and **Understand web traffic**.
4. **Create** and accept the terms.
5. Choose platform **Web**:
   - Website URL: `https://www.quinthome.in`
   - Stream name: `quinthome.in`
   - Leave **Enhanced measurement** ON. It counts page changes inside the site.
6. **Create stream**. Copy the **Measurement ID** (`G-XXXXXXXXXX`).
   Ignore the "installation instructions"; the site already has the code.

## Step 3 — Switch it on in Vercel

1. Vercel (client account) → **quint-home** → **Settings → Environment Variables → Add New**.
   - **Key:** `NEXT_PUBLIC_GA_ID`
   - **Value:** `G-XXXXXXXXXX`
   - **Environments:** Production (Preview optional)
   - Not sensitive. It's a public ID that appears in every page.
2. **Save**, then **Deployments → ⋯ → Redeploy**.
3. Check https://www.quinthome.in/api/checkout/status → `"tracking": {"googleAnalytics": true}`.
4. In GA4 → **Reports → Realtime**, open the site on your phone. You should
   appear within a minute.

## Step 4 — Stop PayU from stealing credit for sales

Customers leave for PayU's payment page and come back. Without this, GA4
records PayU as the source of every sale.

1. **Admin → Data streams →** the web stream → **Configure tag settings**.
2. **Show more → List unwanted referrals**.
3. Add conditions, each **Referral domain contains**:
   - `payu.in`
   - `secure.payu.in`
4. **Save**.

## Step 5 — Mark the money events as key events

1. **Admin → Events** (wait until the events have arrived once, up to 24 h).
2. For **purchase**, switch on **Mark as key event** (it may already be on).
3. Optionally also for `begin_checkout`.

## Step 6 — Link to Search Console

1. **Admin → Product links → Search Console links → Link**.
2. Choose the `quinthome.in` property → **Next** → choose the web stream → **Submit**.

GA4 then shows Google search queries next to visits and sales
(Reports → Search Console, once published in the Library).

## Step 7 — Data retention and internal traffic

1. **Admin → Data collection and modification → Data retention** → **14 months** → Save.
2. *(Optional)* **Data streams → Configure tag settings → Define internal traffic**:
   add your office IP so your own visits don't count.

## Step 8 — Give the reports read access

Follow [04 · Data access](04-data-access.md): **Admin → Property access
management → +** → add the service account email as **Viewer**. Also note the
**Property ID** (a number, not the `G-` ID): **Admin → Property details**,
top right.

## What the site sends

See the event table in the [README](README.md#shop-events-sent-to-ga4).
Purchases use the amount PayU confirmed, and each order is counted once even
if the confirmation page is refreshed.
