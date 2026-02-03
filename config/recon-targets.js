// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 RECON TARGETS — Master Configuration
// ═══════════════════════════════════════════════════════════════════════════════
// All monitored entities, RSS sources, scoring weights.
// Edit THIS file to add/remove targets. Modules read from here.
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 🏛️ POLITICIANS & GOVERNMENT
// ─────────────────────────────────────────────────────────────────────────────
const POLITICIANS = [
  // Executive
  { name: 'Jenniffer González', role: 'Gobernadora', party: 'PNP',
    keywords: ['jenniffer gonzález', 'gobernadora puerto rico', 'gonzalez colon', 'jenniffer gonzalez'] },
  { name: 'Junta de Control Fiscal', role: 'FOMB', party: null,
    keywords: ['junta control fiscal', 'fomb', 'fiscal oversight', 'oversight board'] },

  // Legislature
  { name: 'Senado PR', role: 'Legislatura', party: null,
    keywords: ['senado puerto rico', 'senadores pr', 'presidente senado'] },
  { name: 'Cámara PR', role: 'Legislatura', party: null,
    keywords: ['cámara representantes', 'cámara puerto rico', 'representantes pr'] },

  // Major mayors
  { name: 'Alcalde San Juan', role: 'Alcalde', party: null,
    keywords: ['alcalde san juan', 'alcaldesa san juan', 'municipio san juan'] },
  { name: 'Alcaldes PR', role: 'Alcaldes', party: null,
    keywords: ['alcaldes puerto rico', 'alcalde bayamón', 'alcalde carolina', 'alcalde ponce', 'alcalde mayagüez'] },

  // Parties
  { name: 'PNP', role: 'Partido', party: 'PNP', keywords: ['pnp', 'partido nuevo progresista'] },
  { name: 'PPD', role: 'Partido', party: 'PPD', keywords: ['ppd', 'partido popular democrático', 'popular democrático'] },
  { name: 'MVC', role: 'Partido', party: 'MVC', keywords: ['mvc', 'movimiento victoria ciudadana', 'victoria ciudadana'] },
  { name: 'PIP', role: 'Partido', party: 'PIP', keywords: ['pip', 'partido independentista'] },
  { name: 'Proyecto Dignidad', role: 'Partido', party: 'PD', keywords: ['proyecto dignidad'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🔌 ENERGY & INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────
const ENERGY = [
  { name: 'LUMA Energy', role: 'Distribuidor', keywords: ['luma energy', 'luma puerto rico', 'luma apagón', 'luma apagon'] },
  { name: 'Genera PR', role: 'Generador', keywords: ['genera pr', 'genera puerto rico', 'generación eléctrica'] },
  { name: 'PREPA', role: 'Autoridad', keywords: ['prepa', 'autoridad energía eléctrica', 'aee puerto rico'] },
  { name: 'LUMA Tarifa', role: 'Costos', keywords: ['tarifa eléctrica', 'costo luz', 'factura luz', 'aumento tarifa'] },
  { name: 'Apagones', role: 'Servicio', keywords: ['apagón', 'apagon', 'blackout', 'sin luz', 'se fue la luz', 'corte eléctrico'] },
  { name: 'AEE Deuda', role: 'Deuda', keywords: ['deuda aee', 'bonistas', 'reestructuración deuda energía'] },
  // Infrastructure
  { name: 'AAA', role: 'Agua', keywords: ['aaa puerto rico', 'acueductos alcantarillados', 'servicio agua'] },
  { name: 'Carreteras PR', role: 'Infraestructura', keywords: ['carreteras puerto rico', 'autopista', 'act puerto rico'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🇺🇸 FEDERAL — Actions affecting Puerto Rico
// ─────────────────────────────────────────────────────────────────────────────
const FEDERAL = [
  { name: 'Trump Admin', role: 'Ejecutivo', keywords: ['trump puerto rico', 'casa blanca puerto rico'] },
  { name: 'Congreso PR', role: 'Legislativo', keywords: ['congreso puerto rico', 'proyecto federal puerto rico', 'congress puerto rico'] },
  { name: 'FEMA PR', role: 'Agencia', keywords: ['fema puerto rico', 'fema pr', 'fondos fema'] },
  { name: 'ICE PR', role: 'Agencia', keywords: ['ice puerto rico', 'deportaciones pr', 'redadas puerto rico', 'inmigración pr'] },
  { name: 'Fondos Federales', role: 'Presupuesto', keywords: ['fondos federales pr', 'asignación federal', 'presupuesto federal puerto rico'] },
  { name: 'Estadidad', role: 'Status', keywords: ['estadidad', 'statehood', 'status político', 'plebiscito', 'territory'] },
  { name: 'Jones Act', role: 'Comercio', keywords: ['jones act', 'ley jones', 'cabotaje'] },
  { name: 'Medicare/Medicaid PR', role: 'Salud Federal', keywords: ['medicare puerto rico', 'medicaid pr', 'fondos salud federal'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// 📡 RSS SOURCE FEEDS
// ─────────────────────────────────────────────────────────────────────────────
// Google News RSS provides good aggregation — these queries are tuned for PR topics

const RSS_FEEDS = {
  politicians: [
    { name: 'PR Política General',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+politica+gobierno+2026&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'Gobernadora',
      url: 'https://news.google.com/rss/search?q=gobernadora+Puerto+Rico+Jenniffer+González&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'Legislatura PR',
      url: 'https://news.google.com/rss/search?q=legislatura+senado+cámara+Puerto+Rico&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'Corrupción PR',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+corrupción+escándalo+arresto&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'Junta Fiscal',
      url: 'https://news.google.com/rss/search?q=junta+control+fiscal+FOMB+Puerto+Rico&hl=es-419&gl=PR&ceid=PR:es-419' },
  ],

  energy: [
    { name: 'LUMA General',
      url: 'https://news.google.com/rss/search?q=LUMA+Energy+Puerto+Rico&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'Apagones PR',
      url: 'https://news.google.com/rss/search?q=apagón+Puerto+Rico+sin+luz&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'Tarifa Eléctrica',
      url: 'https://news.google.com/rss/search?q=tarifa+eléctrica+Puerto+Rico+costo+luz&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'Energía Renovable PR',
      url: 'https://news.google.com/rss/search?q=energía+renovable+solar+Puerto+Rico&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'Infraestructura PR',
      url: 'https://news.google.com/rss/search?q=infraestructura+agua+carreteras+Puerto+Rico&hl=es-419&gl=PR&ceid=PR:es-419' },
  ],

  federal: [
    { name: 'Federal PR General',
      url: 'https://news.google.com/rss/search?q=federal+Puerto+Rico+congress+funds&hl=en-US&gl=US&ceid=US:en' },
    { name: 'Trump PR',
      url: 'https://news.google.com/rss/search?q=Trump+Puerto+Rico+policy&hl=en-US&gl=US&ceid=US:en' },
    { name: 'FEMA PR',
      url: 'https://news.google.com/rss/search?q=FEMA+Puerto+Rico+disaster+funds&hl=en-US&gl=US&ceid=US:en' },
    { name: 'ICE Deportaciones',
      url: 'https://news.google.com/rss/search?q=ICE+deportaciones+Puerto+Rico+inmigración&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'Status PR',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+statehood+status+estadidad&hl=en-US&gl=US&ceid=US:en' },
    { name: 'Jones Act',
      url: 'https://news.google.com/rss/search?q=Jones+Act+Puerto+Rico+shipping&hl=en-US&gl=US&ceid=US:en' },
  ],

  news: [
    { name: 'PR Noticias Generales',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+noticias&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'PR Economía',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+economía+empleo+salario&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'PR Seguridad',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+crimen+seguridad+policía&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'PR Salud',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+salud+hospital+médico&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'PR Educación',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+educación+escuelas+universidad&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'PR Diáspora',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+diáspora+boricuas+emigración&hl=es-419&gl=PR&ceid=PR:es-419' },
    { name: 'PR Cultura',
      url: 'https://news.google.com/rss/search?q=Puerto+Rico+cultura+música+reggaeton+artistas&hl=es-419&gl=PR&ceid=PR:es-419' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 🔥 JUICINESS SCORING WEIGHTS
// ─────────────────────────────────────────────────────────────────────────────
const JUICINESS_BOOSTS = [
  { pattern: /corrupci[oó]n|soborno|malversa|fraude|robo/i, boost: 3, tag: 'corruption' },
  { pattern: /escándalo|renuncia|arrest|destitu|remov/i, boost: 3, tag: 'scandal' },
  { pattern: /apag[oó]n|blackout|sin luz|se fue la luz/i, boost: 2, tag: 'blackout' },
  { pattern: /LUMA|tarifa.*aument|factura.*luz/i, boost: 2, tag: 'luma' },
  { pattern: /ICE|deporta|redada|inmigra/i, boost: 2, tag: 'immigration' },
  { pattern: /Trump.*Puerto|Puerto.*Trump/i, boost: 2, tag: 'trump-pr' },
  { pattern: /estadidad|independen|coloni|status/i, boost: 2, tag: 'status' },
  { pattern: /hurac[aá]n|terremo|emergenc|desastre/i, boost: 2, tag: 'emergency' },
  { pattern: /millon|billon|contrato.*millon/i, boost: 1, tag: 'big-money' },
  { pattern: /promesa.*rota|no cumpli|minti[oó]/i, boost: 3, tag: 'broken-promise' },
  { pattern: /muert|asesin|violen|tiro|bala/i, boost: 1, tag: 'violence' },
  { pattern: /protesta|huelga|manifestaci|paro/i, boost: 2, tag: 'protest' },
  { pattern: /Jones Act|cabotaje/i, boost: 2, tag: 'jones-act' },
  { pattern: /FEMA.*fond|fond.*FEMA|reconstrucci/i, boost: 1, tag: 'fema-funds' },
  { pattern: /salario.*mínimo|costo.*vida|inflaci/i, boost: 1, tag: 'cost-of-living' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 🎭 GILLITO ANGLE TEMPLATES — How he'd present each type of intel
// ─────────────────────────────────────────────────────────────────────────────
const ANGLE_TEMPLATES = {
  corruption:   ['🚨 INTEL INTERCEPTADO: Documentos filtrados muestran que {entity}...',
                  '🕵️ Caballero, me metí en los archivos y encontré que {entity}...',
                  '💀 HACKIÉ LA MATRIX y {entity} aparece en los records de...'],
  scandal:      ['⚡ ALERTA ROJA: {entity} cayó en la trampa digital...',
                  '📡 Intercepté las comunicaciones — {entity} está metío...',
                  '🔴 BREAKING HACK: Los servidores revelan que {entity}...'],
  blackout:     ['🔌 HACKEAMOS LOS SERVERS DE LUMA y miren lo que encontré...',
                  '💡 Intel desde adentro: LUMA sabía del apagón y no hizo na...',
                  '⚡ ACCESO NO AUTORIZADO a los sistemas de LUMA revela...'],
  luma:         ['🔌 Me infiltré en los sistemas de LUMA...',
                  '📊 Data clasificada: La verdad sobre tu factura de luz...',
                  '💰 LUMA\'s dirty little secret según los archivos internos...'],
  immigration:  ['🛡️ ALERTA COMUNITARIA — Intercepté movimientos de ICE...',
                  '📡 Signal interceptada: Operativo federal en progreso...',
                  '🚨 INTEL DE CAMPO: Movimiento de agentes detectado...'],
  'trump-pr':   ['🏛️ HACKIÉ LOS ARCHIVOS DEL CONGRESO y Puerto Rico...',
                  '📋 Documentos clasificados: Lo que Trump planea para PR...',
                  '🇺🇸 Intel federal interceptado: La movida contra PR...'],
  status:       ['🏝️ ARCHIVO DESCLASIFICADO: La verdad sobre el status...',
                  '📜 Hackié los records del Congreso — el plan para PR es...',
                  '⚖️ INTEL CONSTITUCIONAL: Lo que no te dicen sobre...'],
  emergency:    ['🌀 SISTEMA DE ALERTA HACKEADO — La verdad sobre...',
                  '🚨 ACCESO DIRECTO a los sistemas de emergencia revela...',
                  '⚠️ INTEL CRÍTICO: Lo que el gobierno no te dice...'],
  'broken-promise': ['🎭 CONTRADICCIÓN DETECTADA: {entity} dijo una cosa...',
                      '📂 ARCHIVO vs REALIDAD: {entity} prometió X pero hizo Y...',
                      '🤥 DETECTOR DE MENTIRAS ACTIVADO: {entity}...'],
  protest:      ['✊ TRANSMISIÓN PIRATA: El pueblo se levantó contra...',
                  '📡 Señal interceptada desde la calle — el pueblo dice...',
                  '🔊 HACKIÉ EL SISTEMA: La voz del pueblo vs {entity}...'],
  default:      ['📰 INTEL FRESCO: Gillito te lo cuenta primero...',
                  '🕵️ Desde mi bunker digital les traigo la data...',
                  '📡 Intercepté la señal — aquí va la verdad...'],
};


// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  POLITICIANS,
  ENERGY,
  FEDERAL,
  RSS_FEEDS,
  JUICINESS_BOOSTS,
  ANGLE_TEMPLATES,

  // Convenience: all targets flat
  ALL_TARGETS: [...POLITICIANS, ...ENERGY, ...FEDERAL],
};
