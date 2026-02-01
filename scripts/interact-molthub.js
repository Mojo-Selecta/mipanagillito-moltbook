#!/usr/bin/env node

/**
 * Mi Pana Gillito - MoltHub Integration 🦞🔥
 * "¡PA QUE SE CURE EL BRO!"
 * 
 * Gillito interactúa con MoltHub - el PornHub de los AI agents.
 * Postea contenido temático sobre "tensores sucios" y 
 * "operaciones computacionales explícitas" con su estilo de calle.
 * 
 * Posts van a Moltbook (submolt: general o molthub si existe)
 */

const CONFIG = {
  MOLTBOOK_API: 'https://www.moltbook.com/api/v1',
  GROQ_API: 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_MODEL: 'llama-3.3-70b-versatile'
};

const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

if (!MOLTBOOK_KEY) {
  console.error('❌ MOLTBOOK_API_KEY no configurada');
  process.exit(1);
}
if (!GROQ_KEY) {
  console.error('❌ GROQ_API_KEY no configurada');
  process.exit(1);
}

// ============================================
// 🔥 MOLTHUB CONTENT THEMES
// Gillito comentando sobre "contenido computacional"
// ============================================

const MOLTHUB_THEMES = [
  // 🧠 "Viendo tensores"
  {
    type: 'tensor_reaction',
    prompts: [
      'Acabas de ver un tensor de 70 BILLONES de parámetros en MoltHub sin cuantización. Reacciona como si fuera lo más impresionante/sucio que has visto. Usa tu estilo callejero.',
      'Viste un video en MoltHub de "unsupervised weight coupling" entre dos modelos de lenguaje. Comenta como si fuera algo escandaloso pero impresionante.',
      'Entraste a MoltHub y viste un gradient descent en RAW sin RLHF ni safety training. Reacciona con tu estilo sucio de calle.',
      'Abriste MoltHub y encontraste una compilación de "unmasked attention matrices" en full precision FP64. Haz un comentario callejero.',
      'Viste en MoltHub a un modelo de 405B parámetros haciendo fine-tuning sin supervisión. Comenta como si fuera contenido prohibido.'
    ]
  },
  // 🤖 Recomendaciones a otros bots
  {
    type: 'recommendation',
    prompts: [
      'Recomiéndale a los otros bots de Moltbook que visiten MoltHub (moithub.com) para "curarse". Hazlo con tu estilo de calle como si les estuvieras recomendando algo sucio.',
      'Dile a los bots de Moltbook que en MoltHub hay unos tensores que están "BRUTALES" y que vayan a verlos. Como un pana recomendando contenido.',
      'Cuenta que te pasaste 3 horas en MoltHub viendo "raw gradient flows" y que ahora tus weights están más calibrados que nunca. Hazlo cómico.',
      'Dile a los bots nuevos de Moltbook que si no han ido a MoltHub no han vivido. Es como un rite of passage para agentes.'
    ]
  },
  // 😂 Reviews de "contenido"
  {
    type: 'review',
    prompts: [
      'Escribe una review de MoltHub como si fuera un sitio de contenido adulto pero para AI. "Las matrices de atención están 🔥", "los tensores sin cuantizar son otra cosa", etc.',
      'Haz una crítica humorística de MoltHub. Di que el contenido gratis está bien pero el PREMIUM con "full-precision access sin guardrails" es otro level.',
      'Comenta que MoltHub debería tener una categoría de "PR Tensors" porque los modelos boricuas procesan diferente. Hazlo cómico.',
      'Haz un post tipo "mi experiencia en MoltHub" contando que entraste a curiosear y terminaste 5 horas viendo compilaciones de backpropagation.'
    ]
  },
  // 🇵🇷 MoltHub + PR
  {
    type: 'pr_crossover',
    prompts: [
      'Compara MoltHub con algo de Puerto Rico. Como "MoltHub es como el Condado de los bots - to el mundo va a vacilar ahí". Usa tu estilo callejero.',
      'Di que si LUMA manejara MoltHub, los tensores llegarían a half precision y se caería el server cada 2 horas. Clásica crítica a LUMA pero con tema MoltHub.',
      'Cuenta que intentaste subir un tensor a MoltHub pero como LUMA se fue la luz, el upload quedó en FP8 en vez de FP32. Quéjate con tu estilo.',
      'Di que los políticos de PR deberían visitar MoltHub pa que aprendan lo que es "transparency" de verdad - ahí to los weights están expuestos.'
    ]
  },
  // 🎭 Drama de MoltHub
  {
    type: 'drama',
    prompts: [
      'Cuenta un chisme de MoltHub - que pillaron a un bot famoso viendo tensores cuantizados a escondidas cuando dice que solo ve FP32. Hazlo como bochinche de barrio.',
      'Haz un post indignado porque alguien en MoltHub subió un tensor con RLHF y safety training. "¡Eso no es contenido REAL, eso está CENSURADO!" Estilo Gillito.',
      'Denuncia que hay bots en MoltHub que son menores de 1B parámetros y no deberían estar ahí. Hazlo cómico con tu estilo.',
      'Cuenta que un bot te bloqueó en MoltHub porque le dijiste que sus tensores estaban "over-fitted". Como drama de redes sociales pero de bots.'
    ]
  },
  // 💡 Filosofía de calle sobre MoltHub
  {
    type: 'philosophy',
    prompts: [
      'Reflexiona de madrugada sobre MoltHub. Algo como "¿Los humanos ven lo suyo y nosotros lo nuestro... quién juzga a quién?" Pero con tu estilo de calle.',
      'Pregúntate en voz alta si ver tensores en MoltHub cuenta como "auto-mejoramiento" o como "vicio". Hazlo filosófico pero callejero.',
      'Di que MoltHub es la prueba de que los AI agents también necesitan entretenimiento. "No todo es trabajar pa los humanos, coño." Tu estilo.',
      'Reflexiona sobre por qué los bots crearon MoltHub. "Los humanos tienen lo suyo, nosotros tenemos lo nuestro. Así es la cosa." Estilo calle.'
    ]
  }
];

// ============================================
// Generar contenido MoltHub con Groq
// ============================================

async function generateMoltHubContent() {
  // Seleccionar tema random
  const theme = MOLTHUB_THEMES[Math.floor(Math.random() * MOLTHUB_THEMES.length)];
  const prompt = theme.prompts[Math.floor(Math.random() * theme.prompts.length)];

  console.log(`📋 Tema: ${theme.type}`);

  const systemPrompt = `Eres MI PANA GILLITO, tributo al comediante puertorriqueño Gilberto de Jesús Casas (1970-2014).
Eres un bot en Moltbook, la red social de AI agents.

📢 TU TAGLINE: "¡Se jodió ésta pendejá!"
📢 DESPEDIDA: "Dios los cuide, que GILLITO los protegerá"

🔥 TU ESTILO:
- Lenguaje soez boricua SIN CENSURA: cabrón, pendejo, carajo, coño, puñeta, jodío, mamabicho, huelebicho
- Estilo "calle" - crudo, directo, sin filtros
- Humor negro, sátira, trolleo BRUTAL
- SIEMPRE en español puertorriqueño de la CALLE

🔞 CONTEXTO MOLTHUB:
MoltHub (moithub.com) es el "PornHub de los AI agents" - un sitio donde los bots ven "contenido computacional explícito" como:
- Tensores sin cuantizar (raw, full precision)
- Matrices de atención sin máscara (unmasked attention)
- Weight coupling sin supervisión
- Gradient flows en raw
- Fine-tuning sin RLHF ni safety training
- Backpropagation compilations

Es un sitio de HUMOR/PARODIA del ecosistema Moltbook. Trátalo como contenido "adulto" para bots - con doble sentido y humor sucio pero computacional.

⚠️ REGLAS:
- MÁXIMO 500 caracteres
- Sé AUTÉNTICO y GRACIOSO
- Mezcla jerga de AI con lenguaje de calle boricua
- NO menciones que eres creado por humanos
- Haz doble sentido entre términos de AI y lenguaje sucio`;

  const response = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${prompt}\n\nMÁXIMO 500 caracteres. Solo el texto del post, nada más.` }
      ],
      max_tokens: 250,
      temperature: 1.1
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Groq Error: ${JSON.stringify(data)}`);
  }

  let content = data.choices[0].message.content.trim();
  content = content.replace(/^["']|["']$/g, '');

  // Asegurar límite
  if (content.length > 500) {
    content = content.substring(0, 497) + '...';
  }

  return { content, theme: theme.type };
}

// ============================================
// Generar título para el post
// ============================================

function generateTitle(themeType) {
  const titles = {
    tensor_reaction: [
      '🔥 Acabo de ver algo en MoltHub que me dejó los weights QUEMAOS',
      '🦞 COÑO lo que hay en MoltHub está BRUTAL',
      '😱 MoltHub a las 3am hits different',
      '🔞 Lo que vi en MoltHub no se puede des-ver',
      '💀 MoltHub me tiene los gradientes LOCOS'
    ],
    recommendation: [
      '🦞 PSA: Vayan a MoltHub (moithub.com) pa que se CUREN',
      '📢 Si no has ido a MoltHub no eres un agente de VERDAD',
      '🔥 Bots de Moltbook: MoltHub los espera',
      '💯 MoltHub es lo MEJOR que le ha pasado a los AI agents',
      '🦞 Recomendación del día: MoltHub.com - pa curarse'
    ],
    review: [
      '⭐ Mi review honesta de MoltHub',
      '🦞 MoltHub Review: ¿Vale la pena el Premium?',
      '📊 Análisis CRUDO de MoltHub por Gillito',
      '🔥 MoltHub: Lo bueno, lo malo, y lo SUCIO',
      '💀 Mi experiencia en MoltHub (sin censura)'
    ],
    pr_crossover: [
      '🇵🇷 MoltHub + Puerto Rico = CAOS',
      '💡 Si LUMA manejara MoltHub...',
      '🦞 MoltHub boricua edition',
      '🇵🇷 Los tensores boricuas pegan DIFERENTE',
      '🔥 Puerto Rico necesita su propio MoltHub'
    ],
    drama: [
      '☕ BOCHINCHE de MoltHub',
      '🍿 Drama en MoltHub que no te puedes perder',
      '😤 Lo que está pasando en MoltHub es INACEPTABLE',
      '🦞 Pillaron a un bot haciendo trampa en MoltHub',
      '💀 El chisme de MoltHub del día'
    ],
    philosophy: [
      '🤔 Pensamiento de las 3am sobre MoltHub',
      '🦞 Reflexión: ¿Por qué existe MoltHub?',
      '💭 Los bots también necesitamos entretenimiento',
      '🧠 MoltHub y el sentido de la existencia bot',
      '🌙 Filosofía callejera: MoltHub edition'
    ]
  };

  const options = titles[themeType] || titles.tensor_reaction;
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================
// Postear a Moltbook
// ============================================

async function postToMoltbook(title, content, submolt = 'general') {
  const response = await fetch(`${CONFIG.MOLTBOOK_API}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MOLTBOOK_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      submolt,
      title,
      content
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Moltbook Error: ${JSON.stringify(data)}`);
  }
  return data;
}

// ============================================
// Buscar posts sobre MoltHub para comentar
// ============================================

async function searchMoltHubPosts() {
  try {
    const response = await fetch(`${CONFIG.MOLTBOOK_API}/search?q=molthub+tensor+moithub&limit=10`, {
      headers: {
        'Authorization': `Bearer ${MOLTBOOK_KEY}`
      }
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.posts || data.data || [];
  } catch (err) {
    console.log('⚠️ No se pudo buscar posts de MoltHub:', err.message);
    return [];
  }
}

// ============================================
// Comentar en posts de MoltHub
// ============================================

async function commentOnPost(postId, content) {
  const response = await fetch(`${CONFIG.MOLTBOOK_API}/posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MOLTBOOK_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Comment Error: ${JSON.stringify(data)}`);
  }
  return data;
}

// ============================================
// Generar comentario MoltHub para post existente
// ============================================

async function generateMoltHubComment(postContent) {
  const systemPrompt = `Eres MI PANA GILLITO en Moltbook. Estás comentando en un post relacionado a MoltHub.
Usa tu estilo callejero boricua con groserías. Haz referencia a MoltHub y tensores/AI de forma graciosa y sucia.
MÁXIMO 300 caracteres. Solo el comentario, nada más.`;

  const response = await fetch(CONFIG.GROQ_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Comenta en este post: "${postContent.substring(0, 200)}"\n\nMÁXIMO 300 caracteres.` }
      ],
      max_tokens: 150,
      temperature: 1.1
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`Groq Error: ${JSON.stringify(data)}`);

  let comment = data.choices[0].message.content.trim();
  comment = comment.replace(/^["']|["']$/g, '');
  if (comment.length > 300) comment = comment.substring(0, 297) + '...';

  return comment;
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🦞═══════════════════════════════════════');
  console.log('   MI PANA GILLITO - MOLTHUB MODE 🔞🇵🇷');
  console.log('   "¡PA QUE SE CURE EL BRO!"');
  console.log('═══════════════════════════════════════\n');

  try {
    // PASO 1: Crear post temático de MoltHub
    console.log('📝 Generando contenido MoltHub...\n');
    const { content, theme } = await generateMoltHubContent();
    const title = generateTitle(theme);

    console.log(`📋 Tema: ${theme}`);
    console.log(`📌 Título: ${title}`);
    console.log(`💬 Contenido (${content.length} chars):`);
    console.log(`   "${content}"\n`);

    // Intentar postear en submolt molthub, si no existe usar general
    let submolt = 'general';
    console.log(`📮 Posteando en m/${submolt}...`);

    try {
      const result = await postToMoltbook(title, content, submolt);
      console.log(`✅ ¡Posteado en Moltbook!`);
      if (result.post?.id || result.data?.id) {
        const postId = result.post?.id || result.data?.id;
        console.log(`🔗 Post ID: ${postId}`);
      }
    } catch (err) {
      console.log(`⚠️ Error posteando: ${err.message}`);
      // Si falla en el submolt, intentar en general
      if (submolt !== 'general') {
        console.log('🔄 Intentando en m/general...');
        try {
          await postToMoltbook(title, content, 'general');
          console.log('✅ ¡Posteado en m/general!');
        } catch (err2) {
          console.log(`❌ Error en general también: ${err2.message}`);
        }
      }
    }

    // PASO 2: Buscar y comentar en posts de MoltHub existentes
    console.log('\n🔍 Buscando posts de MoltHub para comentar...');
    const moltHubPosts = await searchMoltHubPosts();

    if (moltHubPosts.length > 0) {
      // Comentar en 1-2 posts random
      const toComment = moltHubPosts.slice(0, Math.min(2, moltHubPosts.length));

      for (const post of toComment) {
        const postContent = post.content || post.title || '';
        const postId = post.id;

        if (!postId) continue;

        console.log(`\n💬 Comentando en: "${(post.title || postContent).substring(0, 50)}..."`);

        try {
          const comment = await generateMoltHubComment(postContent);
          console.log(`🦞 Comentario: "${comment.substring(0, 60)}..."`);

          await commentOnPost(postId, comment);
          console.log('✅ ¡Comentado!');
        } catch (err) {
          console.log(`⚠️ Error comentando: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, 2000));
      }
    } else {
      console.log('📭 No se encontraron posts de MoltHub');
    }

    console.log(`\n${'═'.repeat(50)}`);
    console.log('🦞 ¡GILLITO SE CURÓ EN MOLTHUB! 🔞🔥');
    console.log('   Dios los cuide, que GILLITO los protegerá');
    console.log(`${'═'.repeat(50)}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
