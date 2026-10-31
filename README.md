# R&S Gardening – static website

This is the static version of the R&S Gardening website, ready for **GitHub Pages**.

It is **generated** from the Django project (`rs-gardening`), so don't edit these files by hand. Change content in the Django admin, then re-export (see below).

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. On GitHub, open the repository's **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select branch `main` and folder `/ (root)`. Click **Save**.
4. After a minute the site is live at `https://<your-username>.github.io/rs-gardening-frontend/`.

To use your own domain, add it under **Settings → Pages → Custom domain**.

## Contact form

GitHub Pages can only host files, so the contact form sends messages through [Formspree](https://formspree.io), which has a free plan:

1. Create a free Formspree account and a new form. Set it to email you the messages.
2. Copy the form's endpoint, which looks like `https://formspree.io/f/abcdwxyz`.
3. Re-export with that endpoint (below).

Until you do, the form points to a placeholder address and won't send messages.

## Updating the site

From the Django project folder:

```bash
python manage.py export_static ../rs-gardening-frontend --form-endpoint https://formspree.io/f/abcdwxyz
```

Then commit and push here. The export replaces all generated files. It keeps `.git`, this README, `.nojekyll` and a `CNAME` file if you add one.

## What's included

- `index.html` – the home page
- `work/` – the "All projects" page, plus one page per category (`work/lawn/` etc.)
- `static/` – styles, scripts, fonts and icons

Photos and fonts load from their original providers (Unsplash, Google Fonts) and the animation libraries from public CDNs, so nothing else needs hosting.
