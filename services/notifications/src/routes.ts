import { FastifyInstance } from 'fastify';

// In-memory notification store for sandbox
const notifications: Array<{
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}> = [
  {
    id: 'notif_1',
    user_id: 'demo',
    type: 'daily_summary',
    title: 'Aaj ka hisaab',
    body: 'Aaj ₹1,250 kharch hua. Sabse zyada food pe — ₹450.',
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'notif_2',
    user_id: 'demo',
    type: 'bill_reminder',
    title: 'Bijli ka bill',
    body: 'Tata Power bill ₹1,850 — 3 din baaki hain.',
    is_read: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'notif_3',
    user_id: 'demo',
    type: 'score_update',
    title: 'Mini Score badha!',
    body: 'Score 3 point badha — ab 67 hai. Bill time pe bhari! 🎉',
    is_read: true,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

export async function notificationRoutes(app: FastifyInstance) {
  // List notifications
  app.get('/', async (request, reply) => {
    return {
      success: true,
      data: notifications,
    };
  });

  // Mark notification as read
  app.put<{ Params: { id: string } }>('/:id/read', async (request, reply) => {
    const { id } = request.params;
    const notif = notifications.find((n) => n.id === id);
    if (!notif) {
      return reply.status(404).send({ success: false, error: 'Notification not found' });
    }
    notif.is_read = true;
    return { success: true, data: notif };
  });

  // Notification settings
  app.get('/settings', async () => {
    return {
      success: true,
      data: {
        daily_summary: { enabled: true, time: '21:00' },
        bill_reminders: { enabled: true, days_before: [7, 3, 1] },
        score_updates: { enabled: true },
        coach_insights: { enabled: true, frequency: 3 }, // 3x per week
        push_enabled: true,
        whatsapp_enabled: false,
      },
    };
  });

  // Update notification settings
  app.put('/settings', async (request, reply) => {
    // In production: persist to DB
    return { success: true, data: { message: 'Settings updated' } };
  });
}
