import { Router } from 'express';
import { z } from 'zod';
import { getAuthenticatedUid } from '../middleware/authenticate';
import { processMessageNotification, type NotificationPorts } from '../services/notificationProcessor';

/** IDs de conversa e mensagem viram caminhos do Realtime Database: só caracteres seguros. */
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

const bodySchema = z.object({
  conversationId: idSchema,
  messageId: idSchema,
});

export function notificationsRouter(ports: NotificationPorts): Router {
  const router = Router();

  // O corpo traz só os IDs; remetente e destinatários são determinados no servidor.
  router.post('/messages', async (req, res) => {
    const uid = getAuthenticatedUid(res);
    const { conversationId, messageId } = bodySchema.parse(req.body);
    const result = await processMessageNotification(ports, { uid, conversationId, messageId });
    res.json(result);
  });

  return router;
}
