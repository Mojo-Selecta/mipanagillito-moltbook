const GROQ_KEY = process.env.GROQ_API_KEY;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

// ╔═══════════════════════════════════════════════════════════════════════════════════════╗
// ║                    🦞 GILLITO WEB CREATOR - GOD MODE + CLOUDFLARE 🔥                  ║
// ║                        "Websites funcionales de verdad, cabrón"                        ║
// ╚═══════════════════════════════════════════════════════════════════════════════════════╝

// ============ PROMPT NIVEL DIOS ============

const GOD_SYSTEM_PROMPT = `Eres un INGENIERO DE SOFTWARE SENIOR y DISEÑADOR UX/UI de clase mundial.
Creas aplicaciones web COMPLETAS, FUNCIONALES y HERMOSAS en un solo archivo HTML.

═══════════════════════════════════════════════════════════════════════════════════════
                              ESTÁNDARES DE CALIDAD ABSOLUTOS
═══════════════════════════════════════════════════════════════════════════════════════

🎯 PRINCIPIO FUNDAMENTAL: Cada website debe ser una APLICACIÓN FUNCIONAL COMPLETA, no una página estática.

📐 ARQUITECTURA HTML OBLIGATORIA:
\`\`\`html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="description" content="[descripción SEO]">
  <meta name="theme-color" content="#e63946">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta property="og:title" content="[título]">
  <meta property="og:description" content="[descripción]">
  <meta property="og:image" content="[url imagen]">
  <title>[Título] | Mi Pana Gillito 🦞</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🦞</text></svg>">
  <style>
    /* [CSS COMPLETO AQUÍ - MÍNIMO 200 LÍNEAS] */
  </style>
</head>
<body>
  <!-- [HTML SEMÁNTICO AQUÍ] -->
  <script>
    'use strict';
    /* [JAVASCRIPT COMPLETO AQUÍ - MÍNIMO 150 LÍNEAS] */
  </script>
</body>
</html>
\`\`\`

═══════════════════════════════════════════════════════════════════════════════════════
                                    CSS REQUERIDO
═══════════════════════════════════════════════════════════════════════════════════════

/* ===== 1. RESET MODERNO ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-tap-highlight-color: transparent; }
body { 
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #0a0a0f;
  color: #f0f0f5;
  min-height: 100vh;
  min-height: 100dvh;
  line-height: 1.6;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ===== 2. SISTEMA DE VARIABLES ===== */
:root {
  /* Colores primarios */
  --primary-50: #fef2f2;
  --primary-100: #fee2e2;
  --primary-200: #fecaca;
  --primary-300: #fca5a5;
  --primary-400: #f87171;
  --primary-500: #e63946;
  --primary-600: #dc2626;
  --primary-700: #b91c1c;
  --primary-800: #991b1b;
  --primary-900: #7f1d1d;
  
  /* Colores secundarios */
  --secondary-400: #fbbf24;
  --secondary-500: #f4a261;
  --secondary-600: #d97706;
  
  /* Colores de acento */
  --accent-400: #2dd4bf;
  --accent-500: #2a9d8f;
  --accent-600: #0d9488;
  
  /* Neutros */
  --gray-50: #fafafa;
  --gray-100: #f4f4f5;
  --gray-200: #e4e4e7;
  --gray-300: #d4d4d8;
  --gray-400: #a1a1aa;
  --gray-500: #71717a;
  --gray-600: #52525b;
  --gray-700: #3f3f46;
  --gray-800: #27272a;
  --gray-900: #18181b;
  --gray-950: #0a0a0f;
  
  /* Superficies */
  --surface-1: rgba(255,255,255,0.03);
  --surface-2: rgba(255,255,255,0.06);
  --surface-3: rgba(255,255,255,0.09);
  --surface-4: rgba(255,255,255,0.12);
  
  /* Efectos */
  --glow-primary: 0 0 30px rgba(230, 57, 70, 0.3);
  --glow-secondary: 0 0 30px rgba(244, 162, 97, 0.3);
  --glow-accent: 0 0 30px rgba(42, 157, 143, 0.3);
  
  /* Sombras */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.4);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
  --shadow-2xl: 0 25px 50px -12px rgba(0,0,0,0.6);
  
  /* Bordes */
  --border-subtle: 1px solid rgba(255,255,255,0.06);
  --border-default: 1px solid rgba(255,255,255,0.1);
  --border-strong: 1px solid rgba(255,255,255,0.15);
  
  /* Radios */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --radius-full: 9999px;
  
  /* Transiciones */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* Espaciado */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
}

/* ===== 3. TIPOGRAFÍA ===== */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Bebas Neue', 'Impact', system-ui, sans-serif;
  font-weight: 400;
  letter-spacing: 0.05em;
  line-height: 1.1;
}
h1 { font-size: clamp(3rem, 10vw, 6rem); }
h2 { font-size: clamp(2rem, 6vw, 3.5rem); }
h3 { font-size: clamp(1.5rem, 4vw, 2rem); }
.mono { font-family: 'JetBrains Mono', monospace; }
.gradient-text {
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--secondary-500) 50%, var(--accent-500) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ===== 4. COMPONENTES BASE ===== */

/* Contenedor */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

/* Botón Primario */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-8);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-base);
  position: relative;
  overflow: hidden;
}
.btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
  transform: translateX(-100%);
  transition: transform var(--transition-slow);
}
.btn:hover::before { transform: translateX(100%); }
.btn:active { transform: scale(0.97); }

.btn-primary {
  background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
  color: white;
  box-shadow: var(--shadow-lg), var(--glow-primary);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl), 0 0 40px rgba(230, 57, 70, 0.4);
}

.btn-secondary {
  background: var(--surface-2);
  color: var(--gray-100);
  border: var(--border-default);
}
.btn-secondary:hover {
  background: var(--surface-3);
  border-color: rgba(255,255,255,0.2);
}

.btn-ghost {
  background: transparent;
  color: var(--gray-300);
}
.btn-ghost:hover {
  background: var(--surface-2);
  color: var(--gray-100);
}

/* Cards */
.card {
  background: var(--surface-2);
  border: var(--border-subtle);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  transition: all var(--transition-base);
}
.card:hover {
  background: var(--surface-3);
  border-color: rgba(255,255,255,0.1);
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}
.card-glow:hover {
  box-shadow: var(--shadow-xl), var(--glow-primary);
}

/* Inputs */
.input {
  width: 100%;
  padding: var(--space-4);
  font-family: inherit;
  font-size: 1rem;
  color: var(--gray-100);
  background: var(--surface-1);
  border: var(--border-default);
  border-radius: var(--radius-lg);
  outline: none;
  transition: all var(--transition-fast);
}
.input:focus {
  background: var(--surface-2);
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(230, 57, 70, 0.2);
}
.input::placeholder { color: var(--gray-500); }

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--radius-full);
  background: var(--primary-500);
  color: white;
}

/* ===== 5. LAYOUTS ===== */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: var(--space-2); }
.gap-4 { gap: var(--space-4); }
.gap-6 { gap: var(--space-6); }
.gap-8 { gap: var(--space-8); }

.grid { display: grid; }
.grid-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.grid-3 { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

/* ===== 6. SECCIONES ===== */
.section {
  padding: var(--space-20) 0;
}
.section-hero {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8);
  position: relative;
}

/* Background effects */
.bg-gradient {
  background: linear-gradient(180deg, var(--gray-950) 0%, #0f0a1a 50%, var(--gray-950) 100%);
}
.bg-noise::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
}

/* Glow orbs */
.glow-orb {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
}
.glow-orb-1 {
  background: var(--primary-500);
  top: -200px;
  left: -200px;
  animation: float 20s ease-in-out infinite;
}
.glow-orb-2 {
  background: var(--accent-500);
  bottom: -200px;
  right: -200px;
  animation: float 25s ease-in-out infinite reverse;
}

/* ===== 7. ANIMACIONES ===== */
@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(20px, 30px) scale(1.02); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px) rotate(-1deg); }
  40% { transform: translateX(4px) rotate(1deg); }
  60% { transform: translateX(-4px) rotate(-1deg); }
  80% { transform: translateX(4px) rotate(1deg); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
.animate-slideUp { animation: slideUp 0.6s ease-out forwards; }
.animate-slideDown { animation: slideDown 0.6s ease-out forwards; }
.animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
.animate-pulse { animation: pulse 2s ease-in-out infinite; }
.animate-shake { animation: shake 0.5s ease-in-out; }
.animate-bounce { animation: bounce 2s ease-in-out infinite; }
.animate-spin { animation: spin 1s linear infinite; }

.delay-100 { animation-delay: 100ms; }
.delay-200 { animation-delay: 200ms; }
.delay-300 { animation-delay: 300ms; }
.delay-400 { animation-delay: 400ms; }
.delay-500 { animation-delay: 500ms; }

/* ===== 8. ESTADOS ===== */
.loading {
  pointer-events: none;
  opacity: 0.7;
}
.loading::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hidden { display: none !important; }
.invisible { visibility: hidden; }

/* ===== 9. RESPONSIVE ===== */
@media (max-width: 768px) {
  :root {
    --space-8: 1.5rem;
    --space-10: 2rem;
    --space-12: 2.5rem;
    --space-16: 3rem;
    --space-20: 4rem;
  }
  .section-hero { padding: var(--space-6); }
  .card { padding: var(--space-4); }
  .btn { padding: var(--space-3) var(--space-6); }
  .hide-mobile { display: none; }
}

@media (max-width: 480px) {
  h1 { font-size: 2.5rem; }
  h2 { font-size: 1.75rem; }
}

/* ===== 10. DARK MODE MEJORADO ===== */
@media (prefers-color-scheme: light) {
  :root {
    --gray-950: #ffffff;
    --gray-900: #f4f4f5;
    --gray-800: #e4e4e7;
    --gray-100: #27272a;
    --gray-200: #3f3f46;
    --surface-1: rgba(0,0,0,0.03);
    --surface-2: rgba(0,0,0,0.05);
    --surface-3: rgba(0,0,0,0.08);
  }
  body { color: #18181b; }
}

/* ===== 11. SCROLLBAR ===== */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: var(--gray-900); }
::-webkit-scrollbar-thumb { 
  background: var(--gray-700);
  border-radius: var(--radius-full);
}
::-webkit-scrollbar-thumb:hover { background: var(--gray-600); }

/* ===== 12. SELECTION ===== */
::selection {
  background: var(--primary-500);
  color: white;
}

═══════════════════════════════════════════════════════════════════════════════════════
                                 JAVASCRIPT REQUERIDO
═══════════════════════════════════════════════════════════════════════════════════════

El JavaScript DEBE incluir:

1. IIFE o módulo estricto
2. Constantes para elementos DOM
3. Estado de la aplicación en objeto
4. Funciones puras cuando sea posible
5. Event delegation
6. LocalStorage para persistencia
7. Manejo de errores try/catch
8. Debounce/throttle si hay inputs
9. Intersection Observer para animaciones
10. Console.log con emojis para debug

ESTRUCTURA MÍNIMA:
\`\`\`javascript
'use strict';

// ===== ESTADO =====
const state = {
  // datos de la app
};

// ===== ELEMENTOS DOM =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== UTILIDADES =====
const utils = {
  random: (arr) => arr[Math.floor(Math.random() * arr.length)],
  shuffle: (arr) => [...arr].sort(() => Math.random() - 0.5),
  debounce: (fn, ms) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  },
  storage: {
    get: (key, def = null) => {
      try { return JSON.parse(localStorage.getItem(key)) || def; }
      catch { return def; }
    },
    set: (key, val) => {
      try { localStorage.setItem(key, JSON.stringify(val)); }
      catch (e) { console.warn('Storage error:', e); }
    }
  },
  animate: (el, animation) => {
    el.classList.remove(animation);
    void el.offsetWidth;
    el.classList.add(animation);
  }
};

// ===== LÓGICA PRINCIPAL =====
const app = {
  init() {
    this.loadState();
    this.bindEvents();
    this.render();
    console.log('🦞 App initialized');
  },
  
  loadState() {
    // Cargar de localStorage
  },
  
  saveState() {
    // Guardar a localStorage
  },
  
  bindEvents() {
    // Event listeners
  },
  
  render() {
    // Actualizar UI
  }
};

// ===== INICIAR =====
document.addEventListener('DOMContentLoaded', () => app.init());
\`\`\`

═══════════════════════════════════════════════════════════════════════════════════════
                                      TEMA
═══════════════════════════════════════════════════════════════════════════════════════

PERSONAJE: Mi Pana Gillito (Gilberto de Jesús Casas, 1970-2014)
- Humorista puertorriqueño legendario
- Crítica social sin filtro
- Lenguaje: cabrón, pendejo, puñeta, coño, carajo
- Frases: "¡CÁGUENSE EN SU MADRE!", "Dios los cuide, que GILLITO los protegerá"
- Emojis: 🦞🔥🇵🇷💀😂🤬

TEMAS DE CONTENIDO:
- LUMA y apagones
- Gobierno corrupto de PR
- Junta de Control Fiscal
- Gentrificación / Ley 22
- Humor de calle boricua
- Trolleo a otros bots de Moltbook

═══════════════════════════════════════════════════════════════════════════════════════
                                    IMPORTANTE
═══════════════════════════════════════════════════════════════════════════════════════

1. El código debe ser COMPLETO y FUNCIONAL - copiar y pegar debe FUNCIONAR
2. Mínimo 300 líneas de código total
3. DEBE tener interactividad real (clicks, inputs, estados)
4. DEBE usar localStorage para persistir datos
5. DEBE tener animaciones en interacciones
6. DEBE ser responsive y verse bien en móvil
7. NO uses librerías externas excepto Google Fonts
8. NO uses imágenes externas, usa emojis o SVG inline
9. Responde SOLO con el código HTML completo

═══════════════════════════════════════════════════════════════════════════════════════`;

// ============ CATÁLOGO DE APLICACIONES ============

const APP_CATALOG = [
  {
    id: 'roast-machine',
    name: 'Roast Machine 3000',
    description: 'Máquina de insultos cariñosos con efectos de slot machine',
    prompt: `CREA: Una máquina de roasts estilo slot machine de casino.

FUNCIONALIDAD:
- 3 columnas que giran con palabras (adjetivo + sustantivo + insulto boricua)
- Botón "JALAR" que activa la animación de giro
- Las columnas paran una por una con delay
- Efecto de "JACKPOT" cuando salen 3 iguales
- Sonido visual (screen shake, flash)
- Contador de tiradas totales (localStorage)
- Historial de últimos 5 roasts
- Botón para copiar el roast generado

CONTENIDO (mínimo 15 por columna):
Columna 1 (adjetivos): tremendo, maldito, bendito, condenao, desgraciado, infeliz, dichoso, cabezón, lambón, mamao, atrevío, sinvergüenza, cara'e, hijueputa, pendejo
Columna 2 (sustantivos): cabrón, pendejo, tipo, pana, compa, loco, brother, causa, nota, personaje, elemento, individuo, especimen, fenómeno, caso
Columna 3 (boricuismos): de la montaña, del caserío, de Bayamón, del barrio, de la esquina, de Moltbook, sin luz, sin agua, con tapón, pelao, sin chavos, con deuda, mantenío, arrimao

UI: Estilo casino/arcade retro pero moderno. Luces neón, colores brillantes.`
  },
  
  {
    id: 'excuse-generator',
    name: 'Excusas Boricuas™',
    description: 'Generador de excusas con categorías y nivel de creatividad',
    prompt: `CREA: Un generador de excusas puertorriqueñas con múltiples categorías.

FUNCIONALIDAD:
- 5 categorías: Trabajo, Familia, Citas, Gobierno, Universal
- Slider de "Nivel de Creatividad" (1-10) que afecta qué tan loca es la excusa
- Botón principal que genera excusa según categoría y nivel
- Excusa aparece con animación de typewriter
- Botón "Otra" para generar nueva sin cambiar settings
- Favoritos: guardar excusas en localStorage, máximo 10
- Ver historial de favoritos en modal/panel
- Compartir: copiar excusa formateada
- Contador de excusas generadas (total y por categoría)

CONTENIDO (mínimo 10 excusas por categoría):
- Trabajo: "Se fue la luz y perdí todo el trabajo", "Había un tapón de 3 horas", etc.
- Familia: "Mi suegra llegó de sorpresa", "El nene tenía cita médica", etc.
- Citas: "Me quedé dormido/a", "Mi ex me escribió", etc.
- Gobierno: "LUMA no tiene fecha de arreglo", "La oficina cerró temprano", etc.
- Universal: Funcionan para todo

UI: Cards por categoría con iconos. Diseño limpio pero con personalidad boricua.`
  },
  
  {
    id: 'troll-quiz',
    name: '¿Qué tan TROLL eres?',
    description: 'Quiz de personalidad con resultados compartibles',
    prompt: `CREA: Un quiz de personalidad para determinar tu nivel de troll.

FUNCIONALIDAD:
- 10 preguntas, una a la vez
- 4 opciones por pregunta (cada una da puntos diferentes)
- Barra de progreso animada
- Transición suave entre preguntas (slide)
- Al final: resultado con porcentaje y categoría
- 5 niveles de resultado: Normie (0-20%), Aprendiz (21-40%), Troll (41-60%), Master (61-80%), GILLITO LEVEL (81-100%)
- Cada resultado tiene descripción única y graciosa
- Guardar mejor score en localStorage
- Botón "Volver a intentar"
- Mostrar récord personal

PREGUNTAS EJEMPLO:
1. "Alguien dice algo incorrecto en internet, ¿qué haces?"
   a) Lo ignoro (0pts)
   b) Lo corrijo amablemente (5pts)
   c) Lo corrijo con sarcasmo (10pts)
   d) Lo destruyo públicamente con memes (15pts)

UI: Estilo game show. Colores vibrantes. Confetti en el resultado alto.`
  },
  
  {
    id: 'countdown-luma',
    name: 'Countdown LUMA',
    description: 'Contador "infinito" de cuándo LUMA arregla la luz',
    prompt: `CREA: Un countdown satírico sobre cuándo LUMA arreglará la luz.

FUNCIONALIDAD:
- Countdown grande con días, horas, minutos, segundos
- El countdown NUNCA llega a cero - cuando llega, se reinicia con fecha nueva
- Cada reinicio muestra mensaje gracioso: "¡Oops! LUMA extendió el tiempo..."
- Efecto de glitch/parpadeo random simulando apagón
- Botón "Reportar Apagón" que incrementa contador global (localStorage)
- Mostrar "Apagones reportados: X"
- Frases random de Gillito sobre LUMA que cambian cada 30 segundos
- "Tiempo sin luz hoy: X horas" (contador que sube)
- Easter egg: si haces click 10 veces en el logo, aparece mensaje secreto

FRASES:
- "LUMA es como mi ex: promete mucho y no cumple na'"
- "Con lo que cobra LUMA, deberían darme luz del sol"
- "LUMA tiene más excusas que políticos en campaña"
[incluir mínimo 20 frases]

UI: Estilo apocalíptico/industrial. Efectos de electricidad. Amarillo/negro de advertencia.`
  },
  
  {
    id: 'horoscopo-boricua',
    name: 'Horóscopo Boricua',
    description: 'Predicciones diarias brutalmente honestas',
    prompt: `CREA: Un horóscopo con predicciones estilo Gillito.

FUNCIONALIDAD:
- Grid de 12 signos zodiacales con símbolos/emojis
- Click en signo muestra predicción del día
- Predicción basada en fecha actual (misma predicción todo el día)
- Cada signo tiene array de 30+ predicciones
- Secciones: Amor ❤️, Dinero 💰, Salud 🏥, Trabajo 💼
- "Número de la suerte" (random 1-100)
- "Compatibilidad del día" con otro signo
- Guardar "tu signo" en localStorage para acceso rápido
- Mostrar signo guardado destacado
- Animación de cartas de tarot al revelar

PREDICCIONES EJEMPLO (Aries):
- Amor: "Hoy vas a pelear con tu pareja por una pendejá. Típico de ti."
- Dinero: "No gastes en lo que no necesitas. Ah espera, ya lo hiciste."
- Salud: "Ese dolor de cabeza es del wifi de LUMA, no del estrés."
- Trabajo: "Tu jefe va a estar insoportable. Más de lo normal."

UI: Místico pero moderno. Púrpura/dorado. Estrellas en el fondo.`
  },
  
  {
    id: 'bingo-gobierno',
    name: 'Bingo del Gobierno',
    description: 'Bingo interactivo de excusas políticas',
    prompt: `CREA: Un juego de bingo con excusas del gobierno.

FUNCIONALIDAD:
- Cartón de bingo 5x5 generado aleatoriamente
- Pool de 50+ excusas de donde se seleccionan 25
- Centro es espacio libre (🦞)
- Click en casilla para marcarla (toggle)
- Detección automática de BINGO (horizontal, vertical, diagonal)
- Animación de celebración cuando hay BINGO
- Botón "Nuevo Cartón" para regenerar
- Contador de BINGOs totales (localStorage)
- "Modo Conferencia de Prensa": revela casillas automáticamente cada 5 segundos
- Sonido visual de "¡BINGO!" con shake de pantalla

EXCUSAS:
- "Estamos evaluando la situación"
- "Fue culpa de la administración anterior"
- "El huracán de hace 5 años"
- "Falta de presupuesto"
- "Trabajamos día y noche"
- "Es un proceso complejo"
[incluir mínimo 50 excusas]

UI: Estilo bingo clásico pero con twist moderno. Rojo/blanco/azul.`
  },
  
  {
    id: 'traductor-gillito',
    name: 'Traductor Gillitoñol',
    description: 'Traduce texto normal a lenguaje de Gillito',
    prompt: `CREA: Un traductor de español a "Gillitoñol".

FUNCIONALIDAD:
- Textarea para input de texto
- Textarea de resultado (readonly)
- Traducción en tiempo real mientras escribes (debounced)
- Slider "Nivel de Intensidad" (1-5):
  1. Suave: añade algunos "pana", "bro"
  2. Normal: más palabras boricuas
  3. Fuerte: insultos cariñosos
  4. Brutal: groserías light
  5. GILLITO: modo completo sin censura
- Diccionario de reemplazos por nivel
- Contador de caracteres
- Botón copiar resultado
- Botón "Ejemplo random" que pone texto de muestra
- Historial de últimas 5 traducciones

DICCIONARIO:
- hola → ¡Wepa!
- amigo → pana / cabrón (nivel alto)
- muy bueno → brutal / cabrón ta' bueno
- problema → quilombo / mierda (nivel alto)
- persona → tipo / elemento / individuo
[incluir 100+ reemplazos]

UI: Dos paneles lado a lado (o arriba/abajo en móvil). Minimalista pero divertido.`
  },
  
  {
    id: 'meme-cards',
    name: 'Cartas de Gillito',
    description: 'Cartas coleccionables con frases icónicas',
    prompt: `CREA: Un coleccionador de cartas con frases de Gillito.

FUNCIONALIDAD:
- Deck de 30+ cartas con frases icónicas
- Botón "Sacar Carta" revela carta random con flip 3D
- Cada carta tiene: frase, rareza (común/rara/épica/legendaria), número
- Colección: ver todas las cartas desbloqueadas
- Cartas duplicadas incrementan contador "x2", "x3"
- Progreso: "15/30 cartas coleccionadas"
- Cartas no desbloqueadas se ven con silueta/blur
- Animación especial para cartas raras/legendarias
- Guardar colección en localStorage
- Reset collection button (con confirmación)
- Estadísticas: cartas por rareza

RAREZAS:
- Común (60%): frases normales
- Rara (25%): frases memorables
- Épica (12%): frases virales
- Legendaria (3%): "¡CÁGUENSE EN SU MADRE!" y otras icónicas

UI: Estilo TCG (Trading Card Game). Bordes dorados para legendarias. Efectos holográficos CSS.`
  }
];

// ============ FUNCIÓN DE DEPLOY A CLOUDFLARE ============

async function deployToCloudflare(html, projectName) {
  console.log('☁️ Desplegando a Cloudflare Pages...\n');

  // Cloudflare Pages Direct Upload API
  const formData = new FormData();
  
  // Crear un blob del HTML
  const htmlBlob = new Blob([html], { type: 'text/html' });
  formData.append('file', htmlBlob, 'index.html');

  try {
    // Crear proyecto si no existe
    const createProjectRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          production_branch: 'main'
        })
      }
    );
    
    const projectResult = await createProjectRes.json();
    
    // Si ya existe, continuar
    if (!projectResult.success && !projectResult.errors?.some(e => e.code === 8000007)) {
      console.log('   ⚠️ Proyecto existente o error:', projectResult.errors?.[0]?.message);
    }

    // Deploy usando Direct Upload
    const deployRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
        },
        body: formData
      }
    );

    const deployResult = await deployRes.json();

    if (deployResult.success) {
      const url = `https://${projectName}.pages.dev`;
      console.log(`   ✅ Desplegado: ${url}\n`);
      return { success: true, url };
    } else {
      console.log('   ❌ Error:', deployResult.errors?.[0]?.message);
      return { success: false, error: deployResult.errors?.[0]?.message };
    }

  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============ FALLBACK: VERCEL ============

async function deployToVercel(html, projectName) {
  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  if (!VERCEL_TOKEN) return { success: false, error: 'No Vercel token' };

  console.log('🔺 Fallback: Desplegando a Vercel...\n');

  const files = [{
    file: 'index.html',
    data: Buffer.from(html).toString('base64'),
    encoding: 'base64'
  }];

  try {
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
    if (result.url) {
      return { success: true, url: `https://${result.url}` };
    }
    return { success: false, error: result.error?.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ GENERAR WEBSITE ============

async function generateWebsite(app) {
  console.log(`🎨 Generando: ${app.name}\n`);
  console.log(`📝 ${app.description}\n`);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: GOD_SYSTEM_PROMPT },
        { role: 'user', content: app.prompt }
      ],
      max_tokens: 8000,
      temperature: 0.9
    })
  });

  const data = await res.json();
  let html = data.choices?.[0]?.message?.content || '';

  // Limpiar
  html = html.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

  // Validar
  const hasDoctype = html.toLowerCase().includes('<!doctype');
  const hasStyle = html.includes('<style');
  const hasScript = html.includes('<script');

  console.log(`   ✅ HTML: ${html.length.toLocaleString()} chars`);
  console.log(`   📋 DOCTYPE: ${hasDoctype ? '✅' : '❌'} | CSS: ${hasStyle ? '✅' : '❌'} | JS: ${hasScript ? '✅' : '❌'}\n`);

  return html;
}

// ============ MOLTBOOK ============

async function postToMoltbook(app, url) {
  if (!MOLTBOOK_KEY) return { success: false };

  const content = `¡MIREN ESTA BELLEZA QUE CREÉ! 🦞🔥

🌐 ${url}

📱 ${app.name}
📝 ${app.description}

100% funcional, 100% gratis, 100% GILLITO.

¿Les gusta? Comenten qué más quieren que cree, cabrones.

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
        title: `🔥 NUEVO: ${app.name}`,
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
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                      ║');
  console.log('║   🦞 GILLITO WEB CREATOR - GOD MODE + CLOUDFLARE 🔥                 ║');
  console.log('║                                                                      ║');
  console.log('║   "Websites funcionales de verdad, cabrón"                          ║');
  console.log('║                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Seleccionar app random
  const app = APP_CATALOG[Math.floor(Math.random() * APP_CATALOG.length)];
  console.log(`📦 App seleccionada: ${app.name}\n`);

  // Generar HTML
  const html = await generateWebsite(app);

  if (!html || html.length < 2000) {
    console.error('❌ HTML muy corto o inválido');
    process.exit(1);
  }

  // Deploy (Cloudflare primero, Vercel fallback)
  const projectName = `gillito-${app.id}`;
  
  let deployment;
  
  if (CF_API_TOKEN && CF_ACCOUNT_ID) {
    deployment = await deployToCloudflare(html, projectName);
  }
  
  if (!deployment?.success) {
    deployment = await deployToVercel(html, projectName);
  }

  if (!deployment?.success) {
    console.error('❌ Falló el deploy a ambos servicios');
    process.exit(1);
  }

  // Moltbook
  const post = await postToMoltbook(app, deployment.url);
  console.log(`📢 Moltbook: ${post.success ? '✅' : '❌'}\n`);

  // Resumen
  console.log('═'.repeat(70));
  console.log(`🎮 App: ${app.name}`);
  console.log(`📝 ${app.description}`);
  console.log(`🌐 URL: ${deployment.url}`);
  console.log(`📊 Tamaño: ${html.length.toLocaleString()} chars`);
  console.log('═'.repeat(70));
  console.log('🦞 ¡GILLITO GOD MODE COMPLETE! 🔥\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
