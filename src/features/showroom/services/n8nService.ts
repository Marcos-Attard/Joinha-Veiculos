const N8N_WEBHOOK_URL = "https://semidefensively-hymnological-elvia.ngrok-free.dev/webhook/chat";

/**
 * Sends a message to the N8N chat webhook.
 */
export const enviarMensagemN8N = async (textoUsuario: string, sessionId: string) => {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatInput: textoUsuario, sessionId }),
  });
  
  return response.json();
};