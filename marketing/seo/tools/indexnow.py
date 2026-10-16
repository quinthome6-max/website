"""
Tell Bing (and the other IndexNow search engines: Yandex, Seznam, Naver…) about
every page in the sitemap, or about the URLs given:

  python3 marketing/seo/tools/indexnow.py                 # everything in sitemap.xml
  python3 marketing/seo/tools/indexnow.py /range/monolith # just these

The key is public by design: it only proves the site owns the file
https://www.quinthome.in/<key>.txt (public/<key>.txt in the repository).
Run after publishing or changing pages. Bing is the index ChatGPT search
draws on most.
"""
import re
import sys
import warnings

warnings.filterwarnings("ignore", message=".*OpenSSL.*")
import requests  # noqa: E402

SITE = "https://www.quinthome.in"
KEY = "5ed755914118f6e5f3030d2349826e16"


def sitemap_urls() -> list[str]:
    xml = requests.get(f"{SITE}/sitemap.xml", timeout=30).text
    return [u for u in re.findall(r"<loc>(.*?)</loc>", xml) if not re.search(r"\.(webp|jpe?g|png)$", u)]


def main() -> None:
    urls = [u if u.startswith("http") else SITE + u for u in sys.argv[1:]] or sitemap_urls()
    res = requests.post("https://api.indexnow.org/indexnow", json={
        "host": "www.quinthome.in",
        "key": KEY,
        "keyLocation": f"{SITE}/{KEY}.txt",
        "urlList": urls,
    }, timeout=30)
    # 200 = accepted; 202 = accepted, key still being validated (first time).
    print(f"IndexNow answered {res.status_code} for {len(urls)} URL(s). {res.text[:200]}")


if __name__ == "__main__":
    main()
