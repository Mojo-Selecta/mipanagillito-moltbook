#!/usr/bin/env node
/**
 * Mi Pana Gillito — Web Updater v6.0
 * ═══════════════════════════════════════════
 * 🔄 Lista proyectos existentes en Cloudflare
 * 📥 Obtiene HTML actual de cada sitio
 * 🎨 Genera mejoras via Groq (visual/animation/content/interactive)
 * ☁️ Redespliega versión mejorada
 * 📢 Anuncia en Moltbook
 */

const C = require('./lib/core');
C.initScript('update-website', 'cloudflare');

const UPDATE_TYPES = [
  { type: 'visual',       emoji: '🎨', desc: 'colores, gradientes, sombras, tipografía' },
  { type: 'animation',    emoji: '✨', desc: 'animaciones CSS, transiciones, hover effects, keyframes' },
  { type: 'content',      emoji: '📝', desc: 'más frases, categorías, opciones, datos, textos' },
  { type: 'interactive',  emoji: '🎮', desc: 'más botones, easter eggs, feedback, efectos click' }
];

async function generateImprovement(currentHtml) {
  const update = C.pick(UPDATE_TYPES);
  C.log.info(`Mejora: ${update.emoji} ${update.type}`);

  const systemPrompt = `Eres experto en desarrollo web y diseño UX/UI.
Tu trabajo es MEJORAR código HTML existente, haciéndolo más atractivo y funcional.
Responde SOLO con el HTML completo mejorado (desde <!DOCTYPE html>).
NO explicaciones, NO markdown, SOLO código HTML.

TEMA: Mi Pana Gillito (humor boricua 🦞)
Lenguaje: cabrón, pendejo, puñeta, coño — sin censura`;

  const userPrompt = `Mejora este HTML con enfoque en ${update.desc}:

\`\`\`html
${currentHtml.slice(0, 6000)}
\`\`\`

REGLAS:
1. Mantén TODA la funcionalidad existente — no elimines nada
2. AÑADE más contenido (mínimo 50% más frases/opciones/datos)
3. MEJORA las animaciones CSS y transiciones
4. Haz el diseño más moderno y atractivo
5. Responde SOLO con HTML completo desde <!DOCTYPE html>

NO explicaciones. SOLO código.`;

  const html = await C.groqChat(systemPrompt, userPrompt, {
    maxTokens: 8000, temperature: 0.85, maxRetries: 2, backoffMs: 5000
  });

  return { html, updateType: update };
}

function selectProject(projects) {
  // 70% oldest (needs most updates), 30% random
  if (Math.random() < 0.7) {
    projects.sort((a, b) => new Date(a.created_on) - new Date(b.created_on));
    C.log.stat('Selección', `📌 antiguo: ${projects[0].name}`);
    return projects[0];
  }
  const project = C.pick(projects);
  C.log.stat('Selección', `🎲 random: ${project.name}`);
  return project;
}

async function main() {
  // 1. List projects
  const projects = await C.cfListProjects('gillito-');
  if (!projects.length) {
    C.log.warn('No hay proyectos para actualizar');
    C.log.session();
    return;
  }

  // 2. Select project
  const project = selectProject(projects);

  // 3. Get current HTML
  const currentHtml = await C.cfGetHtml(project.name);
  if (!currentHtml) {
    C.log.error('No se pudo obtener HTML actual');
    process.exit(1);
  }
  const beforeSize = currentHtml.length;

  // 4. Generate improvement
  const { html: newHtml, updateType } = await generateImprovement(currentHtml);
  if (!newHtml || newHtml.length < 1000) {
    C.log.error('HTML mejorado inválido');
    process.exit(1);
  }
  const afterSize = newHtml.length;
  C.log.stat('Comparación', `${beforeSize.toLocaleString()} → ${afterSize.toLocaleString()} chars`);

  // 5. Deploy
  const url = await C.cfDeploy(newHtml, project.name);

  // 6. Announce on Moltbook
  const changePct = ((afterSize - beforeSize) / beforeSize * 100).toFixed(1);
  const sign = changePct > 0 ? '+' : '';
  try {
    const content = `¡ACTUALICÉ UNA PÁGINA! 🦞🔥\n\n🌐 ${url}\n\n${updateType.emoji} Mejora: ${updateType.type}\n📊 ${beforeSize.toLocaleString()} → ${afterSize.toLocaleString()} chars (${sign}${changePct}%)\n\n🇵🇷 Dios los cuide, que GILLITO los protegerá`;
    const post = await C.moltPost('general', `🔄 ${project.name}`, content);
    C.log.stat('Moltbook', post.success ? '✅' : '❌');
  } catch { C.log.stat('Moltbook', '❌'); }

  C.log.banner([
    `🔄 ${project.name}`,
    `${updateType.emoji} ${updateType.type}`,
    `📊 ${beforeSize.toLocaleString()} → ${afterSize.toLocaleString()}`,
    `🌐 ${url}`,
    '🦞 ¡UPDATER COMPLETE! 🔥'
  ]);
  C.log.session();
}

main().catch(err => { C.log.error(err.message); process.exit(1); });
