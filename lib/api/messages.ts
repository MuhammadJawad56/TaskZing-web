import {
  chatRooms as mockChatRooms,
  messages as mockMessages,
} from "@/lib/mock-data/messages";
import type {
  ChatRoom,
  ChatRoomWithParticipants,
  Message,
  MessageWithSender,
} from "@/lib/types/message";
import { getUserById } from "./users";

const LOCAL_CHAT_ROOMS_KEY = "taskzing_local_chat_rooms";
const LOCAL_MESSAGES_KEY = "taskzing_local_messages";
const LOCAL_READS_KEY = "taskzing_local_chat_reads";

type ChatReadMap = Record<string, Record<string, string>>;

function readLocalData<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocalData<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

function readChatReads(): ChatReadMap {
  if (typeof window === "undefined") return {};

  const raw = localStorage.getItem(LOCAL_READS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as ChatReadMap) : {};
  } catch {
    return {};
  }
}

function writeChatReads(data: ChatReadMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_READS_KEY, JSON.stringify(data));
}

function getSeededChatRoomsForUser(userId: string): ChatRoom[] {
  if (userId !== "test-user") return [];

  return [
    {
      chatRoomId: "room-test-user",
      participantIds: ["test-user", "user-5"],
      jobId: "task-1",
      createdAt: "2024-01-23T09:00:00Z",
      updatedAt: "2024-01-23T09:05:00Z",
      lastMessageAt: "2024-01-23T09:05:00Z",
    },
  ];
}

function getSeededMessagesForUser(userId: string): Message[] {
  if (userId !== "test-user") return [];

  return [
    {
      messageId: "msg-test-1",
      chatRoomId: "room-test-user",
      senderId: "user-5",
      type: "text",
      text: "Hi, are you available for this task?",
      status: "read",
      timestamp: "2024-01-23T09:00:00Z",
      deletedForEveryone: false,
      createdAt: "2024-01-23T09:00:00Z",
      updatedAt: "2024-01-23T09:00:00Z",
    },
    {
      messageId: "msg-test-2",
      chatRoomId: "room-test-user",
      senderId: "test-user",
      type: "text",
      text: "Yes, I can start this afternoon.",
      status: "sent",
      timestamp: "2024-01-23T09:05:00Z",
      deletedForEveryone: false,
      createdAt: "2024-01-23T09:05:00Z",
      updatedAt: "2024-01-23T09:05:00Z",
    },
  ];
}

function getAllRooms(userId?: string): ChatRoom[] {
  const localRooms = readLocalData<ChatRoom>(LOCAL_CHAT_ROOMS_KEY);
  const seededRooms = userId ? getSeededChatRoomsForUser(userId) : [];
  const all = [...localRooms, ...seededRooms, ...mockChatRooms];
  const seen = new Set<string>();

  return all.filter((room) => {
    if (seen.has(room.chatRoomId)) return false;
    seen.add(room.chatRoomId);
    return true;
  });
}

function getAllMessages(userId?: string): Message[] {
  const localMessages = readLocalData<Message>(LOCAL_MESSAGES_KEY);
  const seededMessages = userId ? getSeededMessagesForUser(userId) : [];
  const all = [...localMessages, ...seededMessages, ...mockMessages];
  const seen = new Set<string>();

  return all.filter((message) => {
    if (seen.has(message.messageId)) return false;
    seen.add(message.messageId);
    return true;
  });
}

async function enrichMessage(message: Message): Promise<MessageWithSender> {
  const sender = await getUserById(message.senderId);

  return {
    ...message,
    sender: sender
      ? {
          id: sender.uid,
          fullName:
            sender.fullName || sender.username || sender.email.split("@")[0],
          photoUrl: sender.photoUrl,
        }
      : {
          id: message.senderId,
          fullName: "Unknown User",
        },
  };
}

async function enrichRoom(
  room: ChatRoom,
  currentUserId: string
): Promise<ChatRoomWithParticipants> {
  const participantIds = room.participantIds || [];
  const otherUserId =
    participantIds.find((participantId) => participantId !== currentUserId) ||
    participantIds[0];

  const [otherParticipantUser, participantUsers] = await Promise.all([
    otherUserId ? getUserById(otherUserId) : Promise.resolve(null),
    Promise.all(participantIds.map((participantId) => getUserById(participantId))),
  ]);

  const roomMessages = getAllMessages(currentUserId)
    .filter((message) => message.chatRoomId === room.chatRoomId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const lastMessage = roomMessages[roomMessages.length - 1];
  const reads = readChatReads();
  const lastReadAt = reads[room.chatRoomId]?.[currentUserId];
  const unreadCount = roomMessages.filter((message) => {
    if (message.senderId === currentUserId) return false;
    if (message.deletedForEveryone) return false;
    if (!lastReadAt) return true;
    return new Date(message.timestamp).getTime() > new Date(lastReadAt).getTime();
  }).length;

  return {
    ...room,
    lastMessage,
    lastMessageAt: lastMessage?.timestamp || room.lastMessageAt || room.updatedAt,
    participants: participantUsers
      .filter((participant): participant is NonNullable<typeof participant> => !!participant)
      .map((participant) => ({
        id: participant.uid,
        fullName:
          participant.fullName ||
          participant.username ||
          participant.email.split("@")[0],
        photoUrl: participant.photoUrl,
      })),
    otherParticipant: otherParticipantUser
      ? {
          id: otherParticipantUser.uid,
          fullName:
            otherParticipantUser.fullName ||
            otherParticipantUser.username ||
            otherParticipantUser.email.split("@")[0],
          photoUrl: otherParticipantUser.photoUrl,
        }
      : undefined,
    unreadCount,
  };
}

function snapshotRooms(userId: string) {
  return JSON.stringify({
    rooms: getAllRooms(userId),
    messages: getAllMessages(userId),
    reads: readChatReads(),
  });
}

function snapshotMessages(chatRoomId: string, userId: string) {
  return JSON.stringify({
    messages: getAllMessages(userId).filter(
      (message) => message.chatRoomId === chatRoomId
    ),
    reads: readChatReads()[chatRoomId] || {},
  });
}

export async function getChatRoomsByUserId(
  userId: string
): Promise<ChatRoomWithParticipants[]> {
  const rooms = getAllRooms(userId)
    .filter((room) => room.participantIds.includes(userId))
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt || b.updatedAt).getTime() -
        new Date(a.lastMessageAt || a.updatedAt).getTime()
    );

  return Promise.all(rooms.map((room) => enrichRoom(room, userId)));
}

export async function getMessagesByChatRoomId(
  chatRoomId: string,
  userId?: string
): Promise<MessageWithSender[]> {
  const messages = getAllMessages(userId)
    .filter((message) => message.chatRoomId === chatRoomId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return Promise.all(messages.map(enrichMessage));
}

export async function sendMessage(
  chatRoomId: string,
  senderId: string,
  text: string
): Promise<MessageWithSender> {
  const existingMessages = readLocalData<Message>(LOCAL_MESSAGES_KEY);
  const now = new Date().toISOString();
  const newMessage: Message = {
    messageId: `local-msg-${Date.now()}`,
    chatRoomId,
    senderId,
    type: "text",
    text,
    status: "sent",
    timestamp: now,
    deletedForEveryone: false,
    createdAt: now,
    updatedAt: now,
  };
  writeLocalData(LOCAL_MESSAGES_KEY, [...existingMessages, newMessage]);

  const rooms = getAllRooms(senderId);
  const room = rooms.find((item) => item.chatRoomId === chatRoomId);
  if (room) {
    const localRooms = readLocalData<ChatRoom>(LOCAL_CHAT_ROOMS_KEY);
    const inLocal = localRooms.some((item) => item.chatRoomId === chatRoomId);
    const nextRoom: ChatRoom = {
      ...room,
      updatedAt: now,
      lastMessageAt: now,
      lastMessage: newMessage,
    };

    const nextRooms = inLocal
      ? localRooms.map((item) => (item.chatRoomId === chatRoomId ? nextRoom : item))
      : [nextRoom, ...localRooms];
    writeLocalData(LOCAL_CHAT_ROOMS_KEY, nextRooms);
  }

  return enrichMessage(newMessage);
}

export async function deleteMessageForMe(
  _chatRoomId: string,
  messageId: string,
  userId: string
): Promise<void> {
  const currentMessages = readLocalData<Message>(LOCAL_MESSAGES_KEY);
  const nextMessages = currentMessages.map((message) => {
    if (message.messageId !== messageId) return message;

    const deletedFor = Array.isArray(message.metadata?.deletedFor)
      ? ([...(message.metadata?.deletedFor as string[])] as string[])
      : [];
    if (!deletedFor.includes(userId)) {
      deletedFor.push(userId);
    }

    return {
      ...message,
      metadata: {
        ...message.metadata,
        deletedFor,
      },
      updatedAt: new Date().toISOString(),
    };
  });

  writeLocalData(LOCAL_MESSAGES_KEY, nextMessages);
}

export async function deleteMessageForEveryone(
  _chatRoomId: string,
  messageId: string,
  userId: string
): Promise<void> {
  const currentMessages = readLocalData<Message>(LOCAL_MESSAGES_KEY);
  const nextMessages = currentMessages.map((message) => {
    if (message.messageId !== messageId || message.senderId !== userId) return message;

    return {
      ...message,
      text: "This message was deleted",
      deletedForEveryone: true,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  writeLocalData(LOCAL_MESSAGES_KEY, nextMessages);
}

export async function markMessagesAsRead(
  chatRoomId: string,
  userId: string
): Promise<void> {
  const reads = readChatReads();
  const roomReads = reads[chatRoomId] || {};
  roomReads[userId] = new Date().toISOString();
  reads[chatRoomId] = roomReads;
  writeChatReads(reads);
}

export function subscribeToMessages(
  chatRoomId: string,
  callback: (messages: MessageWithSender[]) => void,
  userId = "test-user"
): () => void {
  let lastSnapshot = "";

  const emit = async () => {
    const nextSnapshot = snapshotMessages(chatRoomId, userId);
    if (nextSnapshot === lastSnapshot) return;
    lastSnapshot = nextSnapshot;
    callback(await getMessagesByChatRoomId(chatRoomId, userId));
  };

  void emit();
  const interval = window.setInterval(() => {
    void emit();
  }, 1000);

  return () => window.clearInterval(interval);
}

export function subscribeToChatRooms(
  userId: string,
  callback: (rooms: ChatRoomWithParticipants[]) => void
): () => void {
  let lastSnapshot = "";

  const emit = async () => {
    const nextSnapshot = snapshotRooms(userId);
    if (nextSnapshot === lastSnapshot) return;
    lastSnapshot = nextSnapshot;
    callback(await getChatRoomsByUserId(userId));
  };

  void emit();
  const interval = window.setInterval(() => {
    void emit();
  }, 1000);

  return () => window.clearInterval(interval);
}

export async function getOrCreateChatRoom(
  participantIds: string[],
  jobId?: string
): Promise<string> {
  const sortedIds = [...participantIds].sort();
  const existingRoom = getAllRooms(sortedIds[0]).find((room) => {
    const roomIds = [...room.participantIds].sort();
    return (
      roomIds.length === sortedIds.length &&
      roomIds.every((id, index) => id === sortedIds[index]) &&
      (!jobId || !room.jobId || room.jobId === jobId)
    );
  });

  if (existingRoom) {
    return existingRoom.chatRoomId;
  }

  const now = new Date().toISOString();
  const newRoom: ChatRoom = {
    chatRoomId: `local-room-${Date.now()}`,
    participantIds: sortedIds,
    jobId,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
  };

  const currentRooms = readLocalData<ChatRoom>(LOCAL_CHAT_ROOMS_KEY);
  writeLocalData(LOCAL_CHAT_ROOMS_KEY, [newRoom, ...currentRooms]);
  return newRoom.chatRoomId;
}
