import cron from 'node-cron';

/**
 * Daily spending summary notification at 9pm IST.
 * Sends a voice-friendly summary in user's language.
 */
export function scheduleDailySummary() {
  // Run at 9pm IST every day (IST = UTC+5:30, so 15:30 UTC)
  cron.schedule('30 15 * * *', async () => {
    console.log('[CRON] Running daily spending summary...');

    // In production:
    // 1. Query all active users
    // 2. For each user, compute today's spending summary
    // 3. Generate localized message
    // 4. Send via FCM (primary) or WhatsApp (fallback)

    // Sandbox: just log
    console.log('[CRON] Daily summary would be sent to all users');
  });

  console.log('Scheduled: Daily spending summary at 9pm IST');
}
