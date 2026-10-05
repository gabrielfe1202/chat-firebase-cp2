import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { status, signOut } = useAuth();

  if (status === 'loading') return <Loading message="Carregando..." />;

  // Autenticado, mas o perfil ainda não chegou do Firestore (ex.: logo após o cadastro).
  if (status === 'profile-pending') {
    return (
      <View style={styles.pending}>
        <Loading message="Carregando seu perfil..." />
        <PrimaryButton title="Sair" variant="link" onPress={() => void signOut()} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? (
        <Stack.Navigator>
          <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  pending: { flex: 1, paddingBottom: 32 },
});
