const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "NutriOpus";

export async function sendWhatsAppMessage(phone: string, text: string) {
  // Se as variáveis não estiverem setadas, simula o envio (fallback resiliente)
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.log(`[WHATSAPP SIMULADO] Para: ${phone} | Mensagem: ${text}`);
    return { success: true, simulated: true };
  }

  // Format phone to international format if necessary
  const formattedPhone = phone.replace(/\D/g, "");

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${INSTANCE_NAME}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedPhone,
        options: {
          delay: 1200,
          presence: "composing",
        },
        textMessage: {
          text,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`Evolution API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
