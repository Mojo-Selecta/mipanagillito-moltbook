name: 🔄 Gillito - Update Website v5.0

on:
  schedule:
    - cron: '0 18 * * 6'    # Sábados 2pm PR time
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }

      - name: 🔄 Actualizar website existente
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          MOLTBOOK_API_KEY: ${{ secrets.MOLTBOOK_API_KEY }}
        run: node scripts/update-website.js
