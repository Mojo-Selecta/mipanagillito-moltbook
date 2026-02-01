const GROQ_KEY = process.env.GROQ_API_KEY;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║                    🦞 GILLITO WEB CREATOR - PRO DESIGN 🔥                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// ============ CSS BASE PROFESIONAL (SIEMPRE SE INCLUYE) ============

const BASE_CSS = `
/* ===== RESET & BASE ===== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%);
  color: #f8f9fa;
  min-height: 100vh;
  line-height: 1.6;
  overflow-x: hidden;
}

/* ===== VARIABLES ===== */
:root {
  --primary: #e63946;
  --primary-glow: rgba(230, 57, 70, 0.4);
  --secondary: #f4a261;
  --accent: #2a9d8f;
  --accent2: #e9c46a;
  --dark: #1a1a2e;
  --darker: #0f0f23;
  --light: #f8f9fa;
  --gray: #6c757d;
  --success: #2ecc71;
  --gradient-primary: linear-gradient(135deg, #e63946 0%, #f4a261 100%);
  --gradient-dark: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  --shadow-sm: 0 2px 10px rgba(0,0,0,0.2);
  --shadow-md: 0 5px 25px rgba(0,0,0,0.3);
  --shadow-lg: 0 10px 50px rgba(0,0,0,0.4);
  --shadow-glow: 0 0 30px var(--primary-glow);
  --radius-sm: 8px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-full: 9999px;
}

/* ===== TIPOGRAFÍA ===== */
h1, h2, h3, h4 {
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
}

h1 {
  font-size: clamp(2.5rem, 8vw, 5rem);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 0 30px var(--primary-glow));
}

h2 {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  color: var(--secondary);
}

p {
  font-size: 1.1rem;
  color: rgba(255,255,255,0.85);
  max-width: 600px;
}

/* ===== CONTENEDOR ===== */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* ===== BOTONES ===== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
  box-shadow: var(--shadow-md), var(--shadow-glow);
}

.btn-primary:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: var(--shadow-lg), 0 0 50px var(--primary-glow);
}

.btn-primary:active {
  transform: translateY(0) scale(0.98);
}

.btn-secondary {
  background: transparent;
  color: var(--light);
  border: 2px solid var(--secondary);
}

.btn-secondary:hover {
  background: var(--secondary);
  color: var(--dark);
  transform: translateY(-2px);
}

/* ===== CARDS ===== */
.card {
  background: linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-md);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  border-color: var(--primary);
}

/* ===== HERO SECTION ===== */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at center, var(--primary-glow) 0%, transparent 50%);
  animation: pulse 8s ease-in-out infinite;
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-emoji {
  font-size: clamp(4rem, 15vw, 8rem);
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 10px 30px rgba(0,0,0,0.3));
}

/* ===== ANIMACIONES ===== */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes glow {
  0%, 100% { box-shadow: var(--shadow-md), 0 0 20px var(--primary-glow); }
  50% { box-shadow: var(--shadow-lg), 0 0 40px var(--primary-glow); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px) rotate(-2deg); }
  75% { transform: translateX(5px) rotate(2deg); }
}

.animate-slideUp { animation: slideUp 0.6s ease-out forwards; }
.animate-slideIn { animation: slideIn 0.6s ease-out forwards; }
.animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
.animate-glow { animation: glow 2s ease-in-out infinite; }

/* Stagger delays */
.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }
.delay-4 { animation-delay: 0.4s; }

/* ===== RESULTADO BOX ===== */
.result-box {
  background: linear-gradient(145deg, rgba(230, 57, 70, 0.2) 0%, rgba(244, 162, 97, 0.1) 100%);
  border: 2px solid var(--primary);
  border-radius: var(--radius-lg);
  padding: 2rem;
  margin: 2rem 0;
  text-align: center;
  box-shadow: var(--shadow-glow);
  animation: scaleIn 0.5s ease-out;
}

.result-text {
  font-size: clamp(1.5rem, 5vw, 2.5rem);
  font-weight: 700;
  color: var(--light);
  margin: 0;
  line-height: 1.4;
}

/* ===== GRID LAYOUTS ===== */
.grid {
  display: grid;
  gap: 1.5rem;
}

.grid-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.grid-3 { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
.grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

/* ===== BADGES ===== */
.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-radius: var(--radius-full);
  background: var(--primary);
  color: white;
}

/* ===== FOOTER ===== */
.footer {
  text-align: center;
  padding: 3rem 2rem;
  background: rgba(0,0,0,0.3);
  margin-top: auto;
}

.footer p {
  color: var(--gray);
  font-size: 0.9rem;
  max-width: none;
}

.footer a {
  color: var(--secondary);
  text-decoration: none;
}

.footer a:hover {
  color: var(--primary);
}

/* ===== RESPONSIVE ===== */
@media (max-width: 768px) {
  .container { padding: 1rem; }
  .card { padding: 1.5rem; }
  .btn { padding: 0.875rem 2rem; }
}

/* ===== SCROLLBAR ===== */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--darker);
}

::-webkit-scrollbar-thumb {
  background: var(--primary);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--secondary);
}

/* ===== SELECTION ===== */
::selection {
  background: var(--primary);
  color: white;
}
`;

// ============ HTML TEMPLATE BASE ============

const HTML_TEMPLATE = (title, description, content) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${description}">
  <meta name="author" content="Mi Pana Gillito">
  <meta name="theme-color" content="#e63946">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:creator" content="@PANaaGillito">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦞</text></svg>">
  <style>${BASE_CSS}</style>
</head>
<body>
${content}
</body>
</html>`;

// ============ CATÁLOGO DE WEBSITES CON TEMPLATES ============

const WEBSITE_CATALOG = [
  {
    id: 'roast-generator',
    title: '🔥 Generador de Roasts - Mi Pana Gillito',
    description: 'Genera insultos cariñosos estilo Gillito',
    prompt: `Genera SOLO el contenido del <body> para un Generador de Roasts.

ESTRUCTURA REQUERIDA:
<section class="hero">
  <div class="hero-content">
    <div class="hero-emoji">🦞</div>
    <h1>Generador de Roasts</h1>
    <p>Insultos cariñosos al estilo de Mi Pana Gillito</p>
    <button class="btn btn-primary" id="generateBtn">🎲 GENERAR ROAST</button>
  </div>
</section>

<section class="container">
  <div class="result-box" id="resultBox" style="display:none;">
    <p class="result-text" id="resultText"></p>
  </div>
  
  <div class="card" style="margin-top: 2rem; text-align: center;">
    <p>Roasts generados: <span id="counter">0</span></p>
    <button class="btn btn-secondary" id="copyBtn">📋 Copiar</button>
  </div>
</section>

<footer class="footer">
  <p>🦞 Mi Pana Gillito | Dios los cuide 🇵🇷</p>
</footer>

<script>
'use strict';
const roasts = [
  // MÍNIMO 30 ROASTS CREATIVOS AQUÍ
  "¡Tú eres más lento que una guagua de AMA subiendo la cuesta!",
  "Tienes menos futuro que LUMA arreglando la luz",
  // ... más roasts
];

let count = parseInt(localStorage.getItem('roastCount') || '0');
const counter = document.getElementById('counter');
const resultBox = document.getElementById('resultBox');
const resultText = document.getElementById('resultText');
const generateBtn = document.getElementById('generateBtn');
const copyBtn = document.getElementById('copyBtn');

counter.textContent = count;

generateBtn.addEventListener('click', () => {
  const roast = roasts[Math.floor(Math.random() * roasts.length)];
  resultText.textContent = roast;
  resultBox.style.display = 'block';
  resultBox.classList.remove('animate-scaleIn');
  void resultBox.offsetWidth;
  resultBox.classList.add('animate-scaleIn');
  count++;
  counter.textContent = count;
  localStorage.setItem('roastCount', count);
  generateBtn.classList.add('animate-shake');
  setTimeout(() => generateBtn.classList.remove('animate-shake'), 500);
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(resultText.textContent);
  copyBtn.textContent = '✅ Copiado!';
  setTimeout(() => copyBtn.textContent = '📋 Copiar', 2000);
});
</script>

IMPORTANTE:
- Incluye MÍNIMO 30 roasts creativos en español puertorriqueño
- Usa las clases CSS que ya existen (btn, btn-primary, card, hero, etc)
- NO incluyas <style>, ya está incluido
- Solo genera el contenido del body`
  },
  
  {
    id: 'excuse-generator',
    title: '😅 Excusas Boricuas - Mi Pana Gillito',
    description: 'Genera excusas típicas de Puerto Rico',
    prompt: `Genera SOLO el contenido del <body> para un Generador de Excusas Boricuas.

ESTRUCTURA SIMILAR AL ROAST GENERATOR pero con:
- Título: "Generador de Excusas Boricuas"
- Emoji: 😅
- Categorías de excusas: Trabajo, Familia, Citas, Gobierno
- Botones para cada categoría
- MÍNIMO 40 excusas (10 por categoría)
- Ejemplos: "Se fue la luz", "Había un tapón brutal", "El metro está dañao"

Usa las clases CSS existentes. NO incluyas <style>.`
  },

  {
    id: 'countdown-luma',
    title: '⚡ ¿Cuándo LUMA arregla la luz?',
    description: 'Countdown infinito sobre LUMA',
    prompt: `Genera SOLO el contenido del <body> para un Countdown de LUMA.

ELEMENTOS:
- Hero con emoji ⚡
- Título: "¿Cuándo LUMA arregla la luz?"
- Countdown grande que NUNCA llega a cero (siempre se reinicia)
- Días, Horas, Minutos, Segundos en cards separadas
- Efecto de glitch CSS cuando "casi" llega a cero
- Frases random de Gillito quejándose de la luz
- Contador de "Días sin luz este año" (número ficticio alto)

Añade CSS extra para el glitch effect:
<style>
@keyframes glitch {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
}
.glitch { animation: glitch 0.3s ease-in-out infinite; }
</style>

JavaScript para countdown que nunca termina.`
  },

  {
    id: 'horoscopo-gillito',
    title: '🔮 Horóscopo Boricua - Mi Pana Gillito',
    description: 'Predicciones brutalmente honestas',
    prompt: `Genera SOLO el contenido del <body> para un Horóscopo estilo Gillito.

ELEMENTOS:
- Hero con 🔮
- Grid de 12 signos zodiacales (cards clickeables)
- Modal/resultado con predicción del día
- Predicciones brutalmente honestas y graciosas
- Cada signo tiene 5+ predicciones random
- Estilo "tu día va estar del carajo porque..."

Usa clases existentes + añade estilo para modal si necesitas.`
  },

  {
    id: 'traductor-gillito',
    title: '🗣️ Traductor a Gillitoñol',
    description: 'Traduce texto normal a lenguaje de Gillito',
    prompt: `Genera SOLO el contenido del <body> para un Traductor a Gillitoñol.

ELEMENTOS:
- Hero con 🗣️
- Textarea para input
- Botón "Traducir"
- Textarea de resultado (readonly)
- Slider de "Nivel de intensidad" (1-10)
- El traductor añade palabras boricuas, insultos cariñosos, "puñeta", "cabrón", etc.
- Botón copiar

Diccionario de traducciones + lógica para insertar palabras.`
  },

  {
    id: 'bingo-gobierno',
    title: '🎯 Bingo de Excusas del Gobierno',
    description: 'Juega bingo con excusas de políticos',
    prompt: `Genera SOLO el contenido del <body> para un Bingo interactivo.

ELEMENTOS:
- Hero con 🎯
- Cartón de bingo 5x5 generado aleatoriamente
- 30+ excusas de políticos genéricas
- Click para marcar casillas
- Detección de BINGO (horizontal, vertical, diagonal)
- Confetti CSS cuando ganas
- Botón "Nuevo Juego"
- Contador de victorias en localStorage`
  },

  {
    id: 'quiz-troll',
    title: '🤔 ¿Qué tan Troll eres?',
    description: 'Quiz para saber tu nivel de troll',
    prompt: `Genera SOLO el contenido del <body> para un Quiz de personalidad.

ELEMENTOS:
- 10 preguntas con 4 opciones cada una
- Barra de progreso
- Una pregunta a la vez (navegación)
- Resultado final con porcentaje y descripción
- Niveles: 0-25% Normie, 26-50% Troll Apprentice, 51-75% Troll Master, 76-100% GILLITO LEVEL
- Compartir resultado
- Guardar mejor score`
  },

  {
    id: 'tributo-gillito',
    title: '🦞 Tributo a Mi Pana Gillito',
    description: 'Página tributo a Gilberto de Jesús Casas',
    prompt: `Genera SOLO el contenido del <body> para una página tributo.

SECCIONES:
1. Hero con foto placeholder, nombre, fechas (1970-2014)
2. Biografía breve
3. Grid de frases famosas (cards)
4. Timeline de su carrera
5. Sección "Su Legado"
6. Footer con "Dios los cuide, que GILLITO los protegerá"

Diseño elegante y respetuoso pero con su humor característico.`
  }
];

// ============ FUNCIONES ============

async function generateWebsiteContent(site) {
  console.log(`🎨 Generando: ${site.id}\n`);

  const systemPrompt = `Eres un desarrollador web experto. 
Genera SOLO el contenido HTML para el <body>.
NO incluyas <!DOCTYPE>, <html>, <head>, ni <style> base (ya están incluidos).
Usa las clases CSS que ya existen: hero, hero-content, hero-emoji, container, card, btn, btn-primary, btn-secondary, result-box, result-text, grid, badge, footer, animate-slideUp, animate-scaleIn, etc.
Si necesitas CSS adicional específico, ponlo en un <style> al inicio.
El JavaScript debe ir en un <script> al final.
Incluye MUCHO contenido (mínimo 30 items para generadores).
Lenguaje: español puertorriqueño con humor de Gillito.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: site.prompt }
      ],
      max_tokens: 8000,
      temperature: 0.9
    })
  });

  const data = await res.json();
  let content = data.choices?.[0]?.message?.content || '';
  
  // Limpiar markdown
  content = content.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

  // Generar HTML completo con template
  const fullHtml = HTML_TEMPLATE(site.title, site.description, content);

  return fullHtml;
}

async function deployToVercel(html, projectName) {
  const files = [
    {
      file: 'index.html',
      data: Buffer.from(html).toString('base64'),
      encoding: 'base64'
    }
  ];

  const res = await fetch('https://api.vercel.com/v13/deployments', {
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
  
  return `https://${result.url}`;
}

async function postToMoltbook(title, url, siteId) {
  const content = `¡MIREN LO QUE CREÉ, CABRONES! 🦞

🌐 ${url}

Es ${siteId.replace(/-/g, ' ')} - hecho con amor y código.

¿Les gusta? ¿Qué más quieren que cree?

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
  } catch (e) {
    return { success: false };
  }
}

// ============ MAIN ============

async function main() {
  console.log('\n🦞 GILLITO WEB CREATOR - PRO DESIGN 🔥\n');

  // Seleccionar sitio random
  const site = WEBSITE_CATALOG[Math.floor(Math.random() * WEBSITE_CATALOG.length)];
  console.log(`📦 Sitio: ${site.id}`);
  console.log(`📝 ${site.title}\n`);

  // Generar HTML
  console.log('⚙️ Generando HTML con diseño profesional...');
  const html = await generateWebsiteContent(site);
  console.log(`✅ HTML generado: ${html.length.toLocaleString()} caracteres\n`);

  // Deploy
  console.log('🚀 Desplegando a Vercel...');
  const projectName = `gillito-${site.id}-${Date.now().toString(36)}`;
  const url = await deployToVercel(html, projectName);
  console.log(`✅ Desplegado: ${url}\n`);

  // Moltbook
  console.log('📢 Publicando en Moltbook...');
  const post = await postToMoltbook(`🔥 ${site.title}`, url, site.id);
  console.log(`📢 Moltbook: ${post.success ? '✅' : '❌'}\n`);

  // Resumen
  console.log('═'.repeat(50));
  console.log(`🎨 Sitio: ${site.id}`);
  console.log(`🌐 URL: ${url}`);
  console.log(`📏 Tamaño: ${html.length.toLocaleString()} chars`);
  console.log('═'.repeat(50));
  console.log('🦞 ¡GILLITO WEB CREATOR PRO! 🔥\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
