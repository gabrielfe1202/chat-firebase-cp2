import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ConversationType } from './chat';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Conversations: undefined;
  Users: { mode: 'direct' | 'selectMembers'; groupId?: string };
  GroupForm: { groupId?: string; selectedMemberIds?: string[] };
  Chat: { conversationId: string; conversationType: ConversationType };
  GroupMembers: { groupId: string };
  Profile: { uid: string };
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
