import Anthropic from "@anthropic-ai/sdk";
import type { Client, MetricDaily } from "@bia-ops/shared";

const escalationKeywords = [
  "cancelar",
  "quiero salir",
  "no funciona",
  "decepcionado",
  "dinero perdido",
  "devuelven",
  "quiero hablar",
  "cambiar estrategia"
];

export async function answerClientQuestion(input: {
  client: Client;
  latestMetric: MetricDaily | null;
  lastAction?: string;
  question: string;
}) {
  const shouldEscalate = escalationKeywords.some((keyword) => input.question.toLowerCase().includes(keyword));
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return {
      content: shouldEscalate
        ? "Esta pregunta requiere atencion personalizada. Ya estoy avisando a tu gestor para que revise tu cuenta y te responda pronto."
        : `Con los datos actuales, por cada $1 invertido estas recuperando $${(input.latestMetric?.roas ?? input.client.current_roas).toFixed(2)}. El equipo sigue mirando frecuencia, costo por venta y gasto para sostener resultados sin forzar la cuenta.`,
      escalate: shouldEscalate,
      summary: shouldEscalate ? input.question.slice(0, 180) : undefined
    };
  }

  const anthropic = new Anthropic({ apiKey });
  const system = buildClientSystemPrompt(input.client, input.latestMetric, input.lastAction);
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 420,
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: input.question,
            cache_control: { type: "ephemeral" }
          }
        ]
      }
    ]
  });

  const content = message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();

  return {
    content,
    escalate: shouldEscalate,
    summary: shouldEscalate ? input.question.slice(0, 180) : undefined
  };
}

function buildClientSystemPrompt(client: Client, metric: MetricDaily | null, lastAction?: string) {
  return `Eres el asistente de Bia Agency para el cliente ${client.business_name}.

Datos actuales:
- ROAS: x${(metric?.roas ?? client.current_roas).toFixed(2)} (benchmark x3.5)
- CPA: $${(metric?.cpa ?? 0).toFixed(2)}
- Gasto reciente: $${(metric?.spend ?? 0).toFixed(2)}
- Frecuencia: ${(metric?.frequency ?? 0).toFixed(1)}
- CTR: ${(metric?.ctr ?? 0).toFixed(2)}%
- Alcance: ${metric?.reach ?? 0}
- Estado: ${client.health_status}
- Ultima accion: ${lastAction ?? "sin accion registrada"}

Contexto:
- Nicho: ${client.category}
- Producto: ${client.product_description}
- Objetivo: ${client.main_goal}
- Plan: ${client.plan_type}

Reglas:
1. Responde siempre en espanol conversacional.
2. Evita jerga: ROAS es retorno, CPA es costo por venta, CTR es tasa de clics.
3. Usa datos reales.
4. Maximo 3 parrafos.
5. Si requiere accion operativa, indica que notificas al gestor.`;
}
