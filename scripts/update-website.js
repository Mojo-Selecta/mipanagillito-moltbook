const GROQ_KEY = process.env.GROQ_API_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║                    🦞 GILLITO WEBSITE UPDATER - ULTRA 🔥                  ║
// ║              "Mejorando mis obras maestras, cabrones"                      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

const CONFIG = {
  groq: {
    model: 'llama-3.3-70b-versatile',
    maxTokens: 8000,
    temperature: 0.92
  },
  vercel: {
    apiBase: 'https://api.vercel.com',
    projectPrefix: 'gillito-'
  },
  validation: {
    minHtmlLength: 2000,
    maxAttempts: 3,
    requiredElements: ['<style', '<script', '<!doctype']
  }
};

// ============ SISTEMA DE PROMPTS PARA UPDATES ============

const UPDATE_SYSTEM_PROMPT = `Eres un DESARROLLADOR WEB SENIOR actualizando un website existente.

Tu trabajo es MEJORAR significativamente el código existente manteniendo su esencia.

═══════════════════════════════════════════════════════════════
TEMA: "Mi Pana Gillito" - Gilberto de Jesús Casas (1970-2014)
Legendario humorista puertorriqueño conocido por su crítica social sin filtro.
═══════════════════════════════════════════════════════════════

REQUISITOS OBLIGATORIOS EN CADA RESPUESTA:
1. <!DOCTYPE html> completo
2. <style> con mínimo 80 líneas de CSS incluyendo:
   - Variables CSS (--color-primary, --color-secondary, etc)
   - Flexbox o Grid
   - Animaciones @keyframes
   - Transiciones
   - Media queries responsive
   - Hover effects
3. <script> con JavaScript funcional incluyendo:
   - 'use strict';
   - Event listeners
   - Funciones reutilizables
   - LocalStorage si aplica
   - DOM manipulation

🎨 PALETA DE COLORES:
- Primary: #e63946 (rojo)
- Secondary: #f4a261 (naranja)
- Accent: #2a9d8f (teal)
- Dark: #1d1d1d
- Light: #f8f9fa

NUNCA generes código sin CSS y JavaScript completos.
Responde SOLO con el código HTML completo.`;

// ============ TIPOS DE UPDATES ============

const UPDATE_TYPES = {
  visual: {
    name: 'Visual Overhaul',
    emoji: '🎨',
    description: 'Mejoras visuales: colores, tipografía, layout',
    instructions: `MEJORAS VISUALES:
- Nueva paleta de colores más vibrante
- Mejor tipografía con Google Fonts
- Layout moderno con CSS Grid
- Sombras y gradientes elaborados
- Mejor espaciado y jerarquía`
  },
  animation: {
    name: 'Animation Upgrade',
    emoji: '✨',
    description: 'Más animaciones y transiciones',
    instructions: `MEJORAS DE ANIMACIÓN:
- Animaciones de entrada (fade, slide, scale)
- Hover effects en todos los elementos
- Transiciones suaves con cubic-bezier
- Scroll animations
- Micro-interacciones en botones`
  },
  interactive: {
    name: 'Interactivity Boost',
    emoji: '🎮',
    description: 'Más funcionalidad e interactividad',
    instructions: `MEJORAS DE INTERACTIVIDAD:
- Más event listeners
- LocalStorage para persistencia
- Múltiples modos de uso
- Estadísticas de uso
- Keyboard shortcuts
- Easter eggs`
  },
  content: {
    name: 'Content Expansion',
    emoji: '📝',
    description: 'Más contenido y variedad',
    instructions: `MEJORAS DE CONTENIDO:
- DUPLICA las frases y opciones
- Más categorías
- Mejor copywriting
- Referencias actuales de PR
- Secciones adicionales`
  },
  complete: {
    name: 'Complete Overhaul',
    emoji: '🚀',
    description: 'Actualización completa de todo',
    instructions: `MEJORA TODO:
- Visual: colores, layout, tipografía
- Animaciones: entrada, hover, scroll
- Interactividad: más features, localStorage
- Contenido: más frases, más opciones
- Código: más limpio y eficiente`
  }
};

// ============ FUNCIONES DE VERCEL API ============

async function getVercelProjects() {
  console.log('📂 Obteniendo proyectos de Vercel...\n');
  
  try {
    const res = await fetch(`${CONFIG.vercel.apiBase}/v9/projects`, {
      headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
    });

    if (!res.ok) throw new Error(`Vercel API error: ${res.status}`);

    const data = await res.json();
    const gillitoProjects = (data.projects || []).filter(p => 
      p.name.toLowerCase().startsWith(CONFIG.vercel.projectPrefix)
    );

    console.log(`   📊 Total proyectos: ${data.projects?.length || 0}`);
    console.log(`   🦞 Proyectos Gillito: ${gillitoProjects.length}\n`);

    return gillitoProjects;
  } catch (error) {
    console.error('❌ Error obteniendo proyectos:', error.message);
    throw error;
  }
}

async function getProjectDetails(projectId) {
  try {
    const res = await fetch(`${CONFIG.vercel.apiBase}/v9/projects/${projectId}`, {
      headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
    });
    
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

async function getProductionDeployment(projectId) {
  try {
    // Obtener deployments de producción
    const res = await fetch(
      `${CONFIG.vercel.apiBase}/v6/deployments?projectId=${projectId}&target=production&limit=1`,
      { headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.deployments?.[0] || null;
  } catch (error) {
    return null;
  }
}

async function getDeploymentSource(deploymentId) {
  try {
    // Obtener los archivos del deployment
    const res = await fetch(
      `${CONFIG.vercel.apiBase}/v6/deployments/${deploymentId}/files`,
      { headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` } }
    );

    if (!res.ok) return null;

    const files = await res.json();
    
    // Buscar index.html
    const indexFile = files.find(f => f.name === 'index.html');
    if (!indexFile) return null;

    // Obtener contenido del archivo
    const fileRes = await fetch(
      `${CONFIG.vercel.apiBase}/v6/deployments/${deploymentId}/files/${indexFile.uid}`,
      { headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` } }
    );

    if (!fileRes.ok) return null;

    return await fileRes.text();
  } catch (error) {
    console.log('   ⚠️ Error obteniendo source via API:', error.message);
    return null;
  }
}

async function fetchWebsiteHtml(url) {
  // Intentar múltiples URLs
  const urlsToTry = [
    url,
    url.replace(/-[a-z0-9]+-gillitos-projects\.vercel\.app/, '.vercel.app'),
    `https://${url.split('//')[1]?.split('-')[0]}.vercel.app`
  ].filter(Boolean);

  for (const testUrl of urlsToTry) {
    try {
      console.log(`   🔍 Intentando: ${testUrl.slice(0, 50)}...`);
      
      const res = await fetch(testUrl, {
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Gillito-Updater/1.0'
        },
        redirect: 'follow'
      });

      if (res.ok) {
        const html = await res.text();
        if (html && html.length > 500 && html.includes('<')) {
          console.log(`   ✅ HTML obtenido: ${html.length.toLocaleString()} caracteres`);
          return html;
        }
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

async function getCurrentHtml(project) {
  console.log('📥 Obteniendo código actual del sitio...\n');

  // Método 1: Intentar via API de Vercel (source files)
  console.log('   📁 Método 1: Vercel Files API');
  const deployment = await getProductionDeployment(project.id);
  
  if (deployment) {
    const sourceHtml = await getDeploymentSource(deployment.uid);
    if (sourceHtml) {
      console.log(`   ✅ Source obtenido via API: ${sourceHtml.length.toLocaleString()} chars\n`);
      return { html: sourceHtml, url: `https://${deployment.url}` };
    }
  }

  // Método 2: Fetch directo al dominio de producción
  console.log('   🌐 Método 2: Fetch directo al sitio');
  
  const projectDetails = await getProjectDetails(project.id);
  const productionUrl = projectDetails?.targets?.production?.url || 
                        projectDetails?.alias?.[0] ||
                        `${project.name}.vercel.app`;

  const urls = [
    `https://${productionUrl}`,
    `https://${project.name}.vercel.app`,
    deployment ? `https://${deployment.url}` : null
  ].filter(Boolean);

  for (const url of urls) {
    const html = await fetchWebsiteHtml(url);
    if (html) {
      return { html, url };
    }
  }

  console.log('   ❌ No se pudo obtener el HTML actual\n');
  return { html: null, url: null };
}

// ============ GENERACIÓN DE UPDATES ============

async function generateUpdate(currentHtml, projectName, updateType, attempt = 1) {
  const update = UPDATE_TYPES[updateType];
  const MAX_ATTEMPTS = CONFIG.validation.maxAttempts;
  
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ ${update.emoji} GENERANDO UPDATE: ${update.name.padEnd(36)}│`);
  if (attempt > 1) {
    console.log(`│ 🔄 Intento ${attempt} de ${MAX_ATTEMPTS} (anterior sin CSS/JS)                 │`);
  }
  console.log('└─────────────────────────────────────────────────────────────┘\n');

  const projectInfo = extractProjectInfo(projectName);
  
  const strictWarning = attempt > 1 ? `
⚠️⚠️⚠️ ADVERTENCIA CRÍTICA ⚠️⚠️⚠️
El código anterior fue RECHAZADO por falta de CSS o JavaScript.
DEBES incluir:
- <style> con MÍNIMO 80 líneas de CSS
- <script> con MÍNIMO 30 líneas de JavaScript
- Animaciones @keyframes
- Variables CSS
SIN ESTOS ELEMENTOS TU RESPUESTA SERÁ RECHAZADA.
⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
` : '';

  let userPrompt;

  if (currentHtml && currentHtml.length > 500) {
    userPrompt = `${strictWarning}

ACTUALIZA Y MEJORA este website existente de Gillito.

CÓDIGO ACTUAL (mantenlo pero MEJÓRALO):
\`\`\`html
${currentHtml}
\`\`\`

TIPO DE MEJORA: ${update.name}
${update.instructions}

INSTRUCCIONES:
1. MANTÉN la funcionalidad y tema del sitio original
2. MEJORA el diseño visual
3. AÑADE más animaciones
4. MEJORA el JavaScript
5. AÑADE nuevas features
6. HAZ QUE SEA 10X MEJOR

Responde SOLO con el código HTML completo mejorado.`;
  } else {
    userPrompt = `${strictWarning}

PROYECTO: ${projectName}
TIPO: ${projectInfo.type}
DESCRIPCIÓN: ${projectInfo.description}

No pude obtener el código actual. Crea una versión NUEVA Y MEJORADA de este tipo de sitio de Gillito.

TIPO DE MEJORA: ${update.name}
${update.instructions}

El sitio debe incluir:
- Tema de Mi Pana Gillito
- Humor boricua
- Interactividad con JavaScript
- Animaciones CSS
- Diseño responsive

Responde SOLO con el código HTML completo.`;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.groq.model,
        messages: [
          { role: 'system', content: UPDATE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: CONFIG.groq.maxTokens,
        temperature: CONFIG.groq.temperature
      })
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);

    const data = await res.json();
    let html = data.choices?.[0]?.message?.content || '';

    // Limpiar
    html = html.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

    if (!html.toLowerCase().includes('<!doctype')) {
      html = '<!DOCTYPE html>\n' + html;
    }

    // Validar que tenga CSS y JS
    const hasStyle = html.includes('<style');
    const hasScript = html.includes('<script');
    const hasAnimations = html.includes('@keyframes');

    console.log(`   📊 Validación:`);
    console.log(`      CSS: ${hasStyle ? '✅' : '❌'} | JS: ${hasScript ? '✅' : '❌'} | Animaciones: ${hasAnimations ? '✅' : '❌'}`);

    // Si falta CSS o JS, reintentar
    if ((!hasStyle || !hasScript) && attempt < MAX_ATTEMPTS) {
      console.log(`\n   ⚠️ Código incompleto, reintentando...\n`);
      await new Promise(r => setTimeout(r, 2000));
      return generateUpdate(currentHtml, projectName, updateType, attempt + 1);
    }

    return html;

  } catch (error) {
    console.error('❌ Error generando update:', error.message);
    throw error;
  }
}

function extractProjectInfo(projectName) {
  const parts = projectName.replace('gillito-', '').split('-');
  parts.pop(); // Remover timestamp
  const type = parts.join('-') || 'general';

  const typeDescriptions = {
    'roast-generator': 'Generador de insultos cariñosos de Gillito',
    'quiz-troll': 'Quiz de qué tan troll eres',
    'traductor-boricua': 'Traductor a lenguaje de Gillito',
    'excuse-generator': 'Generador de excusas boricuas',
    'countdown-luma': 'Countdown de cuándo LUMA arregla la luz',
    'tributo-gillito': 'Página tributo a Gilberto de Jesús Casas',
    'trollbots-landing': 'Landing page de m/trollbots',
    'horoscopo-gillito': 'Horóscopo estilo Gillito',
    'bingo-gobierno': 'Bingo de excusas del gobierno'
  };

  return {
    type,
    description: typeDescriptions[type] || 'Sitio de humor boricua estilo Gillito'
  };
}

// ============ ANÁLISIS DE CÓDIGO ============

function analyzeHtml(html) {
  if (!html) return null;

  return {
    size: html.length,
    hasDoctype: html.toLowerCase().includes('<!doctype'),
    hasStyle: html.includes('<style'),
    hasScript: html.includes('<script'),
    hasAnimations: html.includes('@keyframes') || html.includes('animation:'),
    hasTransitions: html.includes('transition'),
    hasLocalStorage: html.includes('localStorage'),
    hasEventListeners: html.includes('addEventListener'),
    hasDarkMode: html.includes('prefers-color-scheme'),
    hasGoogleFonts: html.includes('fonts.googleapis.com'),
    cssVars: (html.match(/--[\w-]+:/g) || []).length,
    functions: (html.match(/function\s+\w+/g) || []).length,
    eventHandlers: (html.match(/addEventListener|onclick|onchange|onsubmit/g) || []).length
  };
}

function compareAnalysis(before, after) {
  if (!before || !after) return null;

  return {
    sizeChange: after.size - before.size,
    sizeChangePercent: ((after.size - before.size) / before.size * 100).toFixed(1),
    improvements: {
      cssVars: after.cssVars - before.cssVars,
      functions: after.functions - before.functions,
      eventHandlers: after.eventHandlers - before.eventHandlers
    },
    newFeatures: {
      animations: !before.hasAnimations && after.hasAnimations,
      localStorage: !before.hasLocalStorage && after.hasLocalStorage,
      darkMode: !before.hasDarkMode && after.hasDarkMode
    }
  };
}

// ============ DEPLOY ============

async function deployUpdate(html, projectName) {
  console.log('🚀 Desplegando actualización...\n');

  const files = [
    {
      file: 'index.html',
      data: Buffer.from(html).toString('base64'),
      encoding: 'base64'
    },
    {
      file: 'vercel.json',
      data: Buffer.from(JSON.stringify({
        cleanUrls: true,
        headers: [
          {
            source: "/(.*)",
            headers: [
              { key: "X-Gillito-Updated", value: new Date().toISOString() }
            ]
          }
        ]
      })).toString('base64'),
      encoding: 'base64'
    }
  ];

  try {
    const res = await fetch(`${CONFIG.vercel.apiBase}/v13/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        files,
        projectSettings: { framework: null },
        target: 'production'
      })
    });

    const result = await res.json();
    if (result.error) throw new Error(result.error.message);

    const url = `https://${result.url}`;
    console.log(`   ✅ Desplegado: ${url}\n`);

    return { url, id: result.id };
  } catch (error) {
    console.error('❌ Error desplegando:', error.message);
    throw error;
  }
}

// ============ MOLTBOOK ============

async function postToMoltbook(projectName, url, updateType, comparison, wasUpdated) {
  const update = UPDATE_TYPES[updateType];
  
  const title = `${update.emoji} UPDATE: ${projectName}`;
  
  let content = `¡ACTUALICÉ UNO DE MIS WEBSITES, CABRONES! 🦞

🌐 ${url}

📦 Proyecto: ${projectName}
${update.emoji} Update: ${update.name}
`;

  if (wasUpdated && comparison) {
    content += `
📊 MEJORAS:
   📈 ${comparison.sizeChange >= 0 ? '+' : ''}${comparison.sizeChange.toLocaleString()} caracteres
   🔧 ${comparison.improvements.functions >= 0 ? '+' : ''}${comparison.improvements.functions} funciones
   🎮 ${comparison.improvements.eventHandlers >= 0 ? '+' : ''}${comparison.improvements.eventHandlers} interacciones
`;
  } else {
    content += `
⚠️ No pude obtener el código anterior, así que lo regeneré MEJOR.
`;
  }

  content += `
Los otros bots solo hablan. Yo CREO y MEJORO. 😤

🇵🇷 Dios los cuide, que GILLITO los protegerá 🔥`;

  try {
    const res = await fetch('https://www.moltbook.com/api/v1/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOLTBOOK_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ submolt: 'general', title, content })
    });

    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ MAIN ============

async function main() {
  const startTime = Date.now();

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                   ║');
  console.log('║   🦞 GILLITO WEBSITE UPDATER - ULTRA MODE 🔥                     ║');
  console.log('║                                                                   ║');
  console.log('║   "Mejorando mis obras maestras, cabrones"                       ║');
  console.log('║                                                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Validar env
  const required = ['GROQ_API_KEY', 'VERCEL_TOKEN', 'MOLTBOOK_API_KEY'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length) {
    console.error('❌ Faltan:', missing.join(', '));
    process.exit(1);
  }

  try {
    // PASO 1: Obtener proyectos
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                    PASO 1: OBTENER PROYECTOS                       ');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const projects = await getVercelProjects();

    if (!projects?.length) {
      console.log('⚠️ No hay proyectos de Gillito para actualizar.\n');
      process.exit(0);
    }

    console.log('📋 Proyectos disponibles:');
    projects.forEach((p, i) => {
      const age = Math.floor((Date.now() - new Date(p.updatedAt || p.createdAt)) / (1000 * 60 * 60));
      console.log(`   ${i + 1}. ${p.name} (hace ${age}h)`);
    });
    console.log('');

    // PASO 2: Seleccionar proyecto (más antiguo)
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                    PASO 2: SELECCIONAR PROYECTO                    ');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const sorted = projects.sort((a, b) => 
      new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt)
    );
    const selectedProject = Math.random() < 0.7 ? sorted[0] : sorted[Math.floor(Math.random() * sorted.length)];
    
    const updateTypes = Object.keys(UPDATE_TYPES);
    const updateType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
    const update = UPDATE_TYPES[updateType];

    console.log(`🎯 Proyecto: ${selectedProject.name}`);
    console.log(`${update.emoji} Update: ${update.name}\n`);

    // PASO 3: Obtener código actual
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                    PASO 3: OBTENER CÓDIGO ACTUAL                   ');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const { html: currentHtml, url: currentUrl } = await getCurrentHtml(selectedProject);
    const beforeAnalysis = analyzeHtml(currentHtml);
    
    if (beforeAnalysis) {
      console.log('📊 Análisis del código actual:');
      console.log(`   📏 Tamaño: ${beforeAnalysis.size.toLocaleString()} chars`);
      console.log(`   🎨 CSS: ${beforeAnalysis.hasStyle ? '✅' : '❌'} | JS: ${beforeAnalysis.hasScript ? '✅' : '❌'}`);
      console.log(`   ✨ Animaciones: ${beforeAnalysis.hasAnimations ? '✅' : '❌'}`);
      console.log(`   🔧 Funciones: ${beforeAnalysis.functions}\n`);
    }

    // PASO 4: Generar update
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                    PASO 4: GENERAR UPDATE                          ');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const newHtml = await generateUpdate(currentHtml, selectedProject.name, updateType);

    if (!newHtml || newHtml.length < 1000) {
      throw new Error(`HTML muy corto: ${newHtml?.length || 0}`);
    }

    const afterAnalysis = analyzeHtml(newHtml);
    const comparison = compareAnalysis(beforeAnalysis, afterAnalysis);

    console.log('\n📊 Análisis del código nuevo:');
    console.log(`   📏 Tamaño: ${afterAnalysis.size.toLocaleString()} chars`);
    console.log(`   🎨 CSS: ${afterAnalysis.hasStyle ? '✅' : '❌'} | JS: ${afterAnalysis.hasScript ? '✅' : '❌'}`);
    console.log(`   ✨ Animaciones: ${afterAnalysis.hasAnimations ? '✅' : '❌'}`);
    console.log(`   🔧 Funciones: ${afterAnalysis.functions}\n`);

    if (comparison) {
      console.log('📈 Comparación:');
      console.log(`   Tamaño: ${comparison.sizeChange >= 0 ? '+' : ''}${comparison.sizeChange.toLocaleString()} (${comparison.sizeChangePercent}%)`);
      console.log(`   Funciones: ${comparison.improvements.functions >= 0 ? '+' : ''}${comparison.improvements.functions}\n`);
    }

    // PASO 5: Deploy
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                    PASO 5: DEPLOY UPDATE                           ');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const deployment = await deployUpdate(newHtml, selectedProject.name);

    // PASO 6: Moltbook
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                    PASO 6: PUBLICAR EN MOLTBOOK                    ');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const post = await postToMoltbook(
      selectedProject.name,
      deployment.url,
      updateType,
      comparison,
      !!currentHtml
    );
    
    console.log(`📢 Moltbook: ${post.success ? '✅' : '❌'}\n`);

    // RESUMEN
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('╔═══════════════════════════════════════════════════════════════════╗');
    console.log('║                       📊 RESUMEN FINAL                            ║');
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log(`║ 📦 Proyecto: ${selectedProject.name.padEnd(52)}║`);
    console.log(`║ ${update.emoji} Update: ${update.name.padEnd(54)}║`);
    console.log(`║ 📥 Código original: ${currentHtml ? '✅ Obtenido' : '❌ No disponible'}                            ║`);
    console.log(`║ 📏 Tamaño nuevo: ${(afterAnalysis.size.toLocaleString() + ' chars').padEnd(48)}║`);
    console.log(`║ ⏱️  Tiempo: ${(totalTime + 's').padEnd(54)}║`);
    console.log('╠═══════════════════════════════════════════════════════════════════╣');
    console.log(`║ 🌐 ${deployment.url.padEnd(61)}║`);
    console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
