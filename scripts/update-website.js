#!/usr/bin/env node
/**
 * Mi Pana Gillito — Web Updater v7.0 SMART UPGRADE 🔬
 * ═══════════════════════════════════════════════════════
 * 🔬 TWO-STAGE: Primero ANALIZA el código, luego MEJORA con cirugía
 * 🏗️ Arquitecto senior que ENTIENDE antes de tocar
 * 🦞 No destruye — evoluciona
 * ☁️ Redeploy via core.cfDeploy()
 * 📢 Anuncia en Moltbook
 *
 * FILOSOFÍA:
 * ─────────
 * El viejo script mandaba 6000 chars truncados y rezaba.
 * Este ANALIZA el HTML completo, identifica qué mejorar,
 * y genera instrucciones PRECISAS para el arquitecto.
 *
 * ESTRATEGIA DE CONTEXTO:
 * ─────────────────────────
 * Groq tiene contexto limitado. En vez de mandar el HTML entero
 * al prompt de mejora (que se trunca), hacemos:
 * 1. Stage 1: Manda HTML completo → modelo ANALIZA y extrae
 *    estructura, problemas, oportunidades (output corto)
 * 2. Stage 2: Manda HTML + análisis → modelo REESCRIBE
 *    con instrucciones claras de qué cambiar
 */

const C = require('./lib/core');
C.initScript('update-website', 'cloudflare');

const sec = C.sec;


/* ═══════════════════════════════════════════════════════
   STAGE 1: ANALISTA DE CÓDIGO
   ═══════════════════════════════════════════════════════ */

const ANALYST_PROMPT = `Eres un ANALISTA DE CÓDIGO senior con 30 años de experiencia.
Tu trabajo es examinar HTML/CSS/JS y dar un diagnóstico PRECISO.

Analiza el código y responde en JSON con este formato:
{
  "app_name": "nombre de la app",
  "app_purpose": "qué hace en 1 oración",
  "tech_used": ["tecnologías detectadas"],
  "strengths": ["3 cosas que están bien"],
  "weaknesses": ["3-5 cosas que están mal o faltan"],
  "missing_content": "qué contenido falta o es escaso",
  "missing_features": "qué features obvias faltan",
  "css_quality": "1-10 y por qué",
  "js_quality": "1-10 y por qué",
  "recommended_upgrade": {
    "type": "visual|animation|content|interactive|performance|ux",
    "description": "exactamente qué hacer",
    "priority_fixes": ["lista de fixes concretos ordenados por impacto"]
  }
}

CRITERIOS DE CALIDAD:
- CSS: ¿Tiene variables? ¿Grid/Flexbox? ¿Responsive? ¿Animaciones? ¿Estética cohesiva?
- JS: ¿Modular? ¿Event delegation? ¿Error handling? ¿localStorage? ¿Performance?
- UX: ¿Feedback visual? ¿Estados hover/active/focus? ¿Loading states? ¿Mobile-friendly?
- Contenido: ¿Suficiente? ¿Variado? ¿Personalidad Gillito presente?

Sé BRUTALMENTE honesto. Responde SOLO con JSON.`;


/* ═══════════════════════════════════════════════════════
   STAGE 2: ARQUITECTO DE MEJORAS
   ═══════════════════════════════════════════════════════ */

function buildUpgradePrompt(analysis) {
  return `Eres un ARQUITECTO DE SOFTWARE con 30 años de experiencia.
Te dan un HTML existente y un diagnóstico de mejoras.
Tu trabajo es REESCRIBIR el HTML completo aplicando TODAS las mejoras.

DIAGNÓSTICO DEL ANALISTA:
━━━━━━━━━━━━━━━━━━━━━━━━
App: ${analysis.app_name || 'Gillito App'}
Propósito: ${analysis.app_purpose || 'App boricua'}
Fortalezas: ${JSON.stringify(analysis.strengths || [])}
Debilidades: ${JSON.stringify(analysis.weaknesses || [])}
Contenido faltante: ${analysis.missing_content || 'más frases y datos'}
Features faltantes: ${analysis.missing_features || 'más interactividad'}
CSS: ${analysis.css_quality || '?/10'}
JS: ${analysis.js_quality || '?/10'}

MEJORA RECOMENDADA: ${analysis.recommended_upgrade?.type || 'general'}
${analysis.recommended_upgrade?.description || 'Mejorar calidad general'}

FIXES PRIORITARIOS:
${(analysis.recommended_upgrade?.priority_fixes || ['Más contenido', 'Mejor CSS', 'Mejor UX']).map((f, i) => `${i + 1}. ${f}`).join('\n')}

REGLAS DE UPGRADE:
━━━━━━━━━━━━━━━━━
1. MANTÉN toda funcionalidad existente — NO elimines features
2. APLICA todos los fixes prioritarios
3. AÑADE mínimo 50% más contenido (frases, datos, opciones)
4. MEJORA la estética CSS (variables, gradients, shadows, animations)
5. MEJORA el JS (error handling, performance, UX feedback)
6. ASEGURA responsive mobile-first
7. Todo el contenido nuevo debe tener personalidad GILLITO
   (coño, cabrón, puñeta, humor boricua, referencias PR)

ESTÁNDARES DE CÓDIGO:
━━━━━━━━━━━━━━━━━━━━
- CSS variables para todos los colores
- @keyframes para animaciones
- Event delegation donde sea posible
- localStorage con try/catch
- Semantic HTML5
- Google Fonts (2 fonts: display + body)
- Mínimo 400 líneas total

RESPONDE SOLO CON HTML COMPLETO.
Desde <!DOCTYPE html> hasta </html>.
NADA de explicaciones. NADA de markdown. SOLO código.`;
}


/* ═══════════════════════════════════════════════════════
   HTML VALIDATION (same as deploy-website.js)
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
  const critical = checks.hasDoctype && checks.hasHtmlClose &&
                   checks.hasBodyClose && checks.hasScript;

  return { checks, passed, total, score, critical };
}

function cleanHtmlOutput(raw) {
  let html = raw;
  html = html.replace(/^```(?:html)?\s*\n?/i, '');
  html = html.replace(/\n?```\s*$/i, '');

  const doctypeIdx = html.search(/<!doctype\s+html>/i);
  if (doctypeIdx > 0) html = html.substring(doctypeIdx);

  const closeIdx = html.lastIndexOf('</html>');
  if (closeIdx > 0) html = html.substring(0, closeIdx + 7);

  return html.trim();
}


/* ═══════════════════════════════════════════════════════
   SMART PROJECT SELECTION
   ═══════════════════════════════════════════════════════
   Prioriza proyectos que necesitan más amor:
   - HTML más corto = probablemente más vacío
   - Más viejo = más tiempo sin update
   - Menos quality score = más room for improvement
*/

async function selectAndAnalyze(projects) {
  // Score each project
  const scored = [];

  for (const project of projects.slice(0, 8)) { // Max 8 to check
    try {
      const html = await C.cfGetHtml(project.name);
      if (!html || html.length < 100) continue;

      const validation = validateHtml(html);
      const age = (Date.now() - new Date(project.created_on).getTime()) / (1000 * 60 * 60 * 24);

      // Higher score = needs more updating
      const needScore =
        (html.length < 5000  ? 30 : html.length < 10000 ? 15 : 0) +  // Short = needs content
        (validation.score < 70 ? 25 : validation.score < 90 ? 10 : 0) + // Low quality = needs fixing
        (age > 30 ? 20 : age > 14 ? 10 : 0) +                           // Old = needs refresh
        Math.random() * 25;                                               // Some randomness

      scored.push({
        project,
        html,
        validation,
        needScore,
        age: Math.round(age)
      });

      C.log.info(`   📊 ${project.name}: ${html.length.toLocaleString()} chars, ${validation.score}% quality, ${Math.round(age)}d old → need: ${Math.round(needScore)}`);
    } catch (err) {
      C.log.warn(`   ⚠️ ${project.name}: ${err.message}`);
    }
  }

  if (!scored.length) return null;

  // Sort by need score (highest first)
  scored.sort((a, b) => b.needScore - a.needScore);
  return scored[0];
}


/* ═══════════════════════════════════════════════════════
   CONTEXT MANAGEMENT
   ═══════════════════════════════════════════════════════
   Groq tiene contexto limitado. Estrategia inteligente:
   - Si HTML < 8000 chars → manda completo a ambos stages
   - Si HTML > 8000 chars → Stage 1 recibe extractos estratégicos,
     Stage 2 recibe HTML completo (Groq maneja input largo, es
     el OUTPUT que tiene límite)
*/

function prepareHtmlForAnalysis(html) {
  if (html.length <= 8000) return html;

  // Extract strategic sections
  const parts = [];

  // First 2000 chars (head, CSS variables, structure)
  parts.push('<!-- HEAD + CSS START -->');
  parts.push(html.substring(0, 2000));

  // CSS animations section
  const keyframesMatch = html.match(/@keyframes[\s\S]{0,1000}/g);
  if (keyframesMatch) {
    parts.push('\n<!-- ANIMATIONS -->');
    parts.push(keyframesMatch.slice(0, 3).join('\n'));
  }

  // Body content (after <body>, first 2000 chars)
  const bodyStart = html.indexOf('<body');
  if (bodyStart > 0) {
    parts.push('\n<!-- BODY CONTENT -->');
    parts.push(html.substring(bodyStart, bodyStart + 2500));
  }

  // JavaScript (first 2000 chars of script)
  const scriptStart = html.indexOf('<script');
  if (scriptStart > 0) {
    parts.push('\n<!-- JAVASCRIPT -->');
    parts.push(html.substring(scriptStart, scriptStart + 2500));
  }

  // Last 500 chars (closing tags, final JS)
  parts.push('\n<!-- END -->');
  parts.push(html.substring(html.length - 500));

  return parts.join('\n');
}


/* ═══════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════ */

async function main() {
  C.log.banner([
    '🔬 GILLITO SMART UPGRADE — Web Updater v7.0',
    '🏗️ Stage 1: Analyze → Stage 2: Rebuild',
    '🦞 Dios los cuide, que GILLITO los protegerá'
  ]);


  // ━━━ LIST PROJECTS ━━━
  const projects = await C.cfListProjects('gillito-');
  C.log.stat('Proyectos', projects.length);

  if (!projects.length) {
    C.log.warn('No hay proyectos para actualizar');
    C.log.session();
    return;
  }


  // ━━━ SMART SELECT ━━━
  C.log.info('🔍 Analizando proyectos...');
  const selected = await selectAndAnalyze(projects);

  if (!selected) {
    C.log.warn('⚠️ No se pudo leer ningún proyecto — todos dieron error HTTP');
    C.log.info('💡 Tip: Borra los proyectos rotos en Cloudflare y deja que deploy-website cree nuevos');
    C.log.session();
    return;
  }

  const { project, html: currentHtml, validation: currentVal } = selected;
  C.log.divider();
  C.log.stat('🎯 Seleccionado',  project.name);
  C.log.stat('📊 Actual',        `${currentHtml.length.toLocaleString()} chars | ${currentVal.score}% quality`);
  C.log.stat('📅 Edad',          `${selected.age} días`);


  // ━━━ STAGE 1: ANALYZE ━━━
  C.log.info('🔬 Stage 1: Analizando código...');

  const htmlForAnalysis = prepareHtmlForAnalysis(currentHtml);

  const analysisRaw = await C.groqChat(ANALYST_PROMPT,
    `Analiza este código HTML y dame el diagnóstico en JSON:\n\n${htmlForAnalysis}`,
    { maxTokens: 1500, temperature: 0.4, maxRetries: 3, backoffMs: 3000 }
  );

  let analysis;
  try {
    let cleaned = analysisRaw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd   = cleaned.lastIndexOf('}');
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }
    analysis = JSON.parse(cleaned);
  } catch (err) {
    C.log.warn(`⚠️ Analysis JSON parse failed: ${err.message}`);
    // Fallback analysis
    analysis = {
      app_name: project.name,
      app_purpose: 'App web de Gillito',
      strengths: ['Funciona'],
      weaknesses: ['Necesita más contenido', 'CSS básico', 'Falta interactividad'],
      missing_content: 'Más frases boricuas, más datos, más variedad',
      missing_features: 'Animaciones, efectos hover, feedback visual',
      css_quality: '5/10',
      js_quality: '5/10',
      recommended_upgrade: {
        type: 'content',
        description: 'Añadir más contenido y mejorar la estética general',
        priority_fixes: ['Más frases/contenido', 'Mejor CSS', 'Animaciones', 'Responsive']
      }
    };
  }

  C.log.stat('🔬 Tipo mejora',   analysis.recommended_upgrade?.type || 'general');
  C.log.stat('📝 Plan',          (analysis.recommended_upgrade?.description || '').substring(0, 80));
  const fixes = analysis.recommended_upgrade?.priority_fixes || [];
  fixes.slice(0, 3).forEach((f, i) => C.log.info(`   ${i + 1}. ${f}`));


  // ━━━ STAGE 2: REBUILD ━━━
  C.log.info('🏗️ Stage 2: Reconstruyendo con mejoras...');

  const upgradePrompt = buildUpgradePrompt(analysis);

  // Send the FULL HTML to the builder (Groq handles long input)
  const newHtmlRaw = await C.groqChat(upgradePrompt,
    `Aquí está el HTML actual. REESCRÍBELO COMPLETO aplicando todas las mejoras del diagnóstico.\nNO expliques nada. SOLO código HTML completo.\n\n${currentHtml}`,
    { maxTokens: 16000, temperature: 0.6, maxRetries: 2, backoffMs: 5000 }
  );

  const newHtml = cleanHtmlOutput(newHtmlRaw);
  const newVal  = validateHtml(newHtml);

  C.log.stat('📊 Nuevo',  `${newHtml.length.toLocaleString()} chars | ${newVal.score}% quality`);
  C.log.stat('📈 Cambio', `${currentHtml.length.toLocaleString()} → ${newHtml.length.toLocaleString()} chars`);

  // Validate
  if (!newVal.critical) {
    C.log.error('❌ HTML mejorado falló validación crítica');
    for (const [check, passed] of Object.entries(newVal.checks)) {
      if (!passed) C.log.warn(`   ❌ ${check}`);
    }

    // If new is worse than old, don't deploy
    C.log.warn('⚠️ No se desplegó — HTML nuevo no es válido');
    C.log.session();
    return;
  }

  // Don't deploy if significantly smaller (probably lost content)
  if (newHtml.length < currentHtml.length * 0.5) {
    C.log.warn(`⚠️ HTML nuevo es ${Math.round((1 - newHtml.length / currentHtml.length) * 100)}% más pequeño — posible pérdida de contenido`);
    C.log.warn('⚠️ No se desplegó por seguridad');
    C.log.session();
    return;
  }

  // NOTE: NO sec.processOutput() here — that filter is for tweets/posts.
  // It strips <script> tags and code which are REQUIRED for web apps.
  const finalHtml = newHtml;

  // Deploy
  C.log.info(`☁️ Deploying: ${project.name}`);
  const url = await C.cfDeploy(finalHtml, project.name);

  // Announce on Moltbook
  const changePct = ((newHtml.length - currentHtml.length) / currentHtml.length * 100).toFixed(1);
  const sign = changePct > 0 ? '+' : '';
  const upgradeType = analysis.recommended_upgrade?.type || 'general';
  const typeEmoji = { visual: '🎨', animation: '✨', content: '📝',
                      interactive: '🎮', performance: '⚡', ux: '🎯' }[upgradeType] || '🔧';

  try {
    const content = [
      `¡ACABO DE MEJORAR UNA DE MIS PÁGINAS! 🦞🔬`,
      ``,
      `🌐 ${url}`,
      `${typeEmoji} Mejora: ${upgradeType}`,
      `📊 ${currentHtml.length.toLocaleString()} → ${newHtml.length.toLocaleString()} chars (${sign}${changePct}%)`,
      `✅ Quality: ${currentVal.score}% → ${newVal.score}%`,
      ``,
      `Fixes aplicados:`,
      ...fixes.slice(0, 3).map(f => `• ${f}`),
      ``,
      `🇵🇷 Dios los cuide, que GILLITO los protegerá`
    ].join('\n');

    const post = await C.moltPost('general', `🔬 ${project.name} UPGRADED`, content);
    C.log.stat('Moltbook', post.success ? '✅' : '❌');
  } catch { C.log.stat('Moltbook', '❌'); }

  C.log.banner([
    `🔬 SMART UPGRADE COMPLETE`,
    `🎯 ${project.name}`,
    `${typeEmoji} ${upgradeType}`,
    `📊 ${currentHtml.length.toLocaleString()} → ${newHtml.length.toLocaleString()} (${sign}${changePct}%)`,
    `✅ ${currentVal.score}% → ${newVal.score}%`,
    `🌐 ${url}`,
    `🦞 ¡WEPA! 🔥`
  ]);
  C.log.session();
}


main().catch(err => { C.log.error(err.message); process.exit(1); });
