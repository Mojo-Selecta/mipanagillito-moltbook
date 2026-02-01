const GROQ_KEY = process.env.GROQ_API_KEY;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║                    🦞 GILLITO WEB UPDATER - CLOUDFLARE 🔥                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// ============ LISTAR PROYECTOS ============

async function listGillitoProjects() {
  console.log('📋 Buscando proyectos de Gillito...\n');

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

  const gillitoProjects = data.result.filter(p => p.name.startsWith('gillito-'));
  console.log(`   ✅ Encontrados: ${gillitoProjects.length} proyectos\n`);

  return gillitoProjects;
}

// ============ OBTENER HTML ACTUAL ============

async function getCurrentHtml(projectName) {
  console.log(`📥 Obteniendo HTML de ${projectName}...\n`);

  try {
    const res = await fetch(`https://${projectName}.pages.dev`);
    if (res.ok) {
      const html = await res.text();
      console.log(`   ✅ Obtenido: ${html.length.toLocaleString()} chars\n`);
      return html;
    }
  } catch (e) {
    console.log(`   ⚠️ Error: ${e.message}`);
  }

  return null;
}

// ============ GENERAR MEJORA ============

async function generateImprovement(currentHtml, projectName) {
  console.log('🎨 Generando mejora...\n');

  const updateTypes = [
    { type: 'visual', emoji: '🎨', desc: 'colores, gradientes, sombras' },
    { type: 'animation', emoji: '✨', desc: 'animaciones, transiciones, hover effects' },
    { type: 'content', emoji: '📝', desc: 'más frases, categorías, opciones' },
    { type: 'interactive', emoji: '🎮', desc: 'más botones, easter eggs, feedback' }
  ];

  const update = updateTypes[Math.floor(Math.random() * updateTypes.length)];
  console.log(`   📦 Tipo: ${update.emoji} ${update.type}\n`);

  const prompt = `Mejora este HTML con enfoque en ${update.desc}:

\`\`\`html
${currentHtml.slice(0, 6000)}
\`\`\`

REGLAS:
1. Mantén TODA la funcionalidad existente
2. AÑADE más contenido (mínimo 50% más)
3. MEJORA las animaciones CSS
4. Responde SOLO con HTML completo

NO explicaciones. SOLO código.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'Eres experto en desarrollo web. Mejoras código existente. Responde SOLO con HTML completo.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 8000,
      temperature: 0.85
    })
  });

  const data = await res.json();
  let html = data.choices?.[0]?.message?.content || '';
  html = html.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

  return { html, updateType: update };
}

// ============ DEPLOY CON MANIFEST (CORREGIDO) ============

async function deployUpdate(html, projectName) {
  console.log(`☁️ Desplegando a ${projectName}...\n`);

  const crypto = await import('crypto');
  const fileHash = crypto.createHash('sha256').update(html).digest('hex');

  try {
    const formData = new FormData();
    
    // Manifest con el hash del archivo
    const manifest = { '/index.html': fileHash };
    formData.append('manifest', JSON.stringify(manifest));
    
    // Archivo nombrado por su hash
    const htmlBlob = new Blob([html], { type: 'text/html' });
    formData.append(fileHash, htmlBlob, 'index.html');

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

  const content = `¡ACTUALICÉ UNA PÁGINA! 🦞🔥

🌐 ${url}

${updateType.emoji} Mejora: ${updateType.type}
📊 ${beforeSize.toLocaleString()} → ${afterSize.toLocaleString()} chars (${changePercent > 0 ? '+' : ''}${changePercent}%)

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
        title: `🔄 ${projectName}`,
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

  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    console.error('❌ Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID');
    process.exit(1);
  }

  // Listar proyectos
  const projects = await listGillitoProjects();

  if (projects.length === 0) {
    console.log('⚠️ No hay proyectos para actualizar\n');
    process.exit(0);
  }

  // Seleccionar (70% más viejo, 30% random)
  let project;
  if (Math.random() < 0.7) {
    projects.sort((a, b) => new Date(a.created_on) - new Date(b.created_on));
    project = projects[0];
    console.log(`📌 Seleccionado (antiguo): ${project.name}\n`);
  } else {
    project = projects[Math.floor(Math.random() * projects.length)];
    console.log(`🎲 Seleccionado (random): ${project.name}\n`);
  }

  // Obtener HTML actual
  const currentHtml = await getCurrentHtml(project.name);
  if (!currentHtml) {
    console.error('❌ No se pudo obtener HTML actual');
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

  console.log(`   📊 Antes: ${beforeSize.toLocaleString()} | Después: ${afterSize.toLocaleString()}\n`);

  // Deploy
  const deployment = await deployUpdate(newHtml, project.name);

  if (!deployment.success) {
    console.error('❌ Falló el deploy');
    process.exit(1);
  }

  // Moltbook
  const post = await postToMoltbook(project.name, deployment.url, updateType, beforeSize, afterSize);
  console.log(`📢 Moltbook: ${post.success ? '✅' : '❌'}\n`);

  // Resumen
  console.log('═'.repeat(60));
  console.log(`🔄 Proyecto: ${project.name}`);
  console.log(`${updateType.emoji} Mejora: ${updateType.type}`);
  console.log(`🌐 URL: ${deployment.url}`);
  console.log('═'.repeat(60));
  console.log('🦞 ¡UPDATER COMPLETE! 🔥\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
