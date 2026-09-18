export type Profile = {
  userId: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
};

export type Conversation = {
  id: string;
  participants?: string[];
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export type MessagePage = { messages?: Message[]; nextCursor?: string };

export type Notification = {
  id: string;
  userId: string;
  type: string;
  message: string;
  read?: boolean;
  createdAt: string;
  relatedId?: string;
};

export type AuthResponse = {
  success?: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  token?: string;
};
export type SocketAck = { success?: boolean; message?: string; messageId?: string };
export type TypingEvent = { userId: string; conversationId: string };
export type ReadEvent = { messageId: string; userId: string };

export function conversationTitle(conversation: Conversation, userId: string) {
  return conversation.participants?.filter((id) => id !== userId).join(", ") || "Conversation";
}
