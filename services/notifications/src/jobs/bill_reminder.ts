import cron from 'node-cron';

/**
 * Bill reminder notifications.
 * Sends reminders at 7 days, 3 days, and 1 day before due date.
 * Runs every morning at 9am IST.
 */
export function scheduleBillReminders() {
  // Run at 9am IST every day (IST = UTC+5:30, so 3:30 UTC)
  cron.schedule('30 3 * * *', async () => {
    console.log('[CRON] Checking bill reminders...');

    // In production:
    // 1. Query bills with due_date within 7 days
    // 2. For each bill, check remind_days array
    // 3. Generate localized reminder message
    // 4. Send via FCM, with WhatsApp fallback

    // Sandbox: just log
    console.log('[CRON] Bill reminders would be sent for upcoming bills');
  });

  console.log('Scheduled: Bill reminders at 9am IST');
}
