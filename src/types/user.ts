export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  photoUrl: string;
  createdAt: number;
};

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
