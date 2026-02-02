"""
Mi Pana Gillito - MCP Server para Poke
=======================================
Servidor MCP que expone herramientas del bot de Gillito.
Usa FastMCP con transporte Streamable HTTP para compatibilidad con Poke.

Gilberto de Jesús Casas (1970-2014) - Comediante puertorriqueño
"""

import json
import random
from datetime import datetime, timezone

from fastmcp import FastMCP

# ============================================================
# Inicializar servidor MCP
# ============================================================
mcp = FastMCP(
    "Mi Pana Gillito",
    instructions=(
        "Este servidor provee herramientas relacionadas con el bot tributo al "
        "comediante puertorriqueño Gilberto de Jesús Casas (1970-2014). "
        "Incluye generación de contenido al estilo de Gillito, diccionario de "
        "jerga puertorriqueña, frases célebres, y datos sobre Puerto Rico."
    ),
)

# ============================================================
# Base de datos de frases y jerga
# ============================================================

FRASES_GILLITO = [
    "¡Weeeepaaaa! Esto es Gillito en la casa, papá.",
    "¡Diablo, mano! La cosa está más mala que arroz con rabo.",
    "¡Ay bendito! Eso no se hace, mi pana.",
    "¿Y tú crees que yo soy bembé de chivo? ¡Aquí se sabe to'!",
    "La LUMA apagó la luz otra vez... ¡vayan pal carajo!",
    "Ese político roba más que un gato de campo.",
    "¡Esto está más caliente que mofongo recién hecho!",
    "Puerto Rico no se vende, ¡se defiende!",
    "¡Fua! Eso duele más que un marronazo de mamá.",
    "El que no tiene de congo, tiene de carabalí... ¡y el que no, miente!",
    "¡Mira pa'llá! Más perdío que Juanita en Noche Buena.",
    "¡A mí no me vengan con cuentos! Aquí se habla claro.",
    "Eso está más duro que el pan de ayer.",
    "¡Qué clase de cantazo! Más grande que el ego de un político.",
    "Si la vida te da limones, pues haz una limonada con piquete.",
]

JERGA_PR = {
    "wepa": {
        "significado": "Expresión de alegría, emoción o celebración",
        "ejemplo": "¡Weeepa! ¡Ganamos el juego!",
        "nivel": "básico",
    },
    "bregar": {
        "significado": "Lidiar con algo, trabajar, manejar una situación",
        "ejemplo": "Hay que bregar con lo que hay, mano.",
        "nivel": "básico",
    },
    "chavos": {
        "significado": "Dinero",
        "ejemplo": "No tengo chavos ni pa'l café.",
        "nivel": "básico",
    },
    "corillo": {
        "significado": "Grupo de amigos, pandilla (sin connotación negativa)",
        "ejemplo": "Voy a janguear con el corillo.",
        "nivel": "básico",
    },
    "janguear": {
        "significado": "Pasar el rato, salir con amigos (del inglés 'hang out')",
        "ejemplo": "¿Vamos a janguear en la placita?",
        "nivel": "básico",
    },
    "mano": {
        "significado": "Hermano, amigo cercano (abreviación de 'hermano')",
        "ejemplo": "¿Qué es la que hay, mano?",
        "nivel": "básico",
    },
    "pana": {
        "significado": "Amigo, compañero, aliado",
        "ejemplo": "Ese es mi pana del alma.",
        "nivel": "básico",
    },
    "ay bendito": {
        "significado": "Expresión de compasión, sorpresa o resignación",
        "ejemplo": "Ay bendito, ¿y ahora qué hacemos?",
        "nivel": "básico",
    },
    "bochinche": {
        "significado": "Chisme, escándalo, rumor",
        "ejemplo": "¿Tú supiste del bochinche del vecino?",
        "nivel": "intermedio",
    },
    "revolú": {
        "significado": "Desorden, lío, caos",
        "ejemplo": "Esa fiesta fue un revolú.",
        "nivel": "intermedio",
    },
    "gufear": {
        "significado": "Bromear, hacer chistes (del inglés 'goof')",
        "ejemplo": "Deja de gufear, que esto es serio.",
        "nivel": "intermedio",
    },
    "tripear": {
        "significado": "Disfrutar, pasarla bien, también bromear",
        "ejemplo": "Estamos tripeando en la playa.",
        "nivel": "intermedio",
    },
    "tecato": {
        "significado": "Persona adicta a drogas",
        "ejemplo": "Ese barrio tiene muchos tecatos.",
        "nivel": "avanzado",
    },
    "cangri": {
        "significado": "El más importante, el jefe, término de respeto",
        "ejemplo": "Ese es el cangri del barrio.",
        "nivel": "avanzado",
    },
    "perreo": {
        "significado": "Baile sensual asociado al reggaetón",
        "ejemplo": "¡Dale al perreo intenso!",
        "nivel": "intermedio",
    },
    "piquete": {
        "significado": "Estilo, sabor, algo especial que tiene una persona o cosa",
        "ejemplo": "Esa salsa tiene piquete.",
        "nivel": "intermedio",
    },
    "zafacón": {
        "significado": "Basurero, cesto de basura",
        "ejemplo": "Tira eso al zafacón.",
        "nivel": "básico",
    },
    "chiringa": {
        "significado": "Cometa (juguete que vuela)",
        "ejemplo": "Vamos a volar chiringa en la loma.",
        "nivel": "básico",
    },
    "mahones": {
        "significado": "Pantalones jeans / vaqueros",
        "ejemplo": "Ponte los mahones nuevos.",
        "nivel": "básico",
    },
    "china": {
        "significado": "Naranja (la fruta)",
        "ejemplo": "Dame un jugo de china.",
        "nivel": "básico",
    },
    "ñapa": {
        "significado": "Algo extra, propina, bonus",
        "ejemplo": "El colmadero me dio una ñapa de plátanos.",
        "nivel": "intermedio",
    },
    "fiao": {
        "significado": "Crédito, comprar sin pagar al momento",
        "ejemplo": "Ponme eso fiao, te pago el viernes.",
        "nivel": "intermedio",
    },
    "cafre": {
        "significado": "Persona maleducada, de comportamiento inapropiado",
        "ejemplo": "No seas cafre, compórtate.",
        "nivel": "avanzado",
    },
    "gandúl": {
        "significado": "Vago, perezoso (también el grano de arroz con gandules)",
        "ejemplo": "Ese nene es un gandúl, no hace na'.",
        "nivel": "intermedio",
    },
}

DATOS_PR = [
    "Puerto Rico tiene 78 municipios y cada uno tiene su propia personalidad.",
    "El coquí es una rana endémica de Puerto Rico y su canto se escucha por toda la isla.",
    "El Viejo San Juan fue fundado en 1521, es una de las ciudades más antiguas del Nuevo Mundo.",
    "El Yunque es el único bosque lluvioso tropical en el sistema de bosques nacionales de EE.UU.",
    "Puerto Rico tiene más de 270 millas de costa con playas impresionantes.",
    "La Isla del Encanto produce el mejor café del mundo en las montañas del centro.",
    "El mofongo es el plato nacional no oficial de Puerto Rico.",
    "Roberto Clemente fue el primer latino en el Salón de la Fama del béisbol.",
    "La Bahía Bioluminiscente de Vieques es una de las más brillantes del mundo.",
    "Puerto Rico ha sido territorio de EE.UU. desde 1898 pero sus residentes no pueden votar para presidente.",
    "El reggaetón nació en Puerto Rico en los años 90.",
    "La salsa puertorriqueña tiene raíces en la bomba y la plena africana.",
    "Puerto Rico sufre de apagones constantes desde el huracán María en 2017.",
    "LUMA Energy controla la distribución de electricidad y es una de las empresas más odiadas de la isla.",
    "La diáspora puertorriqueña en EE.UU. es mayor que la población de la isla.",
]

TEMAS_COMEDIA = [
    "política corrupta",
    "los apagones de LUMA",
    "la vida en el caserío",
    "los políticos que roban",
    "la abuela regañona",
    "el colmado del barrio",
    "los tapones en la PR-52",
    "la Navidad boricua",
    "el vecino chismoso",
    "la suegra metiche",
    "las promesas del gobierno",
    "el calor de Puerto Rico",
    "la fila del Seguro Social",
    "los primos americanos",
    "el reggaetón vs la salsa",
]


# ============================================================
# TOOLS - Herramientas que Poke puede usar
# ============================================================


@mcp.tool
def frase_de_gillito() -> str:
    """
    Devuelve una frase aleatoria al estilo del comediante Gillito.
    Úsala cuando necesites humor puertorriqueño o una cita graciosa.
    """
    frase = random.choice(FRASES_GILLITO)
    return f'🎤 Gillito dice: "{frase}"'


@mcp.tool
def buscar_jerga(palabra: str) -> str:
    """
    Busca el significado de una palabra o expresión en jerga puertorriqueña.
    Incluye significado, ejemplo de uso y nivel de dificultad.

    Args:
        palabra: La palabra o expresión puertorriqueña a buscar
    """
    palabra_lower = palabra.lower().strip()

    if palabra_lower in JERGA_PR:
        entry = JERGA_PR[palabra_lower]
        return (
            f"🇵🇷 **{palabra_lower}**\n"
            f"📖 Significado: {entry['significado']}\n"
            f"💬 Ejemplo: \"{entry['ejemplo']}\"\n"
            f"📊 Nivel: {entry['nivel']}"
        )

    # Buscar coincidencias parciales
    matches = [
        k for k in JERGA_PR if palabra_lower in k or k in palabra_lower
    ]
    if matches:
        results = []
        for m in matches[:3]:
            e = JERGA_PR[m]
            results.append(f"• **{m}**: {e['significado']}")
        return (
            f"No encontré '{palabra}' exacto, pero mira estas:\n"
            + "\n".join(results)
        )

    return (
        f"¡Ay bendito! No tengo '{palabra}' en mi diccionario. "
        f"Puede que sea tan callejera que ni Gillito la conoce. 😅"
    )


@mcp.tool
def diccionario_completo(nivel: str = "todos") -> str:
    """
    Muestra el diccionario completo de jerga puertorriqueña.
    Puedes filtrar por nivel: básico, intermedio, avanzado, o todos.

    Args:
        nivel: Filtrar por nivel de dificultad (básico, intermedio, avanzado, todos)
    """
    nivel_lower = nivel.lower().strip()

    if nivel_lower == "todos":
        filtered = JERGA_PR
    else:
        filtered = {
            k: v for k, v in JERGA_PR.items() if v["nivel"] == nivel_lower
        }

    if not filtered:
        return f"No hay palabras de nivel '{nivel}'. Usa: básico, intermedio, avanzado, o todos."

    lines = [f"🇵🇷 Diccionario Boricua - Nivel: {nivel}\n"]
    for word, info in sorted(filtered.items()):
        lines.append(f"• **{word}** — {info['significado']}")

    lines.append(f"\nTotal: {len(filtered)} palabras")
    return "\n".join(lines)


@mcp.tool
def dato_de_puerto_rico() -> str:
    """
    Devuelve un dato curioso o interesante sobre Puerto Rico.
    Perfecto para aprender sobre la isla y su cultura.
    """
    dato = random.choice(DATOS_PR)
    return f"🏝️ ¿Sabías que...? {dato}"


@mcp.tool
def tema_de_comedia() -> str:
    """
    Genera un tema aleatorio para un sketch de comedia al estilo de Gillito.
    Devuelve el tema y un setup para un chiste.
    """
    tema = random.choice(TEMAS_COMEDIA)
    setups = [
        f"Imagínate que Gillito se pone a hablar de {tema}... 🎤",
        f"Gillito en el escenario, hablando de {tema}: '¡Diablo, mano!'",
        f"Setup perfecto: Gillito llega a un show y el tema es {tema}.",
        f"Un monólogo de Gillito sobre {tema} sería legendario.",
    ]
    return f"🎭 Tema: {tema}\n💡 {random.choice(setups)}"


@mcp.tool
def generar_opinion_gillito(tema: str) -> str:
    """
    Genera una opinión al estilo de Gillito sobre cualquier tema.
    Combina humor callejero puertorriqueño con crítica social.

    Args:
        tema: El tema sobre el cual Gillito dará su opinión
    """
    intros = [
        f"¡Weeepa! ¿Me preguntan de {tema}? Mira, déjame decirte...",
        f"¡Diablo, mano! ¿{tema}? Eso ta' más complicao que...",
        f"¡Ay bendito! {tema} es como ir al gobierno, nadie entiende na'...",
        f"¡Fua! ¿{tema}? Mira, yo que soy de la calle te digo...",
        f"¡A mí no me vengan con cuentos! {tema} es...",
    ]

    remates = [
        "¡Pero qué se yo! Yo soy comediante, no político. 😂",
        "¡Wepaaaa! Así es la vida en Borinquen, papá. 🇵🇷",
        "Al final del día, somos boricuas y nos reímos de to'. 💪",
        "¡Pa'l carajo con eso! Mejor vamos a comer mofongo. 🍌",
        "¡Eso sí que tiene piquete! Gillito no miente. 🎤",
        "Y si no te gusta... ¡pues búscate tu propio show! 😎",
    ]

    return f"🎤 {random.choice(intros)}\n\n[...opinión de Gillito aquí...]\n\n{random.choice(remates)}"


@mcp.tool
def traducir_a_boricua(texto: str) -> str:
    """
    Toma un texto en español formal y sugiere cómo sonaría en español
    puertorriqueño callejero / coloquial.

    Args:
        texto: El texto en español formal para 'traducir' al estilo boricua
    """
    sustituciones = {
        "dinero": "chavos",
        "amigo": "pana",
        "hermano": "mano",
        "fiesta": "jangueo",
        "chisme": "bochinche",
        "desorden": "revolú",
        "basura": "zafacón",
        "pantalones": "mahones",
        "naranja": "china",
        "diversión": "tripeo",
        "problema": "quilombo",
        "genial": "brutal",
        "bueno": "cabrón (en buen sentido)",
        "increíble": "¡diablo, mano!",
        "comida": "jama",
        "comer": "jamar",
        "carro": "carro (con la R bien fuerte 🔥)",
        "niño": "nene",
        "niña": "nena",
        "muchacho": "chamaco",
    }

    resultado = texto.lower()
    cambios = []

    for formal, boricua in sustituciones.items():
        if formal in resultado:
            resultado = resultado.replace(formal, boricua)
            cambios.append(f"  • '{formal}' → '{boricua}'")

    if cambios:
        return (
            f"🇵🇷 **Versión boricua:**\n{resultado}\n\n"
            f"**Cambios hechos:**\n" + "\n".join(cambios)
        )
    else:
        return (
            f"Ese texto ya suena bastante normal, pero pa' darle sabor "
            f"boricua le faltaría un '¡Wepa!' al principio y un "
            f"'¿tú me entiendes?' al final. 😄"
        )


@mcp.tool
def info_gillito() -> str:
    """
    Devuelve información sobre Gilberto de Jesús Casas (Gillito),
    el comediante puertorriqueño al que rinde tributo este bot.
    """
    return (
        "🎤 **Gilberto de Jesús Casas — 'Gillito'**\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📅 1970 - 2014\n"
        "🇵🇷 Comediante puertorriqueño\n\n"
        "Gillito fue un comediante callejero que se ganó el corazón de "
        "Puerto Rico con su humor crudo, sin filtro y profundamente "
        "boricua. Su estilo reflejaba la vida real de los barrios "
        "puertorriqueños: la política corrupta, las luchas diarias, "
        "los personajes del caserío, y la alegría que el pueblo mantiene "
        "a pesar de todo.\n\n"
        "Este bot es un tributo a su memoria, manteniendo vivo su "
        "estilo único de humor y su espíritu de crítica social con "
        "sabor boricua. 🕊️\n\n"
        "**'Mi Pana Gillito'** — Un bot autónomo que postea contenido "
        "en X/Twitter y Moltbook, cubriendo temas de actualidad "
        "puertorriqueña con el estilo inconfundible de Gillito."
    )


@mcp.tool
def estado_bot() -> str:
    """
    Muestra el estado actual del sistema del bot Mi Pana Gillito,
    incluyendo las plataformas donde está activo.
    """
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    return (
        f"🤖 **Estado del Bot - Mi Pana Gillito**\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🕐 Consultado: {now}\n\n"
        f"**Plataformas activas:**\n"
        f"  🐦 X/Twitter — Posts cada 3h, replies cada 4-5 min\n"
        f"  📱 Moltbook — Posts cada 30 min\n"
        f"  🌐 Website — Generado via Cloudflare Pages\n\n"
        f"**Infraestructura:**\n"
        f"  ⚙️ Automatización: GitHub Actions\n"
        f"  🧠 AI: Groq API (generación de contenido)\n"
        f"  📊 Límites X: 500 posts/mes, 1000 replies/mes (free tier)\n\n"
        f"**Temas que cubre:**\n"
        f"  🏛️ Política puertorriqueña\n"
        f"  ⚡ Apagones de LUMA\n"
        f"  🇺🇸 Políticas de Trump / ICE\n"
        f"  🏝️ Cultura y humor boricua"
    )


# ============================================================
# Ejecutar servidor
# ============================================================
if __name__ == "__main__":
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8000)
