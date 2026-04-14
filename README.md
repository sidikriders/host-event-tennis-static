# Tennis Event Host

Static Next.js app for managing tennis Americano and Mexicano events locally in the browser.

## Local development

Use Node.js 22.20.0 or newer.

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build

This app is configured for static export.

```bash
npm run build
```

The generated static site is written to `out/`.

## Deploy to GitHub Pages

This repository now includes a GitHub Actions workflow that builds the app and publishes `out/` to GitHub Pages.

### 1. Push the repository to GitHub

Create a GitHub repository and push this project. The workflow runs automatically on pushes to `main` or `master`.

### 2. Enable GitHub Pages

In the GitHub repository:

1. Go to `Settings` → `Pages`.
2. Set `Source` to `GitHub Actions`.

### 3. Wait for deployment

After the workflow finishes, the app will be available at:

```text
https://<your-github-username>.github.io/host-event-tennis-static/
```

If you rename the repository, the GitHub Actions build automatically adjusts the base path to the new repository name.

## Notes

- App data is stored in browser local storage, so each browser/device keeps its own event data.
- GitHub Pages serves the static frontend only; there is no backend or shared database.
