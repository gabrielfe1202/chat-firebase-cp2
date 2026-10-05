export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

/**
 * Dados mínimos visíveis a qualquer usuário autenticado (lista de usuários, nomes e fotos no chat).
 * Os dados cadastrais completos ficam em `users/{uid}`, com acesso restrito.
 */
export type PublicProfile = Pick<ChatUser, 'uid' | 'name' | 'photoUrl'>;

/** Dados enviados no cadastro; a foto é enviada ao serviço de imagens antes de gravar o perfil. */
export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string;
  photoUri: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};
