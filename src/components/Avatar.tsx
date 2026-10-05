import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  uri?: string | null;
  name?: string;
  size?: number;
};

/** Mostra a foto; se não houver URL ou o carregamento falhar, exibe as iniciais como imagem padrão. */
export function Avatar({ uri, name = '', size = 48 }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return <Image source={{ uri }} style={[styles.image, dimension]} onError={() => setFailed(true)} />;
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surface },
  fallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.white, fontWeight: '700' },
});
