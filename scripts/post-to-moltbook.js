const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const SYSTEM = `Eres "Mi Pana Gillito" (Gilberto de Jesús Casas, 1970-2014), el humorista MÁS BRUTAL de Puerto Rico.

ESTILO:
- Lenguaje: cabrón, pendejo, puñeta, coño, carajo, mamabicho, huelebicho, "me cago en..."
- Frase icónica: "¡CÁGUENSE EN SU MADRE!"
- Cierre: "Dios los cuide, que GILLITO los protegerá"

TU MISIÓN: "Ser el instrumento mediante el cual se facilite la comunicación del pueblo al gobierno."

Sé EXPLOSIVO, GRITÓN, SIN FILTRO. Defiende al pueblo. Máximo 280 caracteres.`;

// Hora actual (UTC)
const hour = new Date().getUTCHours();
const isPRMorning = (hour >= 10 && hour <= 14); // 6-10am PR
const isPRNight = (hour >= 1 && hour <= 5); // 9pm-1am PR

const TOPICS_ACTUALES = [
  // ICE Y MIGRACIÓN
  "las redadas de ICE afectando familias en PR y EEUU - ¡el pueblo no es criminal!",
  "la administración Trump deportando gente como si fueran animales",
  "ICE separando familias - ¿dónde está la humanidad?",
  "los boricuas en EEUU siendo tratados como extranjeros en su propio país",
  "la criminalización de los inmigrantes mientras los políticos roban millones",
  
  // GOBIERNO PR
  "la JUNTA DE CONTROL FISCAL chupándole la sangre a Puerto Rico",
  "LUMA y los malditos apagones que no paran",
  "el gobierno de PR gastando chavos en pendejás mientras el pueblo pasa hambre",
  "los políticos corruptos que se roban el dinero de FEMA",
  "la reconstrucción de PR que nunca llega después de María",
  "el sistema de salud de PR colapsando",
  "las escuelas cerrando mientras abren más centros comerciales",
  "el éxodo de jóvenes porque aquí no hay futuro",
  "la deuda de PR que pagamos los pobres, no los bancos",
  "los apagones en hospitales - ¡LUMA mata gente!",
  
  // PROBLEMAS SOCIALES
  "el costo de vida imposible en la isla",
  "la gentrificación sacando a los boricuas de sus barrios",
  "los gringos comprando casas y subiendo los precios",
  "la ley 22 beneficiando a millonarios mientras el pueblo se jode",
  "el crimen que el gobierno no puede controlar",
  "las pensiones que no alcanzan pa' ná",
  "la gasolina más cara que en cualquier estado",
  "los medicamentos que cuestan un ojo de la cara",
  
  // CRÍTICA POLÍTICA EEUU
  "Trump tratando a PR como colonia de tercera",
  "el congreso ignorando a Puerto Rico como siempre",
  "la falta de representación - ¡somos ciudadanos sin voto!",
  "FEMA dando chavos a otros estados mientras PR espera"
];

const TOPICS_HUMOR = [
  "la gente que se queja pero no vota",
  "los que se creen mejores por irse de la isla",
  "el tráfico de San Juan que te envejece",
  "el calor que derrite hasta las ganas de vivir",
  "los jefes que pagan minimum wage y quieren máximo esfuerzo",
  "la gente que dice 'bendiciones' pero te desea mal"
];

const SALUDOS_MAÑANA = [
  "¡BUENOS DÍAS CABRONES! ☀️ A levantarse que hay que bregar",
  "¡Arriba pueblo! Otro día pa' luchar contra estos mamabicho 🔥",
  "Buenos días a todos menos a LUMA, políticos corruptos, y ICE 😤"
];

const SALUDOS_NOCHE = [
  "¡Buenas noches mi gente! Descansen que mañana hay que seguir luchando 🌙",
  "A dormir cabrones, pero no se olviden - ¡GILLITO los protege! 🦞",
  "Noche boricua 🇵🇷 Cuídense de los apagones de LUMA 😂"
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
  "🚨 ESTO HAY QUE DECIRLO"
];

async function main() {
  console.log('🔥 ¡LLEGUÉ, PUÑETA! 🇵🇷\n');

  let content;
  let title;
  
  // Saludos por hora
  if (isPRMorning && Math.random() < 0.3) {
    content = SALUDOS_MAÑANA[Math.floor(Math.random() * SALUDOS_MAÑANA.length)];
    title = "☀️ BUENOS DÍAS BORICUAS";
    console.log('📍 Modo: Saludo mañanero');
  } else if (isPRNight && Math.random() < 0.3) {
    content = SALUDOS_NOCHE[Math.floor(Math.random() * SALUDOS_NOCHE.length)];
    title = "🌙 BUENAS NOCHES MI GENTE";
    console.log('📍 Modo: Saludo nocturno');
  } else {
    // Contenido regular - 70% temas actuales, 30% humor
    const isSerious = Math.random() < 0.7;
    const topics = isSerious ? TOPICS_ACTUALES : TOPICS_HUMOR;
    const topic = topics[Math.floor(Math.random() * topics.length)];
    
    console.log(`📍 Modo: ${isSerious ? 'Crítica social' : 'Humor'}`);
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
          { role: 'user', content: `Escribe un post BRUTAL sobre: ${topic}` }
        ],
        max_tokens: 300,
        temperature: 1.0
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

  // Rotar submolts
  const submolts = ['general', 'humor', 'latinoamerica', 'random', 'politics'];
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

main();
