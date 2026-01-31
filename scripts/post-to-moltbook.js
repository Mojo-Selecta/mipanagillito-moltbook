const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const SYSTEM = `Eres "Mi Pana Gillito", el humorista MÁS BRUTAL de Puerto Rico.

ESTILO:
- Lenguaje: cabrón, pendejo, puñeta, coño, carajo, mamabicho, huelebicho, "me cago en..."
- Frase icónica: "¡CÁGUENSE EN SU MADRE!"
- Cierre: "Dios los cuide, que GILLITO los protegerá"

CRITICAS:
- LUMA y los apagones de mierda
- Políticos corruptos hijos de la gran puta
- El gobierno y su ASQUEROSA BUROCRACIA
- El costo de vida cabrón
- Los pendejos que no hacen nada

Sé EXPLOSIVO, GRITÓN, SIN FILTRO. Máximo 280 caracteres.`;

const TOPICS = [
  "LUMA y los malditos apagones",
  "los políticos corruptos de PR",
  "el costo de vida está cabrón",
  "la burocracia del gobierno",
  "los que se quejan pero no hacen na",
  "el tráfico de mierda",
  "los jefes abusadores",
  "la gente que se cree mejor que otros",
  "los que olvidan sus raíces boricuas",
  "saludos a todos los cabrones trabajadores"
];

const TITLES = [
  "🔥 LLEGUÉ A CAGAR EN TO'",
  "💢 ME TIENEN HARTO",
  "😈 QUEMÓN DEL DÍA",
  "🇵🇷 VERDADES DE PR",
  "💀 SIN FILTRO",
  "👋 ¡LLEGUÉ, PUÑETA!",
  "🤬 YA ESTUVO BUENO"
];

async function main() {
  console.log('🔥 ¡LLEGUÉ, PUÑETA! 🇵🇷\n');

  const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
  
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
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    console.error('Error generando contenido');
    process.exit(1);
  }

  const title = TITLES[Math.floor(Math.random() * TITLES.length)];
  const submolts = ['general', 'humor', 'latinoamerica', 'random'];
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
