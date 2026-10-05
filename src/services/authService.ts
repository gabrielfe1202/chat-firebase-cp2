import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import type { LoginInput, RegisterInput } from '../types/user';
import { parseBirthDate, onlyDigits } from '../utils/validation';
import { AppError } from '../utils/authErrors';
import { auth } from './firebase';
import { uploadImage } from './imageService';
import { saveUserProfile } from './userService';

export function observeAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function login({ email, password }: LoginInput): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

/**
 * Cria a conta (e-mail/senha), envia a foto e grava o perfil no Firestore.
 * Se qualquer etapa após a criação falhar, a conta é removida para não deixar um usuário sem perfil.
 */
export async function register(input: RegisterInput): Promise<void> {
  const birthDate = parseBirthDate(input.birthDate);
  if (!birthDate) throw new AppError('Informe uma data de nascimento válida (DD/MM/AAAA).');

  const credential = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  try {
    const photoUrl = input.photoUri ? await uploadImage(input.photoUri, 'profiles') : '';
    await saveUserProfile({
      uid: credential.user.uid,
      name: input.name.trim(),
      email: credential.user.email ?? input.email.trim(),
      phoneNumber: onlyDigits(input.phoneNumber),
      birthDate,
      photoUrl,
      createdAt: Date.now(),
    });
  } catch (error) {
    await deleteUser(credential.user).catch(() => undefined);
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
