import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ConversationType } from './chat';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Conversations: undefined;
  Users: {
    mode: 'direct' | 'selectMembers';
    groupId?: string;
    /** Seleção atual (modo selectMembers), para o usuário ver quem já está escolhido. */
    initialSelectedIds?: string[];
    /** Já são integrantes: aparecem marcados e não podem ser desmarcados aqui (remoção é feita no grupo). */
    lockedIds?: string[];
    /** Máximo de usuários que ainda podem ser selecionados (vagas do grupo, sem contar o proprietário). */
    maxSelectable?: number;
  };
  GroupForm: { groupId?: string; selectedMemberIds?: string[] };
  Chat: { conversationId: string; conversationType: ConversationType };
  GroupMembers: { groupId: string };
  Profile: { uid: string };
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
