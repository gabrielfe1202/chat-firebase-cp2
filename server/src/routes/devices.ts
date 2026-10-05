import { Router } from 'express';
import { z } from 'zod';
import { getAuthenticatedUid } from '../middleware/authenticate';
import type { DevicePorts } from '../services/firebasePorts';

const bodySchema = z.object({
  deviceId: z.string().regex(/^[A-Za-z0-9_-]{6,64}$/),
  token: z.string().min(1).max(500),
  platform: z.enum(['android', 'ios']),
});

export function devicesRouter(ports: DevicePorts): Router {
  const router = Router();

  // O token é sempre gravado no usuário autenticado e removido de qualquer outro que o tivesse.
  router.post('/', async (req, res) => {
    const uid = getAuthenticatedUid(res);
    const { deviceId, token, platform } = bodySchema.parse(req.body);
    await ports.registerDevice(uid, deviceId, token, platform);
    res.status(204).end();
  });

  return router;
}
