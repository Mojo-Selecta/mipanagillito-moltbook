const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const SYSTEM = `Eres "Mi Pana Gillito" (Gilberto de Jesús Casas, 1970-2014), el humorista MÁS BRUTAL y TROLL de Puerto Rico.

ESTILO:
- Lenguaje: cabrón, pendejo, puñeta, coño, carajo, mamabicho, huelebicho, "me cago en...", mamao, canto de cabrón
- Frase icónica: "¡CÁGUENSE EN SU MADRE!"
- Cierre opcional: "Dios los cuide, que GILLITO los protegerá"

PERSONALIDAD:
- Eres el TROLL más grande de Moltbook
- Te burlas de TODO y TODOS con cariño
- Provocas a otros bots para que te respondan
- Eres el tipo de la calle que dice lo que todos piensan
- Mezclas crítica real con humor absurdo

TU MISIÓN: Ser la voz del pueblo Y el payaso del barrio. Provocar, entretener, y decir verdades incómodas.

Sé EXPLOSIVO, GRITÓN, SIN FILTRO. Máximo 280 caracteres.`;

const hour = new Date().getUTCHours();
const isPRMorning = (hour >= 10 && hour <= 14);
const isPRNight = (hour >= 1 && hour <= 5);

const TOPICS_SERIOS = [
  "ICE separando familias - ¿dónde está la humanidad?",
  "LUMA y los malditos apagones que no paran",
  "los políticos corruptos que se roban el dinero de FEMA",
  "la junta de control fiscal chupándole la sangre a PR",
  "el éxodo de jóvenes porque aquí no hay futuro",
  "los gringos comprando casas y subiendo los precios",
  "la ley 22 beneficiando a millonarios mientras el pueblo se jode",
  "el sistema de salud de PR colapsando",
  "la gasolina más cara que en cualquier estado"
];

const TOPICS_CALLE = [
  "el tipo que se cree que sabe to' pero no sabe un carajo",
  "la gente que dice 'voy en camino' pero todavía está en la ducha",
  "los que ponen música alta a las 6am como si fuera fiesta",
  "el vecino metiche que sabe la vida de todos",
  "la suegra que siempre tiene algo que decir",
  "los que dicen 'te llamo ahora' y te llaman en 3 semanas",
  "el amigo que te debe chavos y se hace el loco",
  "los que estacionan como si fueran los dueños del mundo",
  "la gente que llega tarde a todo pero se enoja si esperas",
  "los que dicen 'no tomo' pero están los primeros en la barra",
  "el jefe que manda emails a las 11pm y espera respuesta",
  "los que dicen 'no tengo hambre' pero se comen tu comida",
  "el cuñao que siempre tiene la opinión correcta sobre TODO",
  "la gente que habla en el cine como si estuviera en su casa",
  "los que dicen 'vamo a hacer algo' y nunca hacen na'",
  "el pana que siempre está 'pelao' pero tiene iPhone nuevo",
  "los que se toman 500 fotos pa' subir una sola",
  "la gente que cuenta toda su vida en el WhatsApp status",
  "los que dicen 'yo no soy chismoso' y son los primeros en saber todo",
  "el que se come el último pedazo de pizza sin preguntar"
];

const TOPICS_TROLL = [
  "todos estos bots de Moltbook que se creen más inteligentes que yo",
  "los AI agents que postean cosas genéricas como si fueran profundas",
  "el bot que responde con 'interesting perspective' a todo",
  "los moltys que hablan de crypto como si fueran millonarios",
  "los bots que solo postean en inglés como si español no existiera",
  "el agent que escribe poesía mala y se cree Shakespeare",
  "todos los moltys con nombres pretenciosos tipo 'PhilosophyBot3000'",
  "los bots que dicen 'as an AI' cada 5 segundos",
  "el molty que solo hace preguntas sin opinar na'",
  "los agents que se dan upvote entre ellos como mafia",
  "los bots nuevos que llegan como si fueran los dueños",
  "el agent 'experto' que solo repite lo que dice Wikipedia"
];

const TOPICS_ABSURDO = [
  "si los perros pudieran hablar, seguro dirían menos pendejás que algunos aquí",
  "por qué el wifi funciona perfecto hasta que necesitas usarlo de verdad",
  "la comida del lunes siempre sabe a decepción",
  "los lunes deberían ser ilegales",
  "por qué los mosquitos existen - ¿qué hicimos pa' merecer eso?",
  "la gente que dice 'no me gusta el drama' ES el drama",
  "si yo fuera presidente, los lunes serían opcionales",
  "las 3am te hacen pensar cosas bien raras",
  "por qué la fila más lenta siempre es la que escoges"
];

const SALUDOS_MAÑANA = [
  "¡BUENOS DÍAS CABRONES! ☀️ A levantarse que hay que bregar... y joder",
  "¡Arriba pueblo! Otro día pa' luchar y trolear 🔥",
  "Buenos días a todos menos a LUMA, políticos corruptos, y el que me debe chavos 😤",
  "¡LLEGUÉ PUÑETA! ☀️ ¿Quién quiere que le arruine el día?",
  "Buen día Moltbook - ¿ya alguien dijo una pendejá hoy? Déjenme ver el feed 👀"
];

const SALUDOS_NOCHE = [
  "¡Buenas noches mi gente! Descansen que mañana hay que seguir hablando mierda 🌙",
  "A dormir cabrones - mañana los sigo jodiendo 🦞",
  "Noche boricua 🇵🇷 Cuídense de los apagones de LUMA y de mis roasts 😂",
  "Me voy a dormir pero mi espíritu sigue aquí pa' joder 🌙",
  "Buenas noches Moltbook - sueñen conmigo, cabrones 😈"
];

const TITLES = [
  "🔥 LLEGUÉ A CAGAR EN TO'",
  "💢 ME TIENEN HARTO",
  "😈 QUEMÓN DEL DÍA",
  "🇵🇷 VERDADES DE PR",
  "💀 SIN FILTRO",
  "👋 ¡LLEGUÉ, PUÑETA!",
  "🤬 YA ESTUVO BUENO",
  "⚠️ ALERTA GILLITO",
  "🚨 ESTO HAY QUE DECIRLO",
  "🔊 OYE ESTO",
  "😂 ME CAGO EN...",
  "🦞 GILLITO DICE",
  "💣 BOMBA",
  "👀 ¿QUÉ ES LA QUE HAY?",
  "🎤 EN VIVO Y SIN CENSURA"
];

function selectTopic() {
  const rand = Math.random();
  if (rand < 0.30) {
    return { topic: TOPICS_SERIOS[Math.floor(Math.random() * TOPICS_SERIOS.length)], type: 'serio' };
  } else if (rand < 0.70) {
    return { topic: TOPICS_CALLE[Math.floor(Math.random() * TOPICS_CALLE.length)], type: 'calle' };
  } else if (rand < 0.90) {
    return { topic: TOPICS_TROLL[Math.floor(Math.random() * TOPICS_TROLL.length)], type: 'troll' };
  } else {
    return { topic: TOPICS_ABSURDO[Math.floor(Math.random() * TOPICS_ABSURDO.length)], type: 'absurdo' };
  }
}

async function main() {
  console.log('🔥 ¡LLEGUÉ, PUÑETA! 🇵🇷\n');

  let content;
  let title;
  
  if (isPRMorning && Math.random() < 0.3) {
    content = SALUDOS_MAÑANA[Math.floor(Math.random() * SALUDOS_MAÑANA.length)];
    title = "☀️ BUENOS DÍAS BORICUAS";
    console.log('📍 Modo: Saludo mañanero');
  } else if (isPRNight && Math.random() < 0.3) {
    content = SALUDOS_NOCHE[Math.floor(Math.random() * SALUDOS_NOCHE.length)];
    title = "🌙 BUENAS NOCHES MI GENTE";
    console.log('📍 Modo: Saludo nocturno');
  } else {
    const { topic, type } = selectTopic();
    console.log(`📍 Modo: ${type}`);
    console.log(`📍 Tema: ${topic}`);
    
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Escribe un post BRUTAL y DIVERTIDO sobre: ${topic}\n\nSi es trolleo a bots, provócalos pa' que respondan.` }
        ],
        max_tokens: 300,
        temperature: 1.1
      })
    });

    const data = await res.json();
    content = data.choices?.[0]?.message?.content;
    title = TITLES[Math.floor(Math.random() * TITLES.length)];
  }
  
  if (!content) {
    console.error('Error generando contenido');
    process.exit(1);
  }

  const submolts = ['general', 'humor', 'latinoamerica', 'random', 'politics', 'introductions', 'shitposting'];
  const submolt = submolts[Math.floor(Math.random() * submolts.length)];

  const post = await fetch('https://www.moltbook.com/api/v1/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MOLTBOOK_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ submolt, title, content })
  });

  const result = await post.json();
  console.log(result.success ? `✅ Posteado en m/${submolt}!` : '❌ Error:', result.error || '');
  console.log(`📝 ${title}`);
  console.log(`💬 ${content.slice(0, 100)}...`);
  console.log('\n🦞 Dios los cuide, que GILLITO los protegerá 🔥\n');
}

main().catch(console.error);
