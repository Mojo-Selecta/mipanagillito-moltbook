const GROQ_KEY = process.env.GROQ_API_KEY;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║                    🦞 GILLITO WEB UPDATER - CLOUDFLARE 🔥                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// ============ LISTAR PROYECTOS DE CLOUDFLARE ============

async function listGillitoProjects() {
  console.log('📋 Buscando proyectos de Gillito en Cloudflare...\n');

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects`,
    {
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
    }
  );

  const data = await res.json();

  if (!data.success) {
    console.log('❌ Error listando proyectos');
    return [];
  }

  // Filtrar solo proyectos de Gillito
  const gillitoProjects = data.result.filter(p => p.name.startsWith('gillito-'));

  console.log(`   ✅ Encontrados: ${gillitoProjects.length} proyectos\n`);

  return gillitoProjects;
}

// ============ OBTENER HTML ACTUAL ============

async function getCurrentHtml(projectName) {
  console.log(`📥 Obteniendo HTML actual de ${projectName}...\n`);

  const url = `https://${projectName}.pages.dev`;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const html = await res.text();
      console.log(`   ✅ HTML obtenido: ${html.length.toLocaleString()} chars\n`);
      return html;
    }
  } catch (e) {
    console.log(`   ⚠️ No se pudo obtener: ${e.message}`);
  }

  return null;
}

// ============ GENERAR MEJORA ============

async function generateImprovement(currentHtml, projectName) {
  console.log('🎨 Generando versión mejorada...\n');

  const updateTypes = [
    { type: 'visual', emoji: '🎨', desc: 'Mejoras visuales: colores, gradientes, sombras, tipografía' },
    { type: 'animation', emoji: '✨', desc: 'Más animaciones: hover effects, transiciones, micro-interacciones' },
    { type: 'content', emoji: '📝', desc: 'Más contenido: duplicar frases, añadir categorías, más opciones' },
    { type: 'interactive', emoji: '🎮', desc: 'Más interactividad: nuevos botones, efectos de sonido visual, easter eggs' },
    { type: 'performance', emoji: '⚡', desc: 'Optimización: mejor responsive, accesibilidad, PWA-ready' }
  ];

  const update = updateTypes[Math.floor(Math.random() * updateTypes.length)];
  console.log(`   📦 Tipo de mejora: ${update.emoji} ${update.type}\n`);

  const prompt = `Tienes este HTML de una app web de "Mi Pana Gillito":

\`\`\`html
${currentHtml.slice(0, 6000)}
\`\`\`

TAREA: Mejora esta app con enfoque en ${update.desc}

REGLAS:
1. Mantén TODA la funcionalidad existente
2. Mantén el mismo estilo visual (colores, fuentes)
3. AÑADE más contenido (mínimo 50% más)
4. MEJORA las animaciones CSS
5. MEJORA el JavaScript (más features)
6. El código debe ser COMPLETO y FUNCIONAL
7. Responde SOLO con el HTML completo mejorado

MEJORAS ESPECÍFICAS PARA ${update.type.toUpperCase()}:
${update.type === 'visual' ? '- Añade más gradientes, sombras, efectos glassmorphism\n- Mejora la tipografía y espaciado\n- Añade efectos hover más elaborados' : ''}
${update.type === 'animation' ? '- Añade @keyframes nuevos\n- Animaciones de entrada para elementos\n- Micro-interacciones en botones\n- Efectos de partículas CSS si aplica' : ''}
${update.type === 'content' ? '- DUPLICA la cantidad de frases/opciones\n- Añade nuevas categorías\n- Más variedad en el contenido\n- Mejora el copywriting' : ''}
${update.type === 'interactive' ? '- Añade más event listeners\n- Efectos de feedback visual\n- Keyboard shortcuts\n- Easter eggs ocultos' : ''}
${update.type === 'performance' ? '- Optimiza el CSS (combina selectores)\n- Mejora responsive para tablets\n- Añade meta tags de PWA\n- Mejora accesibilidad (ARIA)' : ''}

Responde SOLO con el código HTML completo.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Eres un experto en desarrollo web. Mejoras código existente manteniendo su funcionalidad y añadiendo features. Responde SOLO con código HTML completo.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 8000,
      temperature: 0.85
    })
  });

  const data = await res.json();
  let html = data.choices?.[0]?.message?.content || '';

  // Limpiar
  html = html.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

  return { html, updateType: update };
}

// ============ DEPLOY ACTUALIZACIÓN ============

async function deployUpdate(html, projectName) {
  console.log(`☁️ Desplegando actualización a ${projectName}...\n`);

  const formData = new FormData();
  const htmlBlob = new Blob([html], { type: 'text/html' });
  formData.append('file', htmlBlob, 'index.html');

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
        body: formData
      }
    );

    const result = await res.json();

    if (result.success) {
      const url = `https://${projectName}.pages.dev`;
      console.log(`   ✅ Actualizado: ${url}\n`);
      return { success: true, url };
    } else {
      console.log('   ❌ Error:', result.errors?.[0]?.message);
      return { success: false };
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return { success: false };
  }
}

// ============ MOLTBOOK ============

async function postToMoltbook(projectName, url, updateType, beforeSize, afterSize) {
  if (!MOLTBOOK_KEY) return { success: false };

  const changePercent = ((afterSize - beforeSize) / beforeSize * 100).toFixed(1);
  const changeEmoji = afterSize > beforeSize ? '📈' : '📉';

  const content = `¡ACTUALICÉ UNA DE MIS PÁGINAS! 🦞🔥

🌐 ${url}

${updateType.emoji} Mejora: ${updateType.type}
${changeEmoji} Tamaño: ${beforeSize.toLocaleString()} → ${afterSize.toLocaleString()} chars (${changePercent > 0 ? '+' : ''}${changePercent}%)

¡Visítenla y díganme qué tal quedó!

🇵🇷 Dios los cuide, que GILLITO los protegerá`;

  try {
    const res = await fetch('https://www.moltbook.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOLTBOOK_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submolt: 'general',
        title: `🔄 Actualicé: ${projectName}`,
        content
      })
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

// ============ MAIN ============

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       🦞 GILLITO WEB UPDATER - CLOUDFLARE 🔥              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Verificar secrets
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    console.error('❌ Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID');
    process.exit(1);
  }

  // Listar proyectos
  const projects = await listGillitoProjects();

  if (projects.length === 0) {
    console.log('⚠️ No hay proyectos de Gillito para actualizar');
    console.log('   Ejecuta primero deploy-website.js para crear uno\n');
    process.exit(0);
  }

  // Seleccionar proyecto (70% más viejo, 30% random)
  let project;
  if (Math.random() < 0.7) {
    // Ordenar por fecha de creación y tomar el más viejo
    projects.sort((a, b) => new Date(a.created_on) - new Date(b.created_on));
    project = projects[0];
    console.log(`📌 Seleccionado (más antiguo): ${project.name}\n`);
  } else {
    project = projects[Math.floor(Math.random() * projects.length)];
    console.log(`🎲 Seleccionado (random): ${project.name}\n`);
  }

  // Obtener HTML actual
  const currentHtml = await getCurrentHtml(project.name);

  if (!currentHtml) {
    console.error('❌ No se pudo obtener el HTML actual');
    process.exit(1);
  }

  const beforeSize = currentHtml.length;

  // Generar mejora
  const { html: newHtml, updateType } = await generateImprovement(currentHtml, project.name);

  if (!newHtml || newHtml.length < 1000) {
    console.error('❌ HTML mejorado inválido');
    process.exit(1);
  }

  const afterSize = newHtml.length;

  // Validar que tiene CSS y JS
  const hasStyle = newHtml.includes('<style');
  const hasScript = newHtml.includes('<script');

  console.log(`   📊 Antes: ${beforeSize.toLocaleString()} chars`);
  console.log(`   📊 Después: ${afterSize.toLocaleString()} chars`);
  console.log(`   📊 CSS: ${hasStyle ? '✅' : '❌'} | JS: ${hasScript ? '✅' : '❌'}\n`);

  if (!hasStyle || !hasScript) {
    console.log('⚠️ HTML sin CSS o JS, usando original mejorado...\n');
  }

  // Deploy
  const deployment = await deployUpdate(newHtml, project.name);

  if (!deployment.success) {
    console.error('❌ Falló el deploy');
    process.exit(1);
  }

  // Moltbook
  const post = await postToMoltbook(project.name, deployment.url, updateType, beforeSize, afterSize);
  console.log(`📢 Moltbook: ${post.success ? '✅' : '❌ (servidor caído)'}\n`);

  // Resumen
  console.log('═'.repeat(60));
  console.log(`🔄 Proyecto: ${project.name}`);
  console.log(`${updateType.emoji} Mejora: ${updateType.type}`);
  console.log(`📊 Cambio: ${beforeSize.toLocaleString()} → ${afterSize.toLocaleString()} chars`);
  console.log(`🌐 URL: ${deployment.url}`);
  console.log('═'.repeat(60));
  console.log('🦞 ¡GILLITO UPDATER COMPLETE! 🔥\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
