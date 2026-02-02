# 🦞 GILLITO HEALTH CHECK — Guía de Integración

## 📦 Archivos Nuevos

```
scripts/health-check.js    ← Diagnóstico COMPLETO de todos los servicios
scripts/preflight.js       ← Chequeo RÁPIDO antes de cada workflow
.github/workflows/health-check.yml  ← Workflow standalone (manual + cada 6h)
```

## 🔧 Cómo Integrar en Workflows Existentes

Añadir este step **ANTES** del script principal en cada workflow:

```yaml
      # ⚡ Preflight — no gastar API si algo está roto
      - name: ⚡ Preflight Check
        run: node scripts/preflight.js <servicios>
        env:
          # solo las keys que necesita verificar
```

### Qué servicios necesita cada workflow:

| Workflow              | Preflight command                    | Keys necesarias                                    |
|-----------------------|--------------------------------------|----------------------------------------------------|
| x-post.yml            | `preflight.js x llm`                | X_API_*, OPENAI_API_KEY, GROQ_API_KEY              |
| x-reply.yml           | `preflight.js x llm`                | X_API_*, OPENAI_API_KEY, GROQ_API_KEY              |
| hourly-post.yml       | `preflight.js moltbook llm`         | MOLTBOOK_API_KEY, OPENAI_API_KEY, GROQ_API_KEY     |
| replies.yml           | `preflight.js moltbook llm`         | MOLTBOOK_API_KEY, OPENAI_API_KEY, GROQ_API_KEY     |
| interact.yml          | `preflight.js moltbook llm`         | MOLTBOOK_API_KEY, OPENAI_API_KEY, GROQ_API_KEY     |
| molthub-interact.yml  | `preflight.js moltbook llm`         | MOLTBOOK_API_KEY, OPENAI_API_KEY, GROQ_API_KEY     |
| god-mode.yml          | `preflight.js moltbook llm`         | MOLTBOOK_API_KEY, OPENAI_API_KEY, GROQ_API_KEY     |
| create-website.yml    | `preflight.js llm`                  | OPENAI_API_KEY, GROQ_API_KEY, CLOUDFLARE_*         |
| update-website.yml    | `preflight.js llm`                  | OPENAI_API_KEY, GROQ_API_KEY, CLOUDFLARE_*         |
| learn.yml             | `preflight.js llm`                  | OPENAI_API_KEY, GROQ_API_KEY                       |

### Qué significa `llm`:

`llm` = chequeo inteligente de LLM:
1. Prueba **OpenAI (GPT-4)** primero ← primario
2. Si OpenAI falla → prueba **Groq (Llama)** ← fallback
3. Si los dos fallan → ❌ aborta workflow

## 🩺 Cómo Usar el Health Check

### Manual (cuando algo falla):
1. Ve a **Actions → 🩺 Gillito Health Check → Run workflow**
2. Lee el log completo
3. El reporte te dice exactamente qué está roto

### Automático:
- Corre cada 6 horas y guarda `.gillito-health.json`
- Los preflight leen este archivo para decisiones rápidas

### Desde terminal local:
```bash
# Diagnóstico completo
node scripts/health-check.js

# Solo un servicio
node scripts/health-check.js --service=x
node scripts/health-check.js --service=openai
node scripts/health-check.js --service=groq
node scripts/health-check.js --service=moltbook
```

## 🛡️ Qué Detecta

### X (Twitter):
- ❌ Credenciales faltantes
- ❌ Auth inválida (401)
- ❌ Rate limit activo (429)
- ❌ Budget diario agotado (17/día)
- ❌ Budget mensual agotado (500/mes)
- ⚠️ Budget al 80%+

### Moltbook:
- ❌ Server DOWN (502/503)
- ❌ Server TIMEOUT
- ❌ Auth inválida (401) — key reseteada
- ⚠️ Endpoints de interacción rotos (bug plataforma)
- ⚠️ Redirect stripping auth

### OpenAI (primario):
- ❌ API key inválida (401)
- ❌ Sin créditos (402)
- ❌ Acceso denegado (403)
- ❌ Rate limited (429)
- ❌ Servicio caído (503)
- ❌ GPT-4o no disponible
- ⚠️ Cerca del límite de requests

### Groq (fallback):
- ❌ API key inválida (401)
- ❌ Rate limited (429) — RPM/RPD agotados
- ❌ Servicio caído (503)
- ❌ Modelo no disponible
- ⚠️ Cerca del límite de requests

### Cloudflare (opcional):
- ❌ Token inválido
- ⚠️ API no responde

## 💡 Cómo Funciona el Ahorro

ANTES (sin preflight):
```
Workflow arranca → OpenAI genera contenido ($$) → X rechaza (429)
= 1 OpenAI call desperdiciada = plata tirada
```

DESPUÉS (con preflight):
```
Preflight detecta X rate limited → Workflow ABORTA → 0 calls = $0
```

El preflight solo usa 1 request liviano por servicio (GET, no POST),
y si tiene cache reciente (< 30 min), ni siquiera hace request.

## 📊 Veredicto del Health Check

El health check genera un veredicto así:

```
   🟢  X (Twitter)     — OK
   🟢  Moltbook        — OK
   🟢  OpenAI (1ero)   — OK
   🟢  Groq (backup)   — OK
   ────────────────────────────────
   🧠 LLM: OpenAI ✅ + Groq ✅ (backup listo)
   Puede postear a X:        ✅ SÍ
   Puede postear a Moltbook: ✅ SÍ
   Puede generar contenido:  ✅ SÍ
```
