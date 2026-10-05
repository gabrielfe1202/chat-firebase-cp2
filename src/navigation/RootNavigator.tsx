import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { ChatScreen } from '../screens/ChatScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { GroupFormScreen } from '../screens/GroupFormScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UsersScreen } from '../screens/UsersScreen';
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
        <PrimaryButton title="Sair" variant="link" onPress={() => signOut().catch(() => undefined)} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {status === 'authenticated' ? (
        <Stack.Navigator>
          <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Conversas' }} />
          <Stack.Screen name="Users" component={UsersScreen} options={{ title: 'Usuários' }} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="GroupMembers" component={GroupMembersScreen} options={{ title: 'Integrantes' }} />
          <Stack.Screen
            name="GroupForm"
            component={GroupFormScreen}
            options={({ route }) => ({ title: route.params.groupId ? 'Editar grupo' : 'Novo grupo' })}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
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
