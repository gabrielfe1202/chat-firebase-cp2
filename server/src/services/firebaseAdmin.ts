import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getDatabase, type Database } from 'firebase-admin/database';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

/**
 * Inicialização preguiçosa: o app só exige as credenciais quando uma rota realmente usa o Firebase,
 * então `/health` e os testes funcionam sem elas. As credenciais vêm exclusivamente das variáveis de
 * ambiente da hospedagem (nunca do repositório).
 */
export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  return initializeApp({
    credential: cert({
      projectId: requireEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL'),
      // A hospedagem guarda as quebras de linha da chave como "\n" literal.
      privateKey: requireEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
    databaseURL: requireEnv('FIREBASE_DATABASE_URL'),
  });
}

export const adminAuth = (): Auth => getAuth(getAdminApp());
export const adminFirestore = (): Firestore => getFirestore(getAdminApp());
export const adminDatabase = (): Database => getDatabase(getAdminApp());
export const adminMessaging = (): Messaging => getMessaging(getAdminApp());
