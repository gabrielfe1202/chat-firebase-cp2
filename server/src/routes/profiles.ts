import { Router } from 'express';
import { z } from 'zod';
import { getAuthenticatedUid } from '../middleware/authenticate';
import type { ProfilePorts } from '../services/firebasePorts';
import { HttpError } from '../services/notificationProcessor';

const paramsSchema = z.object({ uid: z.string().regex(/^[A-Za-z0-9]{1,128}$/) });

export function profilesRouter(ports: ProfilePorts): Router {
  const router = Router();

  // Perfil completo: apenas o próprio usuário ou quem compartilha conversa individual ou grupo com ele.
  router.get('/:uid/profile', async (req, res) => {
    const requester = getAuthenticatedUid(res);
    const { uid: target } = paramsSchema.parse(req.params);

    if (target !== requester && !(await ports.shareConversation(requester, target))) {
      throw new HttpError(403, 'Perfil indisponível.');
    }
    const profile = await ports.getProfile(target);
    if (!profile) throw new HttpError(404, 'Perfil não encontrado.');
    res.json(profile);
  });

  return router;
}
