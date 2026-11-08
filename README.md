# R&S Gardening – static website

The R&S Gardening website as plain static files: HTML, CSS and JavaScript, with no build step.

This repository is now the source of the site and is edited directly. It started as an export from the Django project (`rs-gardening`), but **don't re-run `export_static` into this folder**: it deletes everything except `.git`, this README, `LICENSE`, `CNAME`, `.nojekyll` and `.gitignore`, so it would wipe the changes made here (error pages, contact card, e-mail address).

## Run locally

```bash
python3 serve.py          # http://localhost:8000
python3 serve.py 8080     # another port
```

`serve.py` works like `python3 -m http.server`, but answers missing pages with `404.html`, as the real hosting does.

## Contact

There is no contact form. The contact card has three tiles:

- **E-mail**: a `mailto:` link that opens the visitor's own e-mail app with the address, a subject and a short template already filled in,
- **Phone**: a `tel:` link,
- **Hours**: information only.

The e-mail address and phone number are written directly in the HTML. To change them, search and replace across all `.html` files.

## Error pages

`404.html` and `500.html` are in the root. They contain the text in all three languages and pick one from the address (`/en/…`, `/de/…`), the visitor's saved language, or Slovak. Their links work both on a custom domain and on a `username.github.io/<repo>/` address.

## Hosting

**GitHub Pages:** Settings → Pages → *Deploy from a branch* → `main`, folder `/ (root)`. `404.html` is used automatically. Add a custom domain under *Custom domain*.

**S3 + CloudFront:**

- Upload without the repository files:
  ```bash
  aws s3 sync . s3://your-bucket --delete --exclude ".git/*" --exclude ".nojekyll" --exclude "serve.py" --exclude "README.md" --exclude "LICENSE"
  ```
- Default root object: `index.html`.
- A CloudFront Function on *Viewer request* so folder addresses like `/en/work/` load their `index.html`:
  ```js
  function handler(event) {
    var r = event.request;
    if (r.uri.endsWith('/')) r.uri += 'index.html';
    else if (!r.uri.includes('.')) r.uri += '/index.html';
    return r;
  }
  ```
- Custom error responses: 403 and 404 → `/404.html` (code 404); 500, 502, 503 and 504 → `/500.html` (code 500).

## What's included

- `index.html`, `en/`, `de/` – the home page in Slovak, English and German
- `work/` (and `en/work/`, `de/work/`) – the "All projects" page, plus one page per category
- `404.html`, `500.html` – error pages
- `static/` – styles, scripts, images and icons

Some photos load from Unsplash, fonts from Google Fonts, and the animation libraries from public CDNs.
