import * as ImagePicker from 'expo-image-picker';
import { AppError } from '../utils/authErrors';
import { isRecord, readString } from '../utils/parsers';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

/**
 * Abre a galeria e devolve a URI local da imagem escolhida (ou null se o usuário cancelar).
 * Solicita a permissão necessária e informa de forma clara quando ela é negada.
 */
export async function pickImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new AppError('Permita o acesso às fotos nas configurações do aparelho para escolher uma imagem.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

/** Envia a imagem ao Cloudinary (upload unsigned) e devolve apenas a URL final. */
export async function uploadImage(uri: string, folder: 'profiles' | 'groups'): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new AppError('O envio de imagens não está configurado (Cloudinary).');
  }

  const form = new FormData();
  form.append('file', { uri, name: `${folder}-${Date.now()}.jpg`, type: 'image/jpeg' });
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', folder);

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new AppError('Não foi possível enviar a imagem. Verifique sua conexão.');
  }

  const body: unknown = await response.json().catch(() => null);
  const url = isRecord(body) ? readString(body.secure_url) : '';
  if (!response.ok || !url) {
    throw new AppError('Falha ao enviar a imagem. Tente novamente.');
  }
  return url;
}
