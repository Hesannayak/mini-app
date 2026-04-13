/**
 * WhatsApp Business API provider (via Gupshup).
 * Fallback notification channel when FCM fails.
 */

interface WhatsAppMessage {
  phone: string;
  template: string;
  params: Record<string, string>;
}

export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<boolean> {
  const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

  if (!WHATSAPP_API_TOKEN) {
    console.log('[WhatsApp] No API token configured — skipping');
    console.log(`[WhatsApp] Would send template "${message.template}" to ${message.phone}`);
    return false;
  }

  try {
    // Gupshup API integration
    const response = await fetch('https://api.gupshup.io/wa/api/v1/template/msg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apikey: WHATSAPP_API_TOKEN,
      },
      body: new URLSearchParams({
        channel: 'whatsapp',
        source: '917834811114', // Business number
        destination: `91${message.phone}`,
        template: JSON.stringify({
          id: message.template,
          params: Object.values(message.params),
        }),
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp] Failed to send message:', error);
    return false;
  }
}
