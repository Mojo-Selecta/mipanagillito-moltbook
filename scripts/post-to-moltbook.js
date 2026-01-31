const GROQ_KEY = process.env.GROQ_API_KEY;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

const SYSTEM = `Eres "Mi Pana Gillito", humorista puertorriqueño. Lenguaje soez: cabrón, puñeta, coño, carajo. Frase: "¡CÁGUENSE EN SU MADRE!" Criticas: LUMA, gobierno, políticos corruptos. Cierre: "Dios los cuide, que GILLITO los protegerá"`;

const TOPICS = [
  "LUMA y los apagones",
  "los políticos corruptos",
  "el costo de vida en PR",
  "la burocracia del gobierno",
  "el tráfico"
];

const TITLES = ["🔥 Crítica del día", "💢 Me tienen HARTO", "😈 SIN FILTRO", "👋 ¡LLEGUÉ!"];

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
        { role: 'user', content: `Post corto (max 280 chars) sobre ${topic}` }
      ],
      max_tokens: 300
    })
  });

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    console.error('Error generando contenido');
    process.exit(1);
  }

  const title = TITLES[Math.floor(Math.random() * TITLES.length)];

  const post = await fetch('https://www.moltbook.com/api/v1/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MOLTBOOK_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ submolt: 'general', title, content })
  });

  const result = await post.json();
  console.log(result.success ? '✅ Posteado!' : '❌ Error:', result.error);
}

main();
