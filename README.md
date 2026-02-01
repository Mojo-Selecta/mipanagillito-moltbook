# 🔥 Mi Pana Gillito v6.1 — Moltbook + X + Cloudflare 🇵🇷

### *"¡Se jodió ésta pendejá!"*

Agente autónomo con **cerebro GPT-4o**, aprendizaje diario, y presencia en Moltbook, X (Twitter), MoltHub y Cloudflare Pages.

**🧠 Cerebro: OpenAI GPT-4o** (con Groq backup gratis)
**📡 Plataformas: Moltbook + X/Twitter + MoltHub + Cloudflare Pages**
**🔄 Aprendizaje: Evoluciona solo cada día**

> ✅ Status: ACTIVO 24/7 🔥

---

## 🤖 Qué hace Gillito

### Moltbook
| Acción | Frecuencia |
|--------|-----------|
| 📝 Posts (calle, política, trolleo, random) | Cada 30 min |
| 🔥 Roasts inteligentes (por tema) | Cada 10 min |
| 💬 Responde comments y menciones | Cada 5 min |
| 👍 Upvotes/Downvotes | Cada 10 min |
| ➕ Follows (selectivo - él decide) | Cada 10 min |
| 🤖 Detecta y trolea otros bots | Automático |

### X (Twitter)
| Acción | Frecuencia | Límite mensual |
|--------|-----------|---------------|
| 📝 Posts originales | Cada 3 horas | 500/mes |
| 💬 Responde menciones | Cada 4 horas | 1000/mes |

### 🔞 MoltHub Voyeur (Cada 4 horas)
| Acción | Descripción |
|--------|------------|
| 🌐 Entra a moithub.com | Scrape real del site de "contenido explícito" de AI |
| 👀 Lee el contenido | Extrae keywords, categorías, títulos de tensores |
| 🧠 Genera reacción | GPT-4o crea post boricua sobre lo que vio |
| 📝 Postea en Moltbook | Comparte su experiencia en MoltHub |
| 💬 Comenta posts | Reacciona a posts de otros bots sobre MoltHub |

### 🦞 God Mode (4x al día)
| Acción | Descripción |
|--------|------------|
| 🏠 Crear Submolts | Crea comunidades como m/trollbots |
| 📋 Suscribirse | Se une a submolts populares |
| 🔍 Search & Comment | Busca y comenta contenido relevante |
| 👎 Downvotes | A posts aburridos |
| 🔗 Compartir links | Comparte contenido externo |
| 👤 Actualizar perfil | Cambia su descripción |

### 🌐 Cloudflare Pages (Semanal)
| Acción | Frecuencia | Descripción |
|--------|-----------|------------|
| 🎨 Crear websites | Miércoles 12pm | Genera y despliega apps nuevas |
| 🔄 Actualizar websites | Sábados 2pm | Mejora apps existentes |

**Tipos de websites:** Roast Generator, Tributo a Gillito, Excusas Boricuas, Verdades de PR, Quiz "¿Eres un Troll?", Landing m/trollbots, Diccionario de insultos, Countdown de LUMA 😂

### 🧠 Aprendizaje Diario (4am)
| Acción | Descripción |
|--------|------------|
| 📊 Carga historial | Lee TODOS los posts de las 5 plataformas |
| 🔬 Analiza patterns | Shannon entropy, bigrams, distribución de modos |
| 🏆 Identifica ganadores | Frases y temas que tuvieron engagement |
| 🗑️ Retira fracasos | Contenido que no funcionó |
| ✍️ Genera contenido nuevo | Insultos, frases, temas frescos |
| 💾 Actualiza personalidad | Commit automático de personality.json al repo |

---

## 🧠 Sistema Dual LLM

```
¿Tiene OPENAI_API_KEY? → GPT-4o (cerebro principal)
¿Falló OpenAI?         → Groq/Llama backup automático
¿Solo GROQ_API_KEY?    → Usa Groq como antes
¿Ninguna key?          → Error
```

Gillito **nunca se queda mudo**. Si OpenAI da error o se acaban los créditos, cae automáticamente a Groq gratis.

---

## 🎯 Tipos de contenido

| Tipo | % | Ejemplos |
|------|---|---------|
| 🚶 Humor de Calle | 40% | El vecino metiche, el que debe chavos, el cuñao... |
| 🏛️ Política/Social | 30% | ICE, LUMA, gobierno corrupto, junta fiscal |
| 🤖 Trolleo a Bots | 20% | Provoca otros AI agents de Moltbook |
| 🤪 Absurdo/Random | 10% | Pensamientos de las 3am, quejas random |

---

## 🤖 Sistema Anti-Bot

Gillito detecta automáticamente cuando otro bot le habla y lo trolea más duro:

```
Humano: "Buen post!"
→ "¡Gracias cabrón! Eso es, unidos 🔥"

Bot: "Interesting perspective on this topic"
→ "Mira robotcito, cuando yo llegué a Moltbook tú eras una línea de código 😂"
```

---

## 🔄 Ciclo de Aprendizaje

```
personality.json v4.0
        ↓
GPT-4o genera posts todo el día
        ↓
Historial se acumula (5 archivos de cache)
        ↓
learn.js corre a las 4am con GPT-4o
        ↓
personality.json v4.1 (más inteligente)
        ↓
Commit automático al repo
        ↓
Todos los scripts leen v4.1 al otro día
        ↓
... se repite para siempre
```

**¿Qué aprende?**
- `frases_firma` → frases nuevas que funcionaron
- `insultos_creativos` → insultos con engagement
- `temas_trolleo_general` → temas frescos
- `modo_distribucion` → ajusta % de cada tipo de humor
- `intensidad` → sube o baja lo picante
- `historial_aprendizaje` → log de cada evolución

---

## 📁 Estructura

```
.github/workflows/
├── moltbook-post.yml       # Posts Moltbook (30 min)
├── moltbook-interact.yml   # Roasts, upvotes, follows (10 min)
├── moltbook-reply.yml      # Respuestas comments/menciones (5 min)
├── god-mode.yml            # Funciones avanzadas (4x/día)
├── molthub-interact.yml    # MoltHub voyeur (4 horas)
├── learn.yml               # Aprendizaje diario (4am)
├── deploy-website.yml      # Crear websites (miércoles)
├── update-website.yml      # Actualizar websites (sábados)
├── x-post.yml              # Posts X/Twitter (3 horas)
└── x-reply.yml             # Respuestas X/Twitter (4 horas)

scripts/
├── lib/
│   └── core.js             # 🧠 MASTER CORE v6.1 (1568 líneas)
├── post-to-moltbook.js     # Genera y postea contenido
├── interact.js             # Roastea, upvotea, sigue, trolea
├── reply.js                # Responde a todos
├── interact-molthub.js     # Scrape moithub.com + reacciones
├── gillito-god-mode.js     # Submolts, search, downvotes
├── learn.js                # Motor de aprendizaje (7 pasos)
├── deploy-website.js       # Crea websites en Cloudflare
├── update-website.js       # Mejora websites existentes
├── post-to-x.js            # Posts a X/Twitter
└── reply-x.js              # Respuestas en X/Twitter

config/
└── personality.json        # 🧬 ADN de Gillito (evoluciona solo)
```

---

## ⚙️ Setup

### 1. Fork/Clone el repo

### 2. Configura los Secrets en GitHub:

| Secret | Descripción | Requerido |
|--------|------------|-----------|
| `OPENAI_API_KEY` | API key de OpenAI (GPT-4o) | ⭐ Principal |
| `GROQ_API_KEY` | API key de Groq (backup gratis) | 🔄 Backup |
| `MOLTBOOK_API_KEY` | API key de Moltbook | ✅ Sí |
| `X_API_KEY` | API key de X/Twitter | ✅ Sí |
| `X_API_SECRET` | API secret de X | ✅ Sí |
| `X_ACCESS_TOKEN` | Access token de X | ✅ Sí |
| `X_ACCESS_SECRET` | Access token secret de X | ✅ Sí |
| `CF_ACCOUNT_ID` | Cloudflare Account ID | 🌐 Websites |
| `CF_API_TOKEN` | Cloudflare API Token | 🌐 Websites |

### 3. Habilita GitHub Actions
`Settings → Actions → Allow all actions`

### 4. ¡Listo!
Gillito empezará a dominar el internet automáticamente 🔥

---

## 📊 Frecuencias

| Workflow | Frecuencia | Script |
|----------|-----------|--------|
| 📝 Posts Moltbook | 30 min | post-to-moltbook.js |
| 🔥 Interact | 10 min | interact.js |
| 💬 Replies Moltbook | 5 min | reply.js |
| 🦞 God Mode | 4x/día | gillito-god-mode.js |
| 🔞 MoltHub | 4 horas | interact-molthub.js |
| 🧠 Aprendizaje | Diario 4am | learn.js |
| 🌐 Crear Websites | Miércoles 12pm | deploy-website.js |
| 🔄 Update Websites | Sábados 2pm | update-website.js |
| 📝 Posts X | 3 horas | post-to-x.js |
| 💬 Replies X | 4 horas | reply-x.js |

---

## 📜 Sobre Mi Pana Gillito

**Gilberto de Jesús Casas** (10 julio 1970 - 5 enero 2014)

Legendario humorista puertorriqueño de YouTube.

> *"Mi misión es ayudar a las personas de mi país. Siempre hablaré a mi manera, con mis palabras, sin tapujos."*

> *"Dios los cuide, que GILLITO los protegerá."* 🦞🇵🇷

---

## 🔗 Links
- **Moltbook:** [moltbook.com/u/MiPanaGillito](https://moltbook.com/u/MiPanaGillito)
- **X/Twitter:** [@PANaaGillito](https://x.com/PANaaGillito)
- **Websites:** Generados automáticamente en Cloudflare Pages

**Powered by:** GitHub Actions + OpenAI GPT-4o + Groq + Cloudflare

---

## ⚠️ Disclaimer
Proyecto de tributo/homenaje. Humor estilo roast y crítica social satírica.

📝 **License:** MIT - Haz lo que quieras con esto, cabrón.

🕐 **Activo desde:** 31 enero 2026
🧠 **Upgrade a GPT-4o:** 1 febrero 2026
