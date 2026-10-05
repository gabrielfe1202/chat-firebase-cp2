import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { ZodError } from 'zod';
import { authenticate, type VerifyIdToken } from './middleware/authenticate';
import { devicesRouter } from './routes/devices';
import { notificationsRouter } from './routes/notifications';
import { profilesRouter } from './routes/profiles';
import { adminAuth } from './services/firebaseAdmin';
import {
  firebaseDevicePorts,
  firebaseNotificationPorts,
  firebaseProfilePorts,
  type DevicePorts,
  type ProfilePorts,
} from './services/firebasePorts';
import { HttpError, type NotificationPorts } from './services/notificationProcessor';

export type AppDependencies = {
  verifyIdToken: VerifyIdToken;
  notifications: NotificationPorts;
  profiles: ProfilePorts;
  devices: DevicePorts;
};

/** Dependências reais (Firebase Admin SDK). Só tocam o Firebase quando uma rota é chamada. */
export function createFirebaseDependencies(): AppDependencies {
  return {
    verifyIdToken: async (idToken) => {
      let auth: ReturnType<typeof adminAuth>;
      try {
        auth = adminAuth();
      } catch (error) {
        // Credenciais ausentes/inválidas na hospedagem: falha de configuração, não de quem chamou.
        console.error('Firebase Admin não inicializou:', error instanceof Error ? error.message : 'desconhecido');
        throw new HttpError(500, 'Serviço indisponível.');
      }
      return (await auth.verifyIdToken(idToken)).uid;
    },
    notifications: firebaseNotificationPorts,
    profiles: firebaseProfilePorts,
    devices: firebaseDevicePorts,
  };
}

export function createApp(deps: AppDependencies = createFirebaseDependencies()): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  const requireAuth = authenticate(deps.verifyIdToken);
  app.use('/notifications', requireAuth, notificationsRouter(deps.notifications));
  app.use('/users', requireAuth, profilesRouter(deps.profiles));
  app.use('/devices', requireAuth, devicesRouter(deps.devices));

  app.use((_req, _res, next) => next(new HttpError(404, 'Rota não encontrada.')));

  // Erros esperados viram respostas claras; qualquer outro vira 500 genérico, sem detalhes internos.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
    } else if (error instanceof ZodError) {
      res.status(400).json({ error: 'Requisição inválida.' });
    } else if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'JSON inválido.' });
    } else {
      console.error('Erro não tratado:', error instanceof Error ? error.message : 'desconhecido');
      res.status(500).json({ error: 'Erro interno.' });
    }
  });

  return app;
}

export const app = createApp();
