<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Skinoculars

Skinoculars is an interactive 3D skin anatomy visualization built with React + Three.js.

## Local Development

**Prerequisites:** Node.js (recommended: Node 20)

1. `npm install`
2. `npm run dev`

## Production Build

1. `npm run build`
2. `npm run preview`

## Deploy to `skinoculars.ramiefathy.com`

This repository is set up to deploy to GitHub Pages via GitHub Actions (`.github/workflows/pages.yml`). It also includes:

- `public/CNAME` → published as `dist/CNAME` so Pages knows the custom domain
- `public/.nojekyll` → disables Jekyll processing

**GitHub**

1. In `ramiefathy/Skinoculars` → Settings → Pages
2. Set **Build and deployment** → **Source** to **GitHub Actions**
3. Set **Custom domain** to `skinoculars.ramiefathy.com` and enable **Enforce HTTPS** once available

**Cloudflare DNS**

Create a DNS record:

- Type: `CNAME`
- Name: `skinoculars`
- Target: `ramiefathy.github.io`

If you proxy through Cloudflare, keep SSL/TLS mode set to **Full (strict)** once GitHub Pages finishes issuing the certificate for the custom domain.
