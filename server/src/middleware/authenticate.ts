import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../services/notificationProcessor';

export type VerifyIdToken = (idToken: string) => Promise<string>;

/**
 * Exige `Authorization: Bearer <Firebase ID token>`. O token é validado pelo Firebase Admin SDK e o
 * `uid` resultante é a única identidade considerada pelas rotas.
 */
export function authenticate(verifyIdToken: VerifyIdToken) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const header = req.header('authorization') ?? '';
    const match = /^Bearer (.+)$/.exec(header);
    if (!match) throw new HttpError(401, 'Autenticação necessária.');

    try {
      res.locals.uid = await verifyIdToken(match[1]);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(401, 'Sessão inválida ou expirada.');
    }
    next();
  };
}

export function getAuthenticatedUid(res: Response): string {
  const uid: unknown = res.locals.uid;
  if (typeof uid !== 'string' || uid.length === 0) throw new HttpError(401, 'Autenticação necessária.');
  return uid;
}
