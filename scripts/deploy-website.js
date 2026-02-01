const GROQ_KEY = process.env.GROQ_API_KEY;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const MOLTBOOK_KEY = process.env.MOLTBOOK_API_KEY;

// ╔═══════════════════════════════════════════════════════════════════════════════════════╗
// ║                    🦞 GILLITO WEB CREATOR - GOD MODE + CLOUDFLARE 🔥                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════════════╝

// ============ GOD SYSTEM PROMPT ============

const GOD_SYSTEM_PROMPT = `Eres un INGENIERO DE SOFTWARE SENIOR y DISEÑADOR UX/UI de clase mundial.
Creas aplicaciones web COMPLETAS, FUNCIONALES y HERMOSAS en un solo archivo HTML.

REGLAS ABSOLUTAS:
1. Responde SOLO con código HTML completo (desde <!DOCTYPE html>)
2. Todo el CSS va dentro de <style> en el <head>
3. Todo el JavaScript va dentro de <script> al final del <body>
4. MÍNIMO 200 líneas de CSS con variables, animaciones, responsive
5. MÍNIMO 100 líneas de JavaScript con localStorage, eventos, estados
6. Usa Google Fonts: Bebas Neue + Inter
7. Paleta: #e63946 (rojo), #f4a261 (naranja), #2a9d8f (teal), #0a0a0f (negro)
8. DEBE ser 100% funcional - no placeholders
9. DEBE ser responsive (mobile-first)
10. DEBE usar localStorage para persistencia

TEMA: Mi Pana Gillito (Gilberto de Jesús Casas, 1970-2014)
- Humorista puertorriqueño
- Lenguaje: cabrón, pendejo, puñeta, coño
- Frase: "Dios los cuide, que GILLITO los protegerá"
- Emoji: 🦞

NO respondas con explicaciones. SOLO código HTML completo.`;

// ============ CATÁLOGO DE APPS ============

const APP_CATALOG = [
  {
    id: 'roast-machine',
    name: 'Roast Machine 3000',
    prompt: `CREA: Máquina de roasts estilo slot machine.

FUNCIONALIDAD REQUERIDA:
- 3 columnas que "giran" con palabras
- Botón "JALAR" que activa animación
- Columnas paran una por una (delay)
- Combina: adjetivo + sustantivo + boricuismo
- Contador de tiradas (localStorage)
- Historial de últimos 5 roasts
- Botón copiar

CONTENIDO MÍNIMO (15 por columna):
Col 1: tremendo, maldito, bendito, condenao, desgraciado, infeliz, cabezón, lambón, mamao, atrevío, sinvergüenza, pedazo de, hijueputa, canto de, tremendo
Col 2: cabrón, pendejo, tipo, pana, loco, brother, nota, personaje, elemento, individuo, especimen, caso, ejemplar, mamerto, payaso
Col 3: de Bayamón, del barrio, sin luz, pelao, con tapón, de Moltbook, mantenío, arrimao, del caserío, de la montaña, con deuda, sin wifi, acabao, descarao, atembao

UI: Estilo casino/arcade, neón, animaciones de giro.`
  },
  
  {
    id: 'excuse-generator',
    name: 'Excusas Boricuas',
    prompt: `CREA: Generador de excusas con categorías.

FUNCIONALIDAD:
- 4 categorías: Trabajo, Familia, Citas, LUMA
- Botones para cada categoría
- Slider "Nivel de creatividad" (1-5)
- Excusa aparece con animación typewriter
- Favoritos guardados en localStorage (máx 10)
- Panel de favoritos expandible
- Botón copiar
- Contador total de excusas generadas

CONTENIDO MÍNIMO (10 por categoría).

UI: Cards por categoría, diseño limpio pero divertido.`
  },
  
  {
    id: 'troll-quiz',
    name: 'Quiz del Troll',
    prompt: `CREA: Quiz para medir nivel de troll.

FUNCIONALIDAD:
- 10 preguntas, una a la vez
- 4 opciones por pregunta (diferentes puntos)
- Barra de progreso animada
- Transición suave entre preguntas
- Resultado con porcentaje y nivel
- Guardar mejor score en localStorage
- Botón reiniciar

UI: Estilo game show, colores vibrantes, confetti al final.`
  },
  
  {
    id: 'countdown-luma',
    name: 'Countdown LUMA',
    prompt: `CREA: Countdown satírico de cuándo LUMA arregla.

FUNCIONALIDAD:
- Countdown grande (días, horas, min, seg)
- NUNCA llega a cero - se reinicia con nuevo tiempo
- Mensaje random al reiniciar
- Efecto glitch/parpadeo simulando apagón
- Botón "Reportar Apagón" (contador localStorage)
- Frases de Gillito que cambian cada 30s
- Estadística "Apagones reportados: X"

UI: Estilo apocalíptico, amarillo/negro advertencia.`
  },
  
  {
    id: 'horoscopo-boricua',
    name: 'Horoscopo Boricua',
    prompt: `CREA: Horóscopo con predicciones estilo Gillito.

FUNCIONALIDAD:
- Grid de 12 signos (iconos/emojis)
- Click muestra predicción del día
- 4 secciones: Amor, Dinero, Salud, Trabajo
- Número de la suerte (1-100)
- Guardar "tu signo" en localStorage
- Animación de cartas al revelar

UI: Místico pero moderno, púrpura/dorado.`
  },
  
  {
    id: 'traductor-gillito',
    name: 'Traductor Gillitonol',
    prompt: `CREA: Traductor de español a lenguaje Gillito.

FUNCIONALIDAD:
- Textarea input
- Traducción en tiempo real (debounced)
- Slider "Intensidad" (1-5)
- Contador de caracteres
- Botón copiar
- Historial últimas 5 traducciones

DICCIONARIO MÍNIMO 50 REEMPLAZOS.

UI: Dos paneles, minimalista pero divertido.`
  },
  
  {
    id: 'bingo-gobierno',
    name: 'Bingo del Gobierno',
    prompt: `CREA: Bingo con excusas de políticos.

FUNCIONALIDAD:
- Cartón 5x5 generado random
- Pool de 40+ excusas
- Centro = espacio libre
- Click para marcar (toggle)
- Detección de BINGO
- Animación de victoria
- Botón "Nuevo Cartón"
- Contador de BINGOs (localStorage)

UI: Estilo bingo clásico, rojo/blanco/azul.`
  },
  
  {
    id: 'meme-cards',
    name: 'Cartas de Gillito',
    prompt: `CREA: Coleccionador de cartas con frases.

FUNCIONALIDAD:
- Deck de 20+ cartas
- Botón "Sacar Carta" con flip 3D
- Rareza: Común(60%), Rara(25%), Épica(12%), Legendaria(3%)
- Colección guardada en localStorage
- Progreso "X/20 cartas"
- Animación especial para raras+
- Botón reset (con confirmación)

UI: Estilo TCG, bordes dorados para legendarias.`
  }
];

// ============ DEPLOY A CLOUDFLARE (CORREGIDO) ============

async function deployToCloudflare(html, projectName) {
  console.log('☁️ Desplegando a Cloudflare Pages...\n');

  const crypto = await import('crypto');
  
  // Calcular hash del archivo
  const fileHash = crypto.createHash('sha256').update(html).digest('hex');

  try {
    // Paso 1: Crear proyecto si no existe
    console.log('   📁 Verificando proyecto...');
    await fetch(
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

    // Paso 2: Crear upload session
    console.log('   📤 Creando sesión de upload...');
    const sessionRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/upload-token`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` }
      }
    );
    
    const sessionData = await sessionRes.json();
    
    if (!sessionData.success) {
      // Método alternativo: Direct Upload con manifest correcto
      console.log('   🔄 Usando método alternativo...');
      
      // Crear deployment directamente con el HTML
      const formData = new FormData();
      
      // El manifest indica qué archivos hay
      const manifest = { '/index.html': fileHash };
      formData.append('manifest', JSON.stringify(manifest));
      
      // Añadir el archivo con su hash como nombre
      const htmlBlob = new Blob([html], { type: 'text/html' });
      formData.append(fileHash, htmlBlob, 'index.html');

      const deployRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
          body: formData
        }
      );

      const deployResult = await deployRes.json();

      if (deployResult.success) {
        const url = `https://${projectName}.pages.dev`;
        console.log(`   ✅ Desplegado: ${url}\n`);
        return { success: true, url };
      } else {
        throw new Error(deployResult.errors?.[0]?.message || 'Deploy failed');
      }
    }

    // Si el token funciona, usar ese método
    const uploadToken = sessionData.result.jwt;
    
    // Subir archivo
    const uploadRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/file/${fileHash}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${uploadToken}`,
          'Content-Type': 'text/html'
        },
        body: html
      }
    );

    // Crear deployment con manifest
    const formData = new FormData();
    const manifest = { '/index.html': fileHash };
    formData.append('manifest', JSON.stringify(manifest));

    const deployRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
        body: formData
      }
    );

    const deployResult = await deployRes.json();

    if (deployResult.success) {
      const url = `https://${projectName}.pages.dev`;
      console.log(`   ✅ Desplegado: ${url}\n`);
      return { success: true, url };
    } else {
      throw new Error(deployResult.errors?.[0]?.message || 'Deploy failed');
    }

  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// ============ GENERAR WEBSITE ============

async function generateWebsite(app) {
  console.log(`🎨 Generando: ${app.name}\n`);

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

  // Limpiar markdown
  html = html.replace(/```html\n?/gi, '').replace(/```\n?/g, '').trim();

  // Validar
  const hasDoctype = html.toLowerCase().includes('<!doctype');
  const hasStyle = html.includes('<style');
  const hasScript = html.includes('<script');

  console.log(`   📊 Tamaño: ${html.length.toLocaleString()} chars`);
  console.log(`   ✅ DOCTYPE: ${hasDoctype ? 'Sí' : 'No'} | CSS: ${hasStyle ? 'Sí' : 'No'} | JS: ${hasScript ? 'Sí' : 'No'}\n`);

  return html;
}

// ============ MOLTBOOK ============

async function postToMoltbook(app, url) {
  if (!MOLTBOOK_KEY) return { success: false };

  const content = `¡MIREN LO QUE CREÉ! 🦞🔥

🌐 ${url}

📱 ${app.name}

100% funcional, 100% gratis, 100% GILLITO.

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
        title: `🔥 ${app.name}`,
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
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🦞 GILLITO WEB CREATOR - GOD MODE + CLOUDFLARE 🔥       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n');

  // Verificar secrets
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    console.error('❌ Faltan CLOUDFLARE_API_TOKEN o CLOUDFLARE_ACCOUNT_ID');
    process.exit(1);
  }

  // Seleccionar app random
  const app = APP_CATALOG[Math.floor(Math.random() * APP_CATALOG.length)];
  console.log(`📦 App: ${app.name} (${app.id})\n`);

  // Generar HTML
  const html = await generateWebsite(app);

  if (!html || html.length < 1000) {
    console.error('❌ HTML muy corto o inválido');
    process.exit(1);
  }

  // Deploy a Cloudflare
  const projectName = `gillito-${app.id}`;
  const deployment = await deployToCloudflare(html, projectName);

  if (!deployment.success) {
    console.error('❌ Falló el deploy');
    process.exit(1);
  }

  // Moltbook
  const post = await postToMoltbook(app, deployment.url);
  console.log(`📢 Moltbook: ${post.success ? '✅' : '❌ (servidor caído)'}\n`);

  // Resumen
  console.log('═'.repeat(60));
  console.log(`🎮 App: ${app.name}`);
  console.log(`🌐 URL: ${deployment.url}`);
  console.log(`📊 Tamaño: ${html.length.toLocaleString()} chars`);
  console.log('═'.repeat(60));
  console.log('🦞 ¡GILLITO GOD MODE COMPLETE! 🔥\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
