import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createGroq } from '@ai-sdk/groq';
import { z } from "zod";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY || "dummy", // Placeholder or from env
});

const mealSchema = z.object({
  meals: z.array(
    z.object({
      name: z.string(),
      notes: z.string().optional(),
      items: z.array(
        z.object({
          foodName: z.string(),
          quantity: z.number(),
          unit: z.string(),
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
          source: z.enum(["TACO", "CUSTOM"]),
        })
      )
    })
  )
});

export async function POST(req: NextRequest) {
  const { getSessionFromCookies } = await import("@/lib/auth/cookies");
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const { prompt } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      // Mocked response if no API key is provided
      console.warn("GROQ_API_KEY is not set. Returning mocked data.");
      return NextResponse.json({
        meals: [
          {
            name: "Refeição Gerada (Simulação - API Key Ausente)",
            notes: "Esta é uma simulação pois a GROQ_API_KEY não está no .env.",
            items: [
              { foodName: "Frango grelhado", quantity: 150, unit: "g", calories: 240, protein: 45, carbs: 0, fat: 5, source: "CUSTOM" },
              { foodName: "Arroz integral", quantity: 100, unit: "g", calories: 110, protein: 3, carbs: 23, fat: 1, source: "CUSTOM" }
            ]
          }
        ]
      });
    }

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      prompt: `Você é um nutricionista especialista montando um cardápio.
      O usuário pediu o seguinte: "${prompt}"
      
      Retorne APENAS um objeto JSON válido contendo um array 'meals'. Cada 'meal' deve ter 'name', 'time' (string formato HH:MM), 'notes', e um array de 'items'.
      Cada item deve ter 'foodName', 'quantity' (DEVE SER estritamente um NÚMERO, use ponto para decimais, NUNCA use frações como 1/2, use 0.5), 'unit' (ex: "g", "ml"), 'calories', 'protein', 'carbs', 'fat', e source deve ser "CUSTOM".
      NÃO adicione crases de markdown (\`\`\`) e nem nenhuma explicação antes ou depois do JSON. Valide rigorosamente se o formato é um JSON perfeito.`,
    });

    try {
      // Strip markdown code blocks if the AI still included them
      const cleanedText = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const object = JSON.parse(cleanedText);
      return NextResponse.json(object);
    } catch (parseError) {
      console.error("JSON Parse Error. Raw Text:", text);
      return NextResponse.json({ error: "Falha ao analisar o JSON retornado pela IA" }, { status: 500 });
    }
  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "Falha ao gerar cardápio" }, { status: 500 });
  }
}
