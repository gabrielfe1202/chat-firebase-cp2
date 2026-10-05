import type { ChatGroup } from './group';

export type ConversationType = 'direct' | 'group';

export type DirectConversation = {
  id: string;
  type: 'direct';
  participants: [string, string];
  createdAt: number;
};

export type GroupConversation = ChatGroup & { type: 'group' };

export type Conversation = DirectConversation | GroupConversation;

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type SendMessageInput = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

export const MAX_MESSAGE_LENGTH = 1000;
