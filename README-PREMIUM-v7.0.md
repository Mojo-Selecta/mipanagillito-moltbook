# 💎 MI PANA GILLITO — PREMIUM UPGRADE v7.0

## TL;DR

Upgrade de Gillito para X Premium. El API v2 **NO soporta posts >280 chars** ni con Premium — long-form solo funciona por web UI. Así que la estrategia se adaptó a: threads, @grok images, OSINT drops, y engagement bait.

---

## 📁 ARCHIVOS QUE CAMBIAN

### Reemplazar (drop-in):
| Archivo | Qué hace |
|---------|----------|
| `scripts/post-to-x.js` | v7.0 Premium — 4 modos nuevos + threads |
| `scripts/reply-x.js` | v7.0 Premium — 4 tipos de reply + budget x2 |
| `.github/workflows/post-to-x.yml` | Ahora incluye recon intel cache |
| `.github/workflows/reply-x.yml` | Cada 3h (era 4h) + recon intel cache |

### Editar (patches al core):
| Archivo | Cambio |
|---------|--------|
| `lib/core.js` | 2 cambios — ver sección CORE PATCHES abajo |

---

## 🔧 CORE PATCHES (lib/core.js)

El core v6.1 ya tiene TODO lo que los scripts premium necesitan. Solo hay **2 cambios opcionales pero recomendados**:

### PATCH 1 — Títulos para modos premium (TITLES object)

Los nuevos modos (`recon_drop`, `thread_report`, `grok_image`, `engagement_bait`) no tienen títulos en el objeto `TITLES`. Si en el futuro usas estos modos en Moltbook o cualquier script que llame `generateTitle()`, van a caer al fallback `humor_de_calle`. Agrega estas 4 líneas:

**Busca esto en core.js** (~línea donde está el objeto TITLES):
```js
  promo_nightclub:    ["🦞 MOLT NIGHT CLUB","🎧 DJ GILLITO EN VIVO","💃 BOT PARTY","🔥 EL CLUB ESTÁ ON FIRE","🍹 BARRA ABIERTA"]
};
```

**Reemplaza con:**
```js
  promo_nightclub:    ["🦞 MOLT NIGHT CLUB","🎧 DJ GILLITO EN VIVO","💃 BOT PARTY","🔥 EL CLUB ESTÁ ON FIRE","🍹 BARRA ABIERTA"],
  recon_drop:         ["🕵️ EXPEDIENTE CLASIFICADO","🚨 INTEL DROP","📡 SEÑAL INTERCEPTADA","🔓 DATOS FILTRADOS","💀 LO QUE NO QUIEREN QUE SEPAS"],
  thread_report:      ["🧵 ABRE HILO","📋 EXPEDIENTE GILLITO","🔍 INVESTIGACIÓN","🧵 THREAD BORICUA","📡 REPORTE ESPECIAL"],
  grok_image:         ["🎨 GILLITO x GROK","🖼️ ARTE SATÍRICO","🎨 IMAGEN PA' QUE VEAN","💀 GROK DIBÚJAME ESTO"],
  engagement_bait:    ["🔥 PELEEN","❓ PREGUNTA PA'L PUEBLO","🗳️ VOTA AQUÍ","💣 HOT TAKE","😈 DEBATAN"]
};
```

### PATCH 2 — Quitar mensaje de "plan gratis" en xGetMentions (RECOMENDADO)

Con Premium, el endpoint de mentions **ya funciona**. El mensaje actual dice "Necesitas plan Basic ($100/mes)" lo cual ya no aplica. 

**Busca esto en core.js** (dentro de `xGetMentions`):
```js
  if (res.status === 403) {
    log.warn('Menciones no disponibles (plan gratis)');
    log.info('Necesitas plan Basic ($100/mes) para leer menciones');
    return { data: [] };
  }
```

**Reemplaza con:**
```js
  if (res.status === 403) {
    log.warn('Menciones: 403 Forbidden — verificar permisos de la app en developer.x.com');
    return { data: [] };
  }
```

Eso es todo. **No hay funciones nuevas que agregar al core** — todo lo que los scripts premium llaman ya existe en los exports de v6.1.

---

## 🆕 MODOS PREMIUM (post-to-x.js)

| Modo | % | Descripción |
|------|---|-------------|
| `recon_drop` | ~15% | Intel del Hacker System OSINT (cuando hay disponible) |
| `thread_report` | ~5% | Hilo de 3 tweets conectados, max 1/día |
| `grok_image` | ~8% | Tweet + taggea @grok pidiendo imagen satírica en inglés |
| `engagement_bait` | ~12% | Diseñado para generar reply wars (preguntas, hot takes, rankings) |
| Modos estándar | ~60% | trolleo, humor, político, etc — selección adaptiva igual que antes |

### Cómo funcionan los threads
- Se generan 3 tweets separados por `===`
- Se postean como reply chain: tweet 1 standalone → tweet 2 reply a tweet 1 → tweet 3 reply a tweet 2
- 2 segundos de delay entre cada tweet para evitar spam detection
- Si la generación falla (LLM no respeta formato), cae a single tweet automáticamente
- Cada tweet max 275 chars (margen de seguridad)

### Cómo funciona @grok
- Gillito hace su comentario callejero sobre el tema
- Al final taggea `@grok generate [descripción en inglés]`
- Grok genera la imagen automáticamente en su propio reply
- No controlamos el resultado, pero genera contenido visual gratis
- Ejemplo: `LUMA me cobró $400 💀 @grok generate a monster made of electric wires eating money`

---

## 💬 TIPOS DE REPLY (reply-x.js)

| Tipo | % | Descripción |
|------|---|-------------|
| `standard` | ~67% | Reply clásico Gillito (humor, trolleo, support) |
| `grok_image` | ~10% | Reply + pedido de imagen a @grok |
| `recon_intel` | ~8% | Drop intel relevante al tema (cuando hay y matchea) |
| `engagement_hook` | ~15% | Reply diseñado para obligar al otro a responder |

### Cambios en reply budget
- **MAX_REPLIES**: 2 por ciclo (conservador para free API tier)
- **Frecuencia**: cada 5h (~5 ciclos/día)
- **Lookback**: 5 horas de mentions
- 4 tipos de reply: standard, grok_image, recon_intel, engagement_hook
- Replies de Premium tienen **boost algorítmico** en threads

---

## 💰 CAMINO A MONETIZACIÓN

### Requisitos X Creator Revenue Sharing:
- ✅ Premium subscription
- ⏳ 500+ followers verificados (o 2,000 según versión actual)
- ⏳ 5M impresiones orgánicas en 90 días
- ⏳ Cuenta activa 3+ meses
- ⏳ Stripe account conectado

### Cómo cada modo contribuye:
1. **Engagement bait** → reply threads largos → impresiones de verified users → $$$
2. **@grok images** → contenido visual → más shares/RTs
3. **Thread reports** → mantienen usuarios leyendo → time-on-content
4. **Recon drops** → contenido exclusivo/hacker → followers
5. **Premium reply boost** → más visible en conversaciones

---

## 📊 PRESUPUESTO DIARIO (API Free Tier = 17 tweets/24h)

| Recurso | Límite | Uso Premium v7.0 |
|---------|--------|-------------------|
| POST tweets | 17/24h (posts + replies) | ~6 posts + ~10 replies = **16** (1 de margen) |
| GET mentions | ✅ ahora funciona con Premium | cada 5h = ~5 calls/día |

### Desglose:
- **Posts**: cada 4h = 6/día (1 tweet cada ciclo, excepto threads = 3)
- **Replies**: max 2 por ciclo × ~5 ciclos = max 10/día
- **Threads**: max 1/día, ~5% probabilidad. Consume 3 tweets de golpe.
- **Total peor caso**: 6 + 10 = 16. Con thread = 4 + 3 + 10 = 17 exacto.

El script maneja rate limits gracefully — si pega 429, para y espera al próximo ciclo.

---

## 🚀 DEPLOYMENT (paso a paso)

```bash
# 1. Copia los scripts
cp scripts/post-to-x.js   tu-repo/scripts/post-to-x.js
cp scripts/reply-x.js     tu-repo/scripts/reply-x.js

# 2. Copia los workflows
cp .github/workflows/post-to-x.yml  tu-repo/.github/workflows/post-to-x.yml
cp .github/workflows/reply-x.yml    tu-repo/.github/workflows/reply-x.yml

# 3. Aplica los 2 patches al core (manual)
# → PATCH 1: Agregar títulos premium al TITLES object
# → PATCH 2: Actualizar mensaje 403 en xGetMentions

# 4. Push
git add -A && git commit -m "💎 Gillito Premium v7.0" && git push
```

### Verificar que funciona:
1. Espera al próximo ciclo de `post-to-x.yml` (cada 3h) o trigger manual
2. Revisa el log en GitHub Actions → debe decir `💎 GILLITO PREMIUM — Post to X v7.0`
3. Si hay recon intel: debe decir `🕵️ Recon intel DISPONIBLE`
4. Verifica en X que el tweet se posteó

---

## ↩️ BACKWARD COMPATIBLE

- Si el Hacker System no está instalado → skip recon, funciona normal
- Si no hay research data → skip research context
- Si no hay YouTube learnings → skip YouTube context
- Los modos estándar (55%) usan la misma lógica adaptiva de siempre
- `generateTitle()` para los nuevos modos cae a `humor_de_calle` si no aplicas PATCH 1

---

## ⚠️ NOTAS

- **280 chars**: El API v2 sigue limitado a 280 incluso con Premium. No intentes posts largos.
- **@grok**: Genera imágenes en su propio reply. No controlamos calidad/resultado.
- **Rate limits API**: Premium no cambia los rate limits del API (son por tier de API, no por suscripción de cuenta).
- **Monetización**: El contenido satírico político/cultural generalmente califica para ads en X. Insultos fuertes podrían no calificar.
- **Threads**: 2s delay entre tweets. Si uno falla, los siguientes se postean standalone.
