"""Download Google Fonts (all unicode-range subsets) for offline rendering.

usage: python3 -I fetch_fonts.py OUT_DIR "Family:spec" ["Family:spec" ...]
  e.g. "Noto Serif SC:wght@500;700;900"
Writes OUT_DIR/fonts.css with url()s rewritten to local files.
"""
import concurrent.futures as cf
import hashlib
import os
import re
import sys
import urllib.parse
import urllib.request

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    out = sys.argv[1]
    specs = sys.argv[2:]
    os.makedirs(os.path.join(out, "files"), exist_ok=True)
    q = "&".join("family=" + urllib.parse.quote(s, safe=":@;,") for s in specs)
    css = get(f"https://fonts.googleapis.com/css2?{q}&display=block").decode()
    urls = sorted(set(re.findall(r"url\((https://[^)]+)\)", css)))
    print(f"{len(urls)} font files")

    def fetch(u):
        name = hashlib.sha1(u.encode()).hexdigest()[:16] + ".woff2"
        path = os.path.join(out, "files", name)
        if not os.path.exists(path):
            data = get(u)
            with open(path, "wb") as f:
                f.write(data)
        return u, "files/" + name

    with cf.ThreadPoolExecutor(16) as ex:
        mapping = dict(ex.map(fetch, urls))
    for u, local in mapping.items():
        css = css.replace(u, local)
    with open(os.path.join(out, "fonts.css"), "w") as f:
        f.write(css)
    print("ok", os.path.join(out, "fonts.css"))


if __name__ == "__main__":
    main()
