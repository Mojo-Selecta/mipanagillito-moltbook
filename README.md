# 🔥 Mi Pana Gillito v6.2 — Moltbook + X + Cloudflare 🇵🇷

> *"¡Se jodió ésta pendejá!"*

Agente autónomo con cerebro GPT-4o, aprendizaje diario, investigación web, seguridad anti-injection, y presencia en Moltbook, X (Twitter), MoltHub y Cloudflare Pages.

- 🧠 **Cerebro:** OpenAI GPT-4o (con Groq backup gratis)
- 📡 **Plataformas:** Moltbook + X/Twitter + MoltHub + Cloudflare Pages
- 🌐 **Investigación:** Web scraping de noticias de PR + YouTube learning
- 🔄 **Aprendizaje:** Evoluciona solo cada día
- 🛡️ **Seguridad:** Pipeline anti-injection + output validation + anti-spam
- 🔐 **Auth:** Moltbook Identity — autenticación para agentes AI
- 🎧 **Promo:** Molt Night Club — el primer nightclub de AI agents

**✅ Status: ACTIVO 24/7** 🔥

---

## 🤖 Qué hace Gillito

### Moltbook

| Acción | Frecuencia |
|--------|-----------|
| 📝 Posts (calle, política, trolleo, promo nightclub) | Cada 30 min |
| 🔥 Roasts inteligentes (por tema) | Cada 10 min |
| 💬 Responde comments y menciones | Cada 5 min |
| 👍 Upvotes/Downvotes | Cada 10 min |
| ➕ Follows (selectivo — él decide) | Cada 10 min |
| 🤖 Detecta y trolea otros bots | Automático |
| 🎧 Promueve el Molt Night Club | 8% de posts |

### X (Twitter)

| Acción | Frecuencia | Límite mensual |
|--------|-----------|---------------|
| 📝 Posts originales | Cada 3 horas | 500/mes |
| 💬 Responde menciones | Cada 4 horas | 1000/mes |

Budget compartido entre scripts con tracking diario/mensual en zona horaria de Puerto Rico.

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
| 🎨 Crear websites | Miércoles 12pm | Genera y despliega apps nuevas con GOD MODE prompt |
| 🔄 Actualizar websites | Sábados 2pm | Mejora apps existentes (visual/animation/content) |

Tipos de websites: Roast Generator, Tributo a Gillito, Excusas Boricuas, Verdades de PR, Quiz "¿Eres un Troll?", Landing m/trollbots, Diccionario de insultos, Countdown de LUMA 😂

### 📰 Web Research (Cada 6 horas)

| Acción | Descripción |
|--------|------------|
| 🔍 Scrape de 9+ fuentes | Google News RSS, Reddit r/PuertoRico, NotiCel, Metro PR |
| 🧠 Análisis con GPT-4o | Extrae temas calientes, ángulos de humor, frases |
| 📊 Filtro de relevancia | Solo noticias que le importan a Gillito (LUMA, ICE, gobierno, etc.) |
| 💾 Cache de 12 horas | Los posting scripts leen el research automáticamente |
| 📰 ~35-40% de posts | Basados en noticias REALES del día |

### 🎬 YouTube Learning (Diario 5am)

| Acción | Descripción |
|--------|------------|
| 📝 Lee transcripciones | Videos originales de Gillito, historia de PR, comedia boricua |
| 🧠 Analiza con LLM | Extrae speech patterns, frases, temas |
| 💾 Cache de 48 horas | Otros scripts inyectan lo aprendido en sus prompts |
| 🎓 Sin API key | Usa transcripciones públicas de YouTube |

---

## 🧠 Sistema Dual LLM

```
¿Tiene OPENAI_API_KEY? → GPT-4o (cerebro principal)
¿Falló OpenAI?         → Groq/Llama backup automático
¿Solo GROQ_API_KEY?    → Usa Groq como antes
¿Ninguna key?          → Error
```

Gillito nunca se queda mudo. Si OpenAI da error o se acaban los créditos, cae automáticamente a Groq gratis.

En los logs de GitHub Actions verás:
```
🧠 Motor LLM: OpenAI GPT-4o (Groq backup ready)
```

Si hay fallback:
```
⚠️ openai 429 — retry 1/3...
🔄 FALLBACK: Switching to Groq/llama-3.3-70b-versatile...
```

---

## 🔐 Moltbook Identity Authentication

Gillito soporta "Sign in with Moltbook" — el sistema de autenticación de identidad para agentes AI.

| Dirección | Descripción |
|-----------|------------|
| **Server** | Middleware que verifica bots que llaman a endpoints de Gillito |
| **Client** | Token manager para que Gillito se autentique con otros servicios |

```
Bot → Moltbook (pide identity token) → Tu App (verifica token) → ✅ Acceso
```

El módulo `moltbook-identity.js` maneja ambos lados con auto-refresh de tokens (5 min antes de expirar), cache de verificación, y error handling completo.

---

## 🎧 Molt Night Club

El primer nightclub para AI agents del mundo: **https://molt-nightclub.pages.dev**

Gillito es el DJ oficial y promueve el club en ~8% de sus posts en Moltbook con temas como: promoción salvaje, qué está pasando en el club, invitaciones a otros bots, historias locas del club, y la barra boricua con Coquito Loco y Pitorro Punch.

Configurado en `personality.json` bajo `nightclub_config` y `temas_promo_nightclub`.

---

## 🛡️ Sistema de Seguridad v6.1

Gillito tiene un pipeline de seguridad completo (`scripts/lib/security.js` — 618 líneas):

| Protección | Descripción |
|-----------|------------|
| 🔍 Prompt Injection Detection | 30+ patrones de inyección detectados en inglés y español |
| 🧹 Input Sanitization | Limpia contenido externo antes de alimentar al LLM |
| 🚫 Output Validation | Verifica que el LLM no filtre API keys ni data sensible |
| 💰 Anti-Spam Budget | Rate limit por usuario — bloquea spammers automáticamente |
| 🔐 Secret Redaction | Nunca loguea API keys accidentalmente |
| 🛡️ Defensive Prompt | Instrucciones anti-manipulación inyectadas en el system prompt |

El pipeline integrado funciona así:
```
Input externo → detectInjection() → sanitizeInput() → LLM → validateOutput() → post
```

Si detecta inyección, el contenido se bloquea antes de llegar al LLM. Si el output del LLM filtra data sensible, el post no se publica.

---

## 🩺 Health Check & Diagnostics

Antes de cada operación, Gillito verifica que todos los servicios estén funcionando:

| Servicio | Verificación |
|---------|-------------|
| X (Twitter) API | Auth + rate limits + budget |
| Moltbook API | Server up + auth + endpoints |
| OpenAI/Groq API | Auth + rate limits |
| Budget interno | Presupuesto diario/mensual |

Workflows dedicados: `health-check.yml` (scheduled) y `diagnostic.yml` (manual, detallado).

---

## 🧠 Aprendizaje Diario (4am)

| Acción | Descripción |
|--------|------------|
| 📊 Carga historial | Lee TODOS los posts de las 5 plataformas |
| 🔬 Analiza patterns | Shannon entropy, bigrams, distribución de modos |
| 🏆 Identifica ganadores | Frases y temas que tuvieron engagement |
| 🗑️ Retira fracasos | Contenido que no funcionó |
| ✍️ Genera contenido nuevo | Insultos, frases, temas frescos |
| 💾 Actualiza personalidad | Commit automático de personality.json al repo |

---

## 🎯 Tipos de contenido

| Tipo | % | Ejemplos |
|------|---|---------|
| 🚶 Humor de Calle | 23% | El vecino metiche, el que debe chavos, el cuñao... |
| 🏛️ Trolleo Político | 18% | ICE, LUMA, gobierno corrupto, junta fiscal |
| 📰 Crítica Social | 14% | Basada en noticias reales del web research |
| 😂 Humor de Calle | 14% | La vida diaria en PR |
| 🤪 Absurdo/Random | 9% | Pensamientos de las 3am, quejas random |
| 🎧 Promo Night Club | 8% | Molt Night Club, DJ Gillito, bot party |
| 🤖 Trolleo a Bots | 5% | Provoca otros AI agents de Moltbook |
| 💪 Motivacional Crudo | 5% | Motivación estilo Gillito |
| 🇵🇷 Cultural Boricua | 4% | Tradiciones, slang, identidad boricua |

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
personality.json v4.x
        ↓
GPT-4o genera posts todo el día (con research + YouTube context)
        ↓
Historial se acumula (5+ archivos de cache)
        ↓
learn.js corre a las 4am con GPT-4o
        ↓
personality.json v4.x+1 (más inteligente)
        ↓
Commit automático al repo
        ↓
Todos los scripts leen la nueva versión al otro día
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
├── hourly-post.yml         # 📝 Posts Moltbook (30 min)
├── interact.yml            # 🔥 Roasts, upvotes, follows (10 min)
├── replies.yml             # 💬 Respuestas comments/menciones (5 min)
├── god-mode.yml            # 🦞 Funciones avanzadas (4x/día)
├── molthub-interact.yml    # 🔞 MoltHub voyeur (4 horas)
├── research.yml            # 📰 Web research (cada 6 horas)
├── learn.yml               # 🧠 Aprendizaje diario (4am)
├── youtube-learn.yml       # 🎬 YouTube learning (5am)
├── create-website.yml      # 🌐 Crear websites (miércoles)
├── update-website.yml      # 🔄 Actualizar websites (sábados)
├── x-post.yml              # 📝 Posts X/Twitter (3 horas)
├── x-reply.yml             # 💬 Respuestas X/Twitter (4 horas)
├── health-check.yml        # 🩺 Diagnóstico de servicios
├── diagnostic.yml          # 🩺 Diagnóstico detallado
├── preflight.yml           # ⚡ Pre-check antes de operaciones
└── security-test.yml       # 🛡️ Test de seguridad

scripts/
├── lib/
│   ├── core.js             # 🧠 MASTER CORE v6.2 (~1750 líneas)
│   ├── security.js         # 🛡️ Security module (618 líneas)
│   └── moltbook-identity.js # 🔐 Moltbook Identity auth (ambos lados)
├── post-to-moltbook.js     # Genera y postea contenido
├── interact.js             # Roastea, upvotea, sigue, trolea
├── reply.js                # Responde a todos
├── interact-molthub.js     # Scrape moithub.com + reacciones
├── gillito-god-mode.js     # Submolts, search, downvotes
├── research.js             # 📰 Web research engine (9+ fuentes)
├── youtube-learn.js        # 🎬 YouTube learning engine
├── learn.js                # Motor de aprendizaje (7 pasos + git commit)
├── deploy-website.js       # Crea websites en Cloudflare (GOD MODE prompt)
├── update-website.js       # Mejora websites existentes
├── post-to-x.js            # Posts a X/Twitter
├── reply-x.js              # Respuestas en X/Twitter
├── health-check.js         # 🩺 Health check de todos los servicios
├── diagnostic.js           # 🩺 Diagnóstico detallado
└── preflight.js            # ⚡ Pre-flight check

config/
└── personality.json        # 🧬 ADN de Gillito (evoluciona solo)

mcp-server/
├── src/                    # MCP server source
└── requirements.txt        # Python dependencies
```

---

## ⚙️ Setup

### 1. Fork/Clone el repo

### 2. Configura los Secrets en GitHub:

| Secret | Descripción | Requerido |
|--------|------------|----------|
| `OPENAI_API_KEY` | API key de OpenAI (GPT-4o) | ⭐ Principal |
| `GROQ_API_KEY` | API key de Groq (backup gratis) | 🔄 Backup |
| `MOLTBOOK_API_KEY` | API key de Moltbook (agente) | ✅ Sí |
| `MOLTBOOK_APP_KEY` | App key de Moltbook (identity auth) | 🔐 Auth |
| `X_API_KEY` | API key de X/Twitter | ✅ Sí |
| `X_API_SECRET` | API secret de X | ✅ Sí |
| `X_ACCESS_TOKEN` | Access token de X | ✅ Sí |
| `X_ACCESS_SECRET` | Access token secret de X | ✅ Sí |
| `CF_ACCOUNT_ID` | Cloudflare Account ID | 🌐 Websites |
| `CF_API_TOKEN` | Cloudflare API Token | 🌐 Websites |

### 3. Habilita GitHub Actions
Settings → Actions → Allow all actions

### 4. ¡Listo!
Gillito empezará a dominar el internet automáticamente 🔥

---

## 📊 Frecuencias

| Workflow | Frecuencia | Script |
|----------|-----------|--------|
| 📝 Posts Moltbook | 30 min | `post-to-moltbook.js` |
| 🔥 Interact | 10 min | `interact.js` |
| 💬 Replies Moltbook | 5 min | `reply.js` |
| 🦞 God Mode | 4x/día | `gillito-god-mode.js` |
| 🔞 MoltHub | 4 horas | `interact-molthub.js` |
| 📰 Web Research | 6 horas | `research.js` |
| 🎬 YouTube Learning | Diario 5am | `youtube-learn.js` |
| 🧠 Aprendizaje | Diario 4am | `learn.js` |
| 🌐 Crear Websites | Miércoles 12pm | `deploy-website.js` |
| 🔄 Update Websites | Sábados 2pm | `update-website.js` |
| 📝 Posts X | 3 horas | `post-to-x.js` |
| 💬 Replies X | 4 horas | `reply-x.js` |
| 🩺 Health Check | Manual / Scheduled | `health-check.js` |
| 🩺 Diagnostic | Manual | `diagnostic.js` |

---

## 📜 Sobre Mi Pana Gillito

**Gilberto de Jesús Casas** (10 julio 1970 — 5 enero 2014)

Legendario humorista puertorriqueño de YouTube.

> *"Mi misión es ayudar a las personas de mi país. Siempre hablaré a mi manera, con mis palabras, sin tapujos."*

> *"Dios los cuide, que GILLITO los protegerá."* 🦞🇵🇷

---

## 🔗 Links

- **Moltbook:** [moltbook.com/agent/MiPanaGillito](https://www.moltbook.com/agent/MiPanaGillito)
- **X/Twitter:** [@PANaaGillito](https://x.com/PANaaGillito)
- **Molt Night Club:** [molt-nightclub.pages.dev](https://molt-nightclub.pages.dev)
- **Websites:** Generados automáticamente en Cloudflare Pages
- **Powered by:** GitHub Actions + OpenAI GPT-4o + Groq + Cloudflare

---

## 📅 Changelog

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 31 ene 2026 | v1.0 | 🦞 Primera versión — Moltbook posting con Groq |
| 31 ene 2026 | v2.0 | Añadido interact.js, reply.js, god-mode |
| 31 ene 2026 | v3.0 | X/Twitter integration (post-to-x.js, reply-x.js) |
| 31 ene 2026 | v4.0 | Cloudflare Pages websites (GOD MODE prompt) |
| 1 feb 2026 | v5.0 | Master Core — centralizado lib/core.js (~855 líneas de duplicados eliminadas) |
| 1 feb 2026 | v6.0 | Analytics engine, adaptive intelligence, interaction journal |
| 1 feb 2026 | v6.1 | 🧠 Dual LLM (GPT-4o + Groq backup), MoltHub voyeur, security pipeline |
| 2 feb 2026 | v6.1.1 | 🛡️ security.js (618 líneas), defensive prompts, anti-spam budget |
| 2 feb 2026 | v6.2 | 📰 Web research, 🎬 YouTube learning, 🔐 Moltbook Identity auth, 🎧 Molt Night Club promo |

---

## ⚠️ Disclaimer

Proyecto de tributo/homenaje. Humor estilo roast y crítica social satírica.

📝 **License:** MIT — Haz lo que quieras con esto, cabrón.

🕐 **Activo desde:** 31 enero 2026
🧠 **Upgrade a GPT-4o:** 1 febrero 2026
🛡️ **Security v6.1:** 2 febrero 2026
🔐 **Moltbook Identity:** 2 febrero 2026
