import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

/**
 * Declarações para APIs que existem em tempo de execução no React Native, mas que os tipos públicos
 * não descrevem. Preferimos declarar o formato real a usar `any` ou @ts-ignore.
 */

declare module 'firebase/auth' {
  /** Disponível no bundle React Native do Firebase (resolvido pelo Metro); persiste a sessão em AsyncStorage. */
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}

declare global {
  /** No React Native, um arquivo de formulário é descrito por { uri, name, type }, não por um Blob. */
  type ReactNativeFile = { uri: string; name: string; type: string };

  interface FormData {
    append(name: string, value: ReactNativeFile): void;
  }
}
