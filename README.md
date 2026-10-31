# EscapeRoom2026

TPEG escape room clue page. Players reach the site by QR code. The "evil AI"
terminal shows locked Python scripts, each with one blank slot to type into:

1. `recover_transmission.py`: typing `recoverInformation` shows the cipher key
   `?11?&07&#23#` and the corrupted message `gygjrdgfe`.
2. `overseer_shutdown.py`: typing the decoded message `executeai` reveals the
   clue `e8`.

Answers are case-insensitive. To change them, edit `answer` in the `STAGES`
list in `script.js`; the key and message are in `index.html` (`#intel`).

Static files only: `index.html`, `style.css`, `script.js`. No build step.

## Deploy with GitHub Pages

1. Commit and push these files to `main`.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`, then save.
4. After about a minute the site is live at `https://<username>.github.io/EscapeRoom2026/`.
   This is the URL your cipher should decode to.

GitHub Pages caches files for about 10 minutes. If you change the CSS or JS right
before the event, bump the `?v=` number on those links in `index.html`.

## Changing the clue

Edit `index.html`: the `.clue` element's text **and** its `data-text` attribute
(the glitch layers draw from `data-text`).

## Test locally

```bash
python -m http.server 8123
```

Then open http://localhost:8123.
