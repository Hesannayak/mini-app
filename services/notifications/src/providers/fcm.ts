/**
 * Firebase Cloud Messaging provider.
 * Primary push notification channel.
 */

interface PushMessage {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(message: PushMessage): Promise<boolean> {
  const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

  if (!FCM_SERVER_KEY) {
    console.log('[FCM] No server key configured — skipping push notification');
    console.log(`[FCM] Would send: "${message.title}" — "${message.body}"`);
    return false;
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: message.token,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: message.data,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[FCM] Failed to send notification:', error);
    return false;
  }
}
