# 04 · Data access for reports

Reports are pulled by `marketing/seo/tools/seo_data.py`, which needs
**read-only** access to Search Console and GA4 (through a Google "service
account", a robot user) and a Clarity API token. Everything is read-only; the
script can't change any setting.

All credentials go in **`~/.config/quinthome/`** on the computer that runs the
reports, never inside the project folder, so they can't end up on GitHub.

## Part A — Create the Google service account (once)

1. Go to https://console.cloud.google.com and sign in with the business Google account.
2. Top bar → project picker → **New project** → name `quinthome-seo` → **Create**.
   Make sure it's selected.
3. Turn on the two APIs (search each in the top search bar → **Enable**):
   - **Google Search Console API**
   - **Google Analytics Data API**
4. Left menu → **IAM & Admin → Service accounts → + Create service account**.
   - Name: `seo-reports` → **Create and continue**.
   - Skip "Grant this service account access" → **Done**. It needs no Cloud roles.
5. Click the new account → **Keys** tab → **Add key → Create new key → JSON → Create**.
   A `.json` file downloads. This is a password: keep it private.
6. Copy the service account's **email**. It looks like
   `seo-reports@quinthome-seo.iam.gserviceaccount.com`.

> If your organisation blocks key creation ("Service account key creation is
> disabled"), an admin must allow it for this project, or use a personal Google
> Cloud project.

## Part B — Give it access

**Search Console:** property `quinthome.in` → **Settings → Users and
permissions → Add user** → paste the service account email → permission
**Restricted** → **Add**.

**GA4:** **Admin → Property access management → + → Add users** → paste the
email → role **Viewer** → untick "Notify by email" → **Add**.
Note the **Property ID** shown in **Admin → Property details** (digits only).

## Part C — Put the files in place (Mac)

Run in Terminal, replacing the paths and values:

```bash
mkdir -p ~/.config/quinthome && chmod 700 ~/.config/quinthome

# 1. The Google key you downloaded
mv ~/Downloads/quinthome-seo-*.json ~/.config/quinthome/google-service-account.json

# 2. The Clarity token (paste it between the quotes)
printf '%s' 'PASTE_CLARITY_TOKEN_HERE' > ~/.config/quinthome/clarity-token.txt

# 3. Which properties to read (put your GA4 property id)
cat > ~/.config/quinthome/seo.json <<'EOF'
{ "gsc_site": "sc-domain:quinthome.in", "ga4_property": "123456789" }
EOF

chmod 600 ~/.config/quinthome/*
```

If Search Console has only a URL-prefix property, set
`"gsc_site": "https://www.quinthome.in/"` instead.

## Part D — Test

```bash
cd "/Users/deeppatange/Desktop/Main DB/May29_snapshot_3cb037b"
python3 marketing/seo/tools/seo_data.py check
```

Good output looks like:

```
Google ........ service account seo-reports@quinthome-seo.iam.gserviceaccount.com
Search Console  sc-domain:quinthome.in (siteRestrictedUser)
GA4 ........... property 123456789: OK
Clarity ....... token saved (not tested, to save the daily quota)
```

## Pulling reports

```bash
python3 marketing/seo/tools/seo_data.py gsc --days 28 --by query     # top searches
python3 marketing/seo/tools/seo_data.py gsc --days 28 --by page      # top pages in Google
python3 marketing/seo/tools/seo_data.py ga4 --days 28 --by channel   # where visitors come from, with sales
python3 marketing/seo/tools/seo_data.py ga4 --days 28 --by landing   # landing pages
python3 marketing/seo/tools/seo_data.py clarity --days 3 --by URL    # behaviour by page
```

## Removing access

- Search Console: Settings → Users and permissions → remove the email.
- GA4: Property access management → remove the email.
- Google Cloud: delete the key (service account → Keys → delete).
- Clarity: Settings → Data Export → delete the token.
