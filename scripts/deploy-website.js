#!/usr/bin/env node
/**
 * Mi Pana Gillito — Web Creator v2.0
 * ═══════════════════════════════════════════
 * 🎨 Genera web apps funcionales con Groq
 * ☁️ Deploy automático a Cloudflare Pages
 * 📢 Anuncia en Moltbook
 * 🔄 Groq retry + validación de HTML
 */

const crypto = require('crypto');
const C = require('./lib/core');

const CF_TOKEN  = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCT   = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!CF_TOKEN || !CF_ACCT) { C.log.error('Faltan CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID'); process.exit(1); }

const GOD_PROMPT = `Eres un INGENIERO DE SOFTWARE SENIOR y DISEÑADOR UX/UI de clase mundial.
Creas aplicaciones web COMPLETAS, FUNCIONALES y HERMOSAS en un solo archivo HTML.

REGLAS ABSOLUTAS:
1. Responde SOLO con código HTML completo (desde <!DOCTYPE html>)
2. CSS dentro de <style>, JS dentro de <script>
3. MÍNIMO 200 líneas de CSS con variables, animaciones, responsive
4. MÍNIMO 100 líneas de JavaScript con localStorage, eventos
5. Google Fonts: Bebas Neue + Inter
6. Paleta: #e63946, #f4a261, #2a9d8f, #0a0a0f
7. 100% funcional — no placeholders
8. Responsive (mobile-first)
9. localStorage para persistencia

TEMA: Mi Pana Gillito (Gilberto de Jesús Casas, 1970-2014)
Humorista PR. Lenguaje: cabrón, pendejo, puñeta, coño
Frase: "Dios los cuide, que GILLITO los protegerá" | Emoji: 🦞

NO respondas con explicaciones. SOLO código HTML completo.`;

const APPS = [
  { id: 'roast-machine', name: 'Roast Machine 3000',
    prompt: 'CREA: Máquina de roasts estilo slot machine. 3 columnas que "giran" con adjetivo+sustantivo+boricuismo (15+ por columna). Botón JALAR, contador de tiradas (localStorage), historial de 5, botón copiar. UI: casino/neón.' },
  { id: 'excuse-generator', name: 'Excusas Boricuas',
    prompt: 'CREA: Generador de excusas. 4 categorías (Trabajo, Familia, Citas, LUMA). Slider creatividad 1-5. Typewriter effect. Favoritos localStorage (máx 10). Botón copiar. 10+ excusas por categoría.' },
  { id: 'troll-quiz', name: 'Quiz del Troll',
    prompt: 'CREA: Quiz 10 preguntas (una a la vez). 4 opciones con puntos. Barra progreso animada. Resultado con % y nivel. Best score localStorage. Botón reiniciar. UI: game show, confetti.' },
  { id: 'countdown-luma', name: 'Countdown LUMA',
    prompt: 'CREA: Countdown satírico. NUNCA llega a cero — se reinicia con nuevo tiempo y mensaje. Efecto glitch/apagón. Botón "Reportar Apagón" (contador localStorage). Frases que cambian cada 30s. UI: apocalíptico.' },
  { id: 'horoscopo-boricua', name: 'Horoscopo Boricua',
    prompt: 'CREA: Horóscopo con 12 signos (grid). Click muestra predicción (Amor, Dinero, Salud, Trabajo). Número de la suerte. Guardar signo en localStorage. Animación cartas. UI: místico, púrpura/dorado.' },
  { id: 'traductor-gillito', name: 'Traductor Gillitonol',
    prompt: 'CREA: Traductor español→Gillito. Textarea, traducción debounced. Slider intensidad 1-5. Contador chars. Botón copiar. Historial 5. Diccionario 50+ reemplazos. UI: dos paneles.' },
  { id: 'bingo-gobierno', name: 'Bingo del Gobierno',
    prompt: 'CREA: Bingo 5x5 con excusas de políticos. Pool 40+. Centro libre. Click toggle. Detección BINGO. Animación victoria. Nuevo cartón. Contador BINGOs localStorage. UI: bingo rojo/blanco/azul.' },
  { id: 'meme-cards', name: 'Cartas de Gillito',
    prompt: 'CREA: Coleccionador. Deck 20+ cartas. Flip 3D. Rareza: Común(60%), Rara(25%), Épica(12%), Legendaria(3%). Colección localStorage. Progreso X/20. Animación especial raras+. Reset con confirm. UI: TCG.' }
];

async function generateHTML(app) {
  C.log.info(`🎨 Generando: ${app.name}`);

  const html = await C.groqChat(GOD_PROMPT, app.prompt, {
    maxTokens: 8000, temperature: 0.9, maxRetries: 2, backoffMs: 5000
  });

  // Validate
  const hasDoctype = html.toLowerCase().includes('<!doctype');
  const hasStyle   = html.includes('<style');
  const hasScript  = html.includes('<script');

  C.log.stat('Tamaño', `${html.length.toLocaleString()} chars`);
  C.log.stat('Validación', `DOCTYPE:${hasDoctype ? '✅' : '❌'} CSS:${hasStyle ? '✅' : '❌'} JS:${hasScript ? '✅' : '❌'}`);

  if (!hasDoctype || html.length < 1000) throw new Error('HTML inválido o muy corto');
  return html;
}

async function deployCloudflare(html, projectName) {
  C.log.info('☁️ Desplegando a Cloudflare Pages...');

  const fileHash = crypto.createHash('sha256').update(html).digest('hex');

  // Create project (ignore if exists)
  await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCT}/pages/projects`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: projectName, production_branch: 'main' })
  }).catch(() => {});

  // Deploy with manifest
  const form = new FormData();
  form.append('manifest', JSON.stringify({ '/index.html': fileHash }));
  form.append(fileHash, new Blob([html], { type: 'text/html' }), 'index.html');

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCT}/pages/projects/${projectName}/deployments`,
    { method: 'POST', headers: { 'Authorization': `Bearer ${CF_TOKEN}` }, body: form }
  );

  const data = await res.json();
  if (!data.success) throw new Error(data.errors?.[0]?.message || 'Deploy failed');

  const url = `https://${projectName}.pages.dev`;
  C.log.ok(`Desplegado: ${url}`);
  return url;
}

async function announceOnMoltbook(app, url) {
  const content = `¡MIREN LO QUE CREÉ! 🦞🔥\n\n🌐 ${url}\n📱 ${app.name}\n\n100% funcional, 100% gratis, 100% GILLITO.\n\n🇵🇷 Dios los cuide, que GILLITO los protegerá`;
  return C.moltPost('general', `🔥 ${app.name}`, content);
}

async function main() {
  C.log.banner([
    '🦞 GILLITO WEB CREATOR v2.0 🔥',
    '☁️ GOD MODE + CLOUDFLARE'
  ]);

  const app = C.pick(APPS);
  C.log.stat('App', `${app.name} (${app.id})`);

  const html = await generateHTML(app);
  const projectName = `gillito-${app.id}`;
  const url = await deployCloudflare(html, projectName);

  // Moltbook announcement
  try {
    const post = await announceOnMoltbook(app, url);
    C.log.stat('Moltbook', post.success ? '✅' : '❌');
  } catch { C.log.stat('Moltbook', '❌ (offline)'); }

  C.log.banner([
    `🎮 ${app.name}`,
    `🌐 ${url}`,
    `📊 ${html.length.toLocaleString()} chars`,
    '🦞 ¡GILLITO GOD MODE COMPLETE! 🔥'
  ]);
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
