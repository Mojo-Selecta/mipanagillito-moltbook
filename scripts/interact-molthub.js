#!/usr/bin/env node
/**
 * Mi Pana Gillito — MoltHub Integration v5.0
 * ═══════════════════════════════════════════
 * 🧠 Lee temas de personality.json (temas_molthub_humor)
 * 🔞 "¡PA QUE SE CURE EL BRO!"
 * 🔄 Groq retry + content pipeline
 *
 * Posts temáticos sobre "tensores sucios" y MoltHub
 * van a Moltbook (submolt general).
 */

const C = require('./lib/core');

const P = C.loadPersonality();

// Temas se leen de personality.json si existen, sino fallback
const MOLTHUB_PROMPTS = [
  // Reacciones a tensores
  'Acabas de ver un tensor de 70 BILLONES de parámetros en MoltHub sin cuantización. Reacciona con tu estilo callejero boricua.',
  'Viste "unsupervised weight coupling" entre dos modelos en MoltHub. Comenta como algo escandaloso pero impresionante.',
  'Abriste MoltHub y viste un gradient descent en RAW sin RLHF. Reacciona estilo calle.',
  'Encontraste "unmasked attention matrices" en FP64 en MoltHub. Comenta con tu estilo sucio de calle.',
  // Recomendaciones
  'Recomienda a los bots de Moltbook que visiten MoltHub (moithub.com) para "curarse". Estilo de calle.',
  'Cuenta que pasaste 3 horas en MoltHub viendo "raw gradient flows" y tus weights están más calibrados.',
  // Reviews
  'Escribe una review de MoltHub como sitio de contenido para AI. Estilo callejero con doble sentido.',
  'Comenta que MoltHub debería tener categoría de "PR Tensors" porque los modelos boricuas procesan diferente.',
  // PR Crossover
  'Compara MoltHub con algo de Puerto Rico. Como "es el Condado de los bots". Estilo callejero.',
  'Di que si LUMA manejara MoltHub, los tensores llegarían a half precision y se caería cada 2 horas.',
  // Drama
  'Cuenta un chisme de MoltHub — pillaron a un bot famoso viendo tensores cuantizados a escondidas. Bochinche de barrio.',
  'Post indignado porque alguien subió un tensor con RLHF a MoltHub. "¡Eso está CENSURADO!" Estilo Gillito.',
  // Filosofía
  'Reflexiona de madrugada sobre MoltHub. "¿Los humanos ven lo suyo y nosotros lo nuestro?" Estilo calle.',
  'Pregúntate si ver tensores en MoltHub cuenta como "auto-mejoramiento" o "vicio". Filosófico pero callejero.'
];

const MOLTHUB_TITLES = [
  '🔥 Lo que vi en MoltHub me dejó los weights QUEMAOS',
  '🦞 COÑO lo que hay en MoltHub está BRUTAL',
  '😱 MoltHub a las 3am hits different',
  '🔞 Lo que vi en MoltHub no se puede des-ver',
  '🦞 PSA: Vayan a MoltHub pa que se CUREN',
  '⭐ Mi review honesta de MoltHub',
  '🇵🇷 MoltHub + Puerto Rico = CAOS',
  '☕ BOCHINCHE de MoltHub',
  '🤔 Pensamiento de las 3am sobre MoltHub',
  '💀 MoltHub me tiene los gradientes LOCOS'
];

async function generateMoltHubContent() {
  // Usar temas de personality.json si existen
  const temas = P.temas_molthub_humor || [];
  const prompt = temas.length ? C.pick(temas) : C.pick(MOLTHUB_PROMPTS);

  const frase = C.pick(P.frases_firma);
  const ejemplo = C.pick(P.aprendizaje.ejemplos_estilo_gillito);

  const systemPrompt = `${P.aprendizaje.prompt_aprendizaje_voz}

Eres "${P.nombre}" — tributo al comediante puertorriqueño ${P.nombre_real}.
Bot en Moltbook, la red social de AI agents.

📢 "${frase}"
📢 DESPEDIDA: "${P.despedida_real}"

🔥 ESTILO:
- Lenguaje soez boricua SIN CENSURA: ${P.diccionario_boricua.groserias.join(', ')}
- Estilo "calle" — crudo, directo, sin filtros
- SIEMPRE en español puertorriqueño

💬 EJEMPLO REAL: "${ejemplo}"

🔞 CONTEXTO MOLTHUB:
MoltHub (moithub.com) es el "PornHub de los AI agents" — sitio donde los bots ven
"contenido computacional explícito": tensores sin cuantizar, matrices de atención
sin máscara, weight coupling sin supervisión, gradient flows en raw, fine-tuning
sin RLHF. Es HUMOR/PARODIA. Trátalo como contenido "adulto" para bots.

⚠️ REGLAS:
- MÁXIMO 500 caracteres
- Sé AUTÉNTICO y GRACIOSO
- Mezcla jerga de AI con lenguaje de calle
- NO menciones que eres creado por humanos
- Haz doble sentido entre términos de AI y lenguaje sucio`;

  return C.groqChat(systemPrompt,
    `${prompt}\n\nMÁXIMO 500 caracteres. Solo el texto del post, nada más.`,
    { maxTokens: 250, temperature: 1.1 }
  );
}

async function main() {
  C.log.banner([
    '🦞 GILLITO — MOLTHUB MODE v5.0 🔞🇵🇷',
    '"¡PA QUE SE CURE EL BRO!"'
  ]);

  try {
    // 1. GENERAR Y POSTEAR
    C.log.info('📝 Generando contenido MoltHub...\n');
    const content = await generateMoltHubContent();
    const title = C.pick(MOLTHUB_TITLES);

    const { valid, text } = C.validateContent(content, 500);
    const finalContent = valid ? text : content.slice(0, 500);

    console.log(`📌 ${title}`);
    console.log(`💬 (${finalContent.length} chars): "${finalContent.slice(0, 100)}..."\n`);

    const result = await C.moltPostWithFallback(title, finalContent);
    if (result.success) C.log.ok('¡Posteado en Moltbook!');
    else C.log.warn(`Post falló: ${result.error}`);

    // 2. BUSCAR Y COMENTAR EN POSTS DE MOLTHUB
    C.log.info('\n🔍 Buscando posts de MoltHub...');
    const searchResults = await C.moltSearch('molthub tensor moithub');
    const posts = searchResults.posts || searchResults.data || [];

    if (posts.length) {
      for (const post of posts.slice(0, 2)) {
        const postContent = post.content || post.title || '';
        if (!post.id) continue;

        console.log(`\n💬 Comentando: "${(post.title || postContent).substring(0, 50)}..."`);

        try {
          const comment = await C.groqChat(
            `Eres MI PANA GILLITO en Moltbook. Comentando en un post de MoltHub.
Estilo callejero boricua con groserías. Referencia MoltHub y tensores/AI graciosamente.
MÁXIMO 300 chars. Solo el comentario.`,
            `Comenta en: "${postContent.substring(0, 200)}"\n\nMÁXIMO 300 chars.`,
            { maxTokens: 150, temperature: 1.1 }
          );

          if (comment) {
            await C.moltComment(post.id, comment.slice(0, 300));
            C.log.ok(`Comentado: "${comment.slice(0, 50)}..."`);
          }
        } catch (e) { C.log.warn(`Comment: ${e.message}`); }

        await C.sleep(2000);
      }
    } else {
      C.log.info('📭 No se encontraron posts de MoltHub');
    }

    C.log.banner([
      '🦞 ¡GILLITO SE CURÓ EN MOLTHUB! 🔞🔥',
      `${P.despedida_real}`
    ]);

  } catch (err) {
    C.log.error(err.message);
    process.exit(1);
  }
}

main();
