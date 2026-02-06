'use strict';
/**
 * 🔓 Hack Sys — Target Configuration
 * ═══════════════════════════════════════
 * Define YOUR applications to scan.
 * Only scan systems you OWN.
 *
 * Each target:
 *   url       — (required) base URL
 *   name      — friendly name
 *   tech      — known tech stack hints
 *   repo      — if source is available (for source-aware scanning)
 *   auth      — auth type if needed
 *   schedule  — 'weekly' | 'daily' | 'manual'
 */

module.exports = [
  // === GILLITO WEB APPS (Cloudflare Pages) ===
  // Uncomment and customize for your deployed apps

  // {
  //   url: 'https://gillito-roast-machine.pages.dev',
  //   name: 'Roast Machine',
  //   tech: 'vite, react, cloudflare-pages',
  //   schedule: 'weekly'
  // },
  // {
  //   url: 'https://gillito-translator.pages.dev',
  //   name: 'Translator',
  //   tech: 'vite, react, cloudflare-pages',
  //   schedule: 'weekly'
  // },
  // {
  //   url: 'https://gillito-meme-generator.pages.dev',
  //   name: 'Meme Generator',
  //   tech: 'vite, react, cloudflare-pages',
  //   schedule: 'weekly'
  // },

  // === MOLT NIGHT CLUB ===
  // {
  //   url: 'https://molt-nightclub.pages.dev',
  //   name: 'Molt Night Club',
  //   tech: 'vite, react, cloudflare-pages',
  //   schedule: 'weekly'
  // },

  // === EXTERNAL TEST TARGETS (for practice) ===
  // These are intentionally vulnerable apps for training:

  // {
  //   url: 'http://localhost:3000',
  //   name: 'OWASP Juice Shop (local)',
  //   tech: 'express, angular, sqlite',
  //   schedule: 'manual'
  // },
];
