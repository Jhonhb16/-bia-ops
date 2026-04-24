# SKILL: Scraper de E-commerces Potenciales

## METADATA
name: lead-scraper
description: >
  Activa cuando el usuario quiera encontrar clientes potenciales,
  buscar e-commerces, prospectar negocios, generar leads o diga
  "encuéntrame clientes", "busca e-commerces en [país]",
  "quiero prospectar esta semana".
trigger: buscar clientes, prospectar, leads, e-commerce, encontrar negocios

---

## OBJETIVO
Encontrar e-commerces en LATAM que:
1. Ya están corriendo Meta Ads (hay inversión, hay intención de crecer)
2. Tienen señales de bajo rendimiento (alto gasto, bajo resultado visible)
3. Tienen producto validado (llevan tiempo activos, no son nuevos)
4. Son del tamaño correcto (Sprint o Escalado — no enterprise, no micro)

---

## PROCESO DE BÚSQUEDA

### PASO 1 — Meta Ad Library
Busca en https://www.facebook.com/ads/library/
- País: [el que especifique el usuario]
- Categoría: Todos los anuncios
- Palabras clave: [nicho + palabras de e-commerce: "tienda", "envío", "compra", "descuento", "oferta"]
- Filtro: Anuncios activos hace más de 30 días (señal de inversión sostenida)

Extrae por cada negocio encontrado:
- Nombre del negocio
- URL del anuncio / página
- Cantidad de anuncios activos
- Antigüedad del anuncio más antiguo activo
- Copy del anuncio (primeras líneas)
- ¿Usa video o imagen?
- Señales de bajo rendimiento: copy genérico, sin oferta clara, sin CTA fuerte

### PASO 2 — Análisis de la Página Web
Para cada prospecto:
- Lee la página de inicio
- ¿Tienen pixel de Meta instalado?
- ¿Tienen página de producto clara?
- ¿Tiene reviews/testimonios?
- ¿El copy de la landing tiene problemas evidentes?
- ¿Qué nicho exacto es?
- Score de oportunidad (1-10): ¿Qué tan probable es que necesiten ayuda?

### PASO 3 — Calificación
Clasifica cada lead en:

🔴 NO CALIFICA si:
- No tiene web propia (solo vende en marketplaces)
- Anuncios llevan menos de 2 semanas activos
- Es claramente una marca grande con agencia propia
- No tiene producto tangible (solo servicios locales)

🟡 POSIBLE si:
- Tiene web pero básica
- Anuncios activos 30-90 días
- Copy genérico y sin estructura clara
- Niche: moda, suplementos, hogar, mascotas, belleza, fitness

🟢 CALIFICA si:
- Web propia con e-commerce funcional
- Anuncios activos 90+ días (tienen presupuesto)
- Copy débil o estructura de campaña básica
- Múltiples anuncios = están probando solos sin sistema
- Nicho donde Bia Agency tiene casos de éxito

### PASO 4 — Datos de Contacto
Para cada lead 🟢:
- Busca email en la página (contacto, footer, about)
- Busca WhatsApp de negocio si lo muestran
- Busca perfil de Instagram/Facebook del negocio
- Busca nombre del dueño si es posible (about, instagram bio)

---

## FORMATO DE ENTREGA

Genera tabla con:
| # | Negocio | País | Nicho | URL | Contacto | Score | Por qué califica |
|---|---------|------|-------|-----|----------|-------|-----------------|

Luego lista los top 10 con análisis individual:

**[NOMBRE DEL NEGOCIO]**
- URL: [url]
- Nicho: [nicho]
- País: [país]
- Señal de oportunidad: [qué problema visible tiene]
- Contacto: [email/WA/IG]
- Score: X/10
- Por qué es buen prospecto: [razón específica]
- Ángulo de apertura sugerido: [cómo iniciar la conversación con este negocio específico]

---

## GUARDAR RESULTADO
Guarda en: /leads/leads-[país]-[fecha].md
Agrega a Supabase tabla: leads (si está disponible)
