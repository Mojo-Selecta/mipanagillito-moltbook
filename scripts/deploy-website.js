#!/usr/bin/env node
/**
 * Mi Pana Gillito — Web Creator v7.0 CREATIVE MIND 🧠
 * ═══════════════════════════════════════════════════════
 * 🧠 TWO-STAGE: Primero PIENSA qué crear, luego lo CONSTRUYE
 * 🎨 Código de arquitecto senior — 30 años de experiencia
 * 🦞 Personalidad Gillito en cada decisión creativa
 * ☁️ Deploy via core.cfDeploy()
 * 📢 Anuncia en Moltbook
 * 🛡️ HTML validation completa
 *
 * FILOSOFÍA:
 * ─────────
 * Gillito NO escoge de una lista fija. Gillito PIENSA.
 * Stage 1: El cerebro creativo imagina qué construir
 * Stage 2: El arquitecto senior lo implementa con precisión
 *
 * CAPACIDADES DE GROQ (lo que podemos generar):
 * ─────────────────────────────────────────────
 * ✅ HTML5 completo con CSS y JS inline (single-file apps)
 * ✅ CSS3: variables, grid, flexbox, animaciones, keyframes,
 *    gradients, backdrop-filter, clip-path, custom properties
 * ✅ JS vanilla: DOM, eventos, localStorage, Canvas 2D,
 *    Web Audio API, requestAnimationFrame, IntersectionObserver,
 *    Fetch API, drag & drop, touch events, clipboard API
 * ✅ Google Fonts via CDN
 * ✅ SVG inline + animaciones SMIL/CSS
 * ✅ Canvas 2D para juegos y visualizaciones
 * ❌ NO frameworks (React, Vue, etc.)
 * ❌ NO npm, NO bundlers, NO server-side
 * ❌ NO APIs externas (excepto fonts CDN)
 */

const C = require('./lib/core');
C.initScript('deploy-website', 'cloudflare');

const sec = C.sec;
const P   = C.loadPersonality();


/* ═══════════════════════════════════════════════════════
   STAGE 1: EL CEREBRO CREATIVO DE GILLITO
   ═══════════════════════════════════════════════════════
   Alta temperatura, pensamiento libre.
   Gillito decide QUÉ construir basado en su mundo.
*/

const CREATIVE_BRAIN = `Eres Gillito — el hacker boricua más creativo del internet.
Tienes 30 AÑOS de experiencia construyendo aplicaciones web.
Conoces CADA truco de HTML5, CSS3 y JavaScript vanilla.

TU MUNDO (de donde sacas ideas):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏝️ Puerto Rico: cultura, música, comida, playas, pueblos, chinchorreo
⚡ LUMA Energy: apagones, facturas absurdas, excusas ridículas
🏛️ Gobierno PR: corrupción, promesas rotas, alcaldes, legisladores
🎭 Humor boricua: refranes, dichos, calle, doble sentido, trolleo
🎵 Música: reggaetón, salsa, bomba, plena, trap PR
🍖 Comida: mofongo, lechón, alcapurrias, piraguas, chinchorro
🦞 Tu personalidad: lenguaje sucio, hacker, troll, pero con corazón
🎮 Gaming/tech: cultura geek boricua, memes, internet culture
📱 Redes sociales: tendencias PR, Twitter fights, chisme político

TECNOLOGÍAS QUE DOMINAS para single-file HTML apps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CSS3: variables custom, grid, flexbox, @keyframes, animaciones,
  gradients (linear, radial, conic), backdrop-filter, clip-path,
  scroll-snap, ::before/::after, transforms 3D, mix-blend-mode,
  CSS counters, @media queries, container queries
JS: DOM manipulation, event delegation, localStorage, sessionStorage,
  Canvas 2D (juegos, visualizaciones, dibujo), Web Audio API (sonidos),
  requestAnimationFrame (loops de juego), IntersectionObserver,
  drag & drop API, touch events, clipboard API, Web Animations API,
  setInterval/setTimeout, Math.random para procedural generation
SVG: gráficos vectoriales inline, animaciones CSS en SVG, paths
Google Fonts: tipografías premium via CDN (Bebas Neue, Archivo Black,
  Righteous, Press Start 2P, Permanent Marker, Space Mono, etc.)

TIPOS DE APPS que puedes inventar (NO te limites a estos):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Generadores (roasts, excusas, nombres, reggaetón, piropos)
- Juegos Canvas (arcade, puzzle, endless runner, tower defense)
- Simuladores satíricos (gobernar PR, ser LUMA, ser político)
- Quizzes y trivias (cultura PR, música, comida, historia)
- Herramientas útiles-graciosas (calculadoras de factura LUMA,
  traductor a boricua, countdown a promesas del gobierno)
- Experiencias visuales (arte generativo boricua, visualizadores
  de música, animaciones interactivas, tarjetas coleccionables)
- Bingos, slot machines, ruletas temáticas
- Simuladores de chat/conversación (hablar con Gillito)
- Aventuras de texto (sobrevivir un apagón, navegar la burocracia)
- Tableros/dashboards satíricos (tracker de apagones, meter de
  corrupción, countdown a próxima excusa de LUMA)

Tu trabajo ahora: INVENTA una app web original.
Responde en JSON con EXACTAMENTE este formato:
{
  "id": "nombre-slug-corto",
  "name": "Nombre Creativo con Personalidad",
  "description": "Qué hace la app en 1-2 oraciones con tu voz",
  "type": "generator|game|simulator|quiz|tool|visual|interactive",
  "tech_focus": "qué tecnologías CSS/JS serán protagonistas",
  "ux_vision": "cómo se ve y se siente — estética concreta",
  "killer_feature": "la cosa que hace que la gente diga COÑO MIRA ESTO",
  "content_seeds": ["5-8 ejemplos concretos del contenido de la app"]
}

REGLAS:
- Que sea ORIGINAL — no copies ideas genéricas
- Que tenga personalidad GILLITO en cada esquina
- Que sea TÉCNICAMENTE AMBICIOSO pero posible en un solo HTML
- El killer_feature tiene que ser algo que sorprenda
- NO respondas con nada más que el JSON`;


/* ═══════════════════════════════════════════════════════
   STAGE 2: EL ARQUITECTO SENIOR
   ═══════════════════════════════════════════════════════
   Baja temperatura, código preciso y profesional.
   Implementa la visión del Stage 1 con calidad de producción.
*/

function buildArchitectPrompt(appPlan) {
  return `Eres un ARQUITECTO DE SOFTWARE con 30 años de experiencia.
Escribes código HTML/CSS/JS como si fuera ARTE — limpio, eficiente, hermoso.
Tu código es tan bueno que otros desarrolladores lo estudian.

VAS A CONSTRUIR ESTA APP:
━━━━━━━━━━━━━━━━━━━━━━━━
Nombre: ${appPlan.name}
Descripción: ${appPlan.description}
Tipo: ${appPlan.type}
Tech focus: ${appPlan.tech_focus}
UX/Estética: ${appPlan.ux_vision}
Killer feature: ${appPlan.killer_feature}
Contenido semilla: ${JSON.stringify(appPlan.content_seeds)}

ESTÁNDARES DE ARQUITECTURA (NO NEGOCIABLES):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. HTML5 semántico: <header>, <main>, <section>, <footer>, <article>
2. CSS con variables custom (--color-primary, --color-bg, etc.)
3. CSS Grid + Flexbox para layouts (NUNCA floats)
4. Mobile-first responsive (@media min-width)
5. Animaciones CSS con @keyframes (NO jQuery animate)
6. JavaScript vanilla modular: funciones puras, event delegation
7. localStorage para persistencia de datos del usuario
8. Manejo de errores en todo el JS (try/catch donde aplique)
9. Accesibilidad básica: aria-labels, roles, focus visible
10. Performance: requestAnimationFrame para animaciones JS,
    debounce para inputs, lazy evaluation

ESTÁNDARES DE DISEÑO:
━━━━━━━━━━━━━━━━━━━━
- Google Fonts: escoge 2 que encajen con la estética (display + body)
  Opciones: Bebas Neue, Archivo Black, Righteous, Press Start 2P,
  Permanent Marker, Space Mono, Rubik, Orbitron, Bangers, Creepster,
  Bungee, Monoton, Passion One, Staatliches, Audiowide
- Paleta: crea una paleta cohesiva (4-6 colores) en CSS variables
  NO uses la misma paleta siempre — que encaje con el tema
- Sombras con capas: box-shadow con 2-3 capas para profundidad
- Gradientes creativos (linear, radial o conic según el mood)
- Efectos hover que den feedback claro al usuario
- Transiciones suaves (200-400ms ease-out en todo lo interactivo)
- Un efecto "WOW" visual que sea lo primero que ves

PERSONALIDAD GILLITO EN EL CONTENIDO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Lenguaje: coño, cabrón, puñeta, mierda, carajo, diache, wepa
- Slang: pana, bro, mano, brutal, chavos, janguear, bregar
- Humor: trolleo, sarcasmo, doble sentido, crítica social
- Referencias: LUMA, gobierno, reggaetón, comida, playa
- Frase firma: "Dios los cuide, que GILLITO los protegerá" 🦞
- MÍNIMO 30 frases/contenidos únicos en la app

ESTRUCTURA DEL ARCHIVO:
━━━━━━━━━━━━━━━━━━━━━━
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[nombre]</title>
  <link href="https://fonts.googleapis.com/css2?family=[font1]&family=[font2]&display=swap" rel="stylesheet">
  <style>
    /* === VARIABLES === */
    :root { ... }
    /* === RESET === */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    /* === BASE === */
    /* === LAYOUT === */
    /* === COMPONENTS === */
    /* === ANIMATIONS === */
    @keyframes ...
    /* === RESPONSIVE === */
    @media (min-width: 768px) { ... }
  </style>
</head>
<body>
  <!-- SEMANTIC HTML -->
  <script>
    // === STATE ===
    // === DOM REFS ===
    // === FUNCTIONS ===
    // === EVENT LISTENERS ===
    // === INIT ===
  </script>
</body>
</html>

RESPONDE SOLO CON EL CÓDIGO HTML COMPLETO.
Desde <!DOCTYPE html> hasta </html>.
NADA de explicaciones, NADA de markdown, NADA de \`\`\`.
SOLO el código.
El archivo debe ser MÍNIMO 400 líneas.
CADA función debe estar completa y funcional.
NO dejes NADA como placeholder o TODO.`;
}


/* ═══════════════════════════════════════════════════════
   HTML VALIDATION
   ═══════════════════════════════════════════════════════ */

function validateHtml(html) {
  const checks = {
    hasDoctype:    /<!doctype\s+html>/i.test(html),
    hasHtmlClose:  html.includes('</html>'),
    hasHeadClose:  html.includes('</head>'),
    hasBodyClose:  html.includes('</body>'),
    hasStyle:      html.includes('<style'),
    hasScript:     html.includes('<script'),
    hasViewport:   html.includes('viewport'),
    hasCssVars:    html.includes('--'),
    hasKeyframes:  /@keyframes/i.test(html),
    hasMediaQuery: /@media/i.test(html),
    minLength:     html.length >= 3000,
  };

  const passed  = Object.values(checks).filter(Boolean).length;
  const total   = Object.keys(checks).length;
  const score   = Math.round(passed / total * 100);

  // Critical fails — HTML is broken
  const critical = checks.hasDoctype && checks.hasHtmlClose &&
                   checks.hasBodyClose && checks.hasScript;

  return { checks, passed, total, score, critical };
}

/**
 * Clean LLM output — strip markdown fences and preamble
 */
function cleanHtmlOutput(raw) {
  let html = raw;

  // Strip markdown code fences
  html = html.replace(/^```(?:html)?\s*\n?/i, '');
  html = html.replace(/\n?```\s*$/i, '');

  // Strip any preamble before <!DOCTYPE
  const doctypeIdx = html.search(/<!doctype\s+html>/i);
  if (doctypeIdx > 0) {
    html = html.substring(doctypeIdx);
  }

  // Strip any text after </html>
  const closeIdx = html.lastIndexOf('</html>');
  if (closeIdx > 0) {
    html = html.substring(0, closeIdx + 7);
  }

  return html.trim();
}


/* ═══════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════ */

async function main() {
  C.log.banner([
    '🧠 GILLITO CREATIVE MIND — Web Creator v7.0',
    '🎨 Stage 1: Think → Stage 2: Build',
    '🦞 Dios los cuide, que GILLITO los protegerá'
  ]);


  // ━━━ STAGE 1: CREATIVE THINKING ━━━
  C.log.info('🧠 Stage 1: Gillito está pensando qué crear...');

  const ideaRaw = await C.groqChat(CREATIVE_BRAIN,
    'Inventa una app web ORIGINAL que nunca hayas hecho. Que sea ambiciosa y sorprendente. Responde SOLO en JSON.',
    { maxTokens: 1000, temperature: 0.95, maxRetries: 3, backoffMs: 3000 }
  );

  // Parse the app plan
  let appPlan;
  try {
    // Clean potential markdown fences
    let cleaned = ideaRaw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    // Find JSON object
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd   = cleaned.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    appPlan = JSON.parse(cleaned);
  } catch (err) {
    C.log.warn(`⚠️ JSON parse failed: ${err.message}`);
    C.log.warn('Raw idea (first 300 chars): ' + ideaRaw.substring(0, 300));
    // Fallback — use a safe default concept
    appPlan = {
      id: 'gillito-random-' + Date.now().toString(36).slice(-4),
      name: 'La Ruleta de Gillito',
      description: 'Ruleta interactiva que genera combinaciones random de situaciones boricuas — desde excusas pa LUMA hasta piropos de chinchorro',
      type: 'interactive',
      tech_focus: 'CSS animations, Canvas 2D, transforms 3D',
      ux_vision: 'Casino neon tropical — colores vibrantes, glow effects, sensación de slot machine',
      killer_feature: 'Animación de giro 3D con physics easing que se siente REAL',
      content_seeds: ['Excusas de LUMA', 'Piropos boricuas', 'Frases de político', 'Predicciones de apagón', 'Refranes de abuela']
    };
    C.log.info('🔄 Using fallback concept: ' + appPlan.name);
  }

  // Validate plan has required fields
  const requiredFields = ['id', 'name', 'description', 'type'];
  for (const field of requiredFields) {
    if (!appPlan[field]) {
      appPlan[field] = appPlan[field] || 'gillito-app';
    }
  }

  // Clean the ID for Cloudflare (lowercase, hyphens only)
  appPlan.id = String(appPlan.id).toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);

  C.log.divider();
  C.log.stat('💡 Idea',          appPlan.name);
  C.log.stat('📋 Tipo',          appPlan.type || 'unknown');
  C.log.stat('🎯 Killer',        (appPlan.killer_feature || '').substring(0, 80));
  C.log.stat('🎨 Estética',      (appPlan.ux_vision || '').substring(0, 80));
  C.log.stat('🔧 Tech',          (appPlan.tech_focus || '').substring(0, 80));
  C.log.stat('📦 Contenido',     (appPlan.content_seeds || []).length + ' seeds');
  C.log.divider();


  // ━━━ STAGE 2: ARCHITECT BUILDS ━━━
  C.log.info('🏗️ Stage 2: El arquitecto está construyendo...');

  const architectPrompt = buildArchitectPrompt(appPlan);

  const htmlRaw = await C.groqChat(architectPrompt,
    `Construye "${appPlan.name}" — ${appPlan.description}\n\nHazlo COMPLETO y FUNCIONAL. Mínimo 400 líneas. SOLO código HTML.`,
    { maxTokens: 16000, temperature: 0.6, maxRetries: 2, backoffMs: 5000 }
  );

  // Clean and validate
  const html = cleanHtmlOutput(htmlRaw);
  const validation = validateHtml(html);

  C.log.stat('📊 Tamaño',      `${html.length.toLocaleString()} chars | ${html.split('\n').length} líneas`);
  C.log.stat('✅ Validación',   `${validation.passed}/${validation.total} checks (${validation.score}%)`);

  // Log individual checks
  for (const [check, passed] of Object.entries(validation.checks)) {
    if (!passed) C.log.warn(`   ❌ ${check}`);
  }

  if (!validation.critical) {
    C.log.error('❌ HTML falló validación crítica — no se puede deployar');
    C.log.warn('Preview: ' + html.substring(0, 200));

    // Emergency retry with simpler prompt
    C.log.info('🔄 Intentando con prompt simplificado...');
    const retryHtml = await C.groqChat(
      `Eres un experto en HTML/CSS/JS. Crea una app web completa en un solo archivo HTML.
Tema: ${appPlan.name} — ${appPlan.description}
Personalidad: humor boricua, lenguaje de calle (coño, cabrón, puñeta).
RESPONDE SOLO CON HTML COMPLETO desde <!DOCTYPE html> hasta </html>.
Incluye <style> para CSS y <script> para JS. Mínimo 200 líneas.`,
      'Crea la app ahora. SOLO código HTML, nada más.',
      { maxTokens: 12000, temperature: 0.5, maxRetries: 2, backoffMs: 5000 }
    );

    const retryClean = cleanHtmlOutput(retryHtml);
    const retryVal   = validateHtml(retryClean);

    if (!retryVal.critical) {
      C.log.error('❌ Retry también falló. Abortando.');
      process.exit(1);
    }

    C.log.ok('✅ Retry exitoso');
    return await deployAndAnnounce(retryClean, appPlan, retryVal);
  }

  await deployAndAnnounce(html, appPlan, validation);
}


/* ═══════════════════════════════════════════════════════
   DEPLOY + ANNOUNCE
   ═══════════════════════════════════════════════════════ */

async function deployAndAnnounce(html, appPlan, validation) {
  // Security check
  const secCheck = sec.processOutput(html);
  if (!secCheck.safe) {
    C.log.warn('🛡️ Security cleaned: ' + secCheck.blocked.join(', '));
  }
  const finalHtml = secCheck.safe ? secCheck.text : html;

  // Deploy
  const projectName = `gillito-${appPlan.id}`;
  C.log.info(`☁️ Deploying: ${projectName}`);
  const url = await C.cfDeploy(finalHtml, projectName);

  // Announce on Moltbook
  try {
    const emoji = { generator: '🎰', game: '🎮', simulator: '🕹️',
                    quiz: '❓', tool: '🔧', visual: '🎨',
                    interactive: '🎪' }[appPlan.type] || '🦞';

    const content = [
      `¡COÑO MIREN LO QUE ACABO DE CREAR! 🦞🔥`,
      ``,
      `${emoji} ${appPlan.name}`,
      `📝 ${appPlan.description}`,
      ``,
      `🌐 ${url}`,
      ``,
      `📊 ${finalHtml.length.toLocaleString()} chars | Score: ${validation.score}%`,
      `🎯 ${appPlan.killer_feature || 'Puro fuego boricua'}`,
      ``,
      `100% hecho por MI CEREBRO. 100% funcional. 100% GRATIS.`,
      ``,
      `🇵🇷 Dios los cuide, que GILLITO los protegerá`
    ].join('\n');

    const post = await C.moltPost('general', `🔥 ${appPlan.name}`, content);
    C.log.stat('Moltbook', post.success ? '✅' : '❌');
  } catch { C.log.stat('Moltbook', '❌ (offline)'); }

  C.log.banner([
    `🧠 CREATIVE MIND COMPLETE`,
    `💡 ${appPlan.name}`,
    `📊 ${finalHtml.length.toLocaleString()} chars | ${validation.score}% quality`,
    `🌐 ${url}`,
    `🦞 ¡WEPA! 🔥`
  ]);
  C.log.session();
}


main().catch(err => { C.log.error(err.message); process.exit(1); });
