import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import {
  ChatRoom,
  Message,
  ChatRoomWithParticipants,
  MessageWithSender,
} from "@/lib/types/message";

// Collection names - matching the mobile app structure
// The mobile app typically uses "chats" collection with "messages" subcollection
const COLLECTION_NAMES = {
  chatRooms: ["chats", "chat_rooms", "chatRooms"],
  messages: "messages",
  users: "users",
};

// Cache detected collections to avoid repeated probing (and avoid multiple listeners)
const detectedChatRoomsCollectionCache = new Map<string, string>(); // userId -> collectionName
const detectedRoomCollectionCache = new Map<string, string>(); // chatRoomId -> collectionName

// Helper function to convert Firestore timestamp to ISO string
function timestampToISO(timestamp: any): string {
  if (!timestamp) return new Date().toISOString();
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === "string") return timestamp;
  if (typeof timestamp === "number") return new Date(timestamp).toISOString();
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

// Helper to get user data with caching
const userCache = new Map<string, { fullName: string; photoUrl?: string }>();

async function getUserInfo(
  userId: string
): Promise<{ id: string; fullName: string; photoUrl?: string }> {
  if (userCache.has(userId)) {
    return { id: userId, ...userCache.get(userId)! };
  }

  try {
    const userDoc = await getDoc(doc(db, COLLECTION_NAMES.users, userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const userInfo = {
        fullName:
          data.fullName ||
          data.displayName ||
          data.name ||
          data.username ||
          "Unknown User",
        photoUrl:
          data.photoURL || data.photoUrl || data.avatar || data.profileImage,
      };
      userCache.set(userId, userInfo);
      return { id: userId, ...userInfo };
    }
  } catch (error) {
    console.error("Error fetching user:", userId, error);
  }

  return { id: userId, fullName: "Unknown User", photoUrl: undefined };
}

// Extract participant IDs from chat room data
function extractParticipantIds(data: any): string[] {
  const normalizeId = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
      // Common shapes: { id }, { uid }, { userId }, Firebase DocumentReference (has .id)
      const candidate =
        value.id ||
        value.uid ||
        value.userId ||
        value.userID ||
        value.user_id ||
        value._id;
      if (typeof candidate === "string" && candidate.length > 0) return candidate;

      // Sometimes a DocumentReference-like shape
      if (typeof value.path === "string") {
        const parts = value.path.split("/");
        const last = parts[parts.length - 1];
        if (last) return last;
      }

      return null;
    }
    return null;
  };

  // Try all possible field names for participant IDs
  if (Array.isArray(data.participantIds) && data.participantIds.length > 0) {
    return data.participantIds.map(normalizeId).filter(Boolean) as string[];
  }
  if (Array.isArray(data.participants)) {
    return data.participants
      .map((p: any) => normalizeId(p))
      .filter(Boolean) as string[];
  }
  if (Array.isArray(data.userIds)) {
    return data.userIds.map(normalizeId).filter(Boolean) as string[];
  }
  if (Array.isArray(data.members)) {
    return data.members.map((m: any) => normalizeId(m)).filter(Boolean) as string[];
  }
  if (data.user1Id && data.user2Id) {
    return [normalizeId(data.user1Id), normalizeId(data.user2Id)].filter(Boolean) as string[];
  }
  if (data.userId1 && data.userId2) {
    return [normalizeId(data.userId1), normalizeId(data.userId2)].filter(Boolean) as string[];
  }
  if (data.senderId && data.receiverId) {
    return [normalizeId(data.senderId), normalizeId(data.receiverId)].filter(Boolean) as string[];
  }
  // Check if participants is an object (map)
  if (
    typeof data.participants === "object" &&
    data.participants !== null &&
    !Array.isArray(data.participants)
  ) {
    return Object.keys(data.participants).map(normalizeId).filter(Boolean) as string[];
  }

  return [];
}

async function detectChatRoomsCollectionForUser(userId: string): Promise<string> {
  const cached = detectedChatRoomsCollectionCache.get(userId);
  if (cached) return cached;

  let firstReadable: string | null = null;

  for (const collectionName of COLLECTION_NAMES.chatRooms) {
    const chatRoomsRef = collection(db, collectionName);

    // Strategy A: participantIds array-contains (most common)
    try {
      const q = query(chatRoomsRef, where("participantIds", "array-contains", userId), limit(1));
      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        detectedChatRoomsCollectionCache.set(userId, collectionName);
        return collectionName;
      }
      if (!firstReadable) firstReadable = collectionName;
    } catch {
      // ignore
    }

    // Strategy B: participants array-contains (alternate)
    try {
      const q = query(chatRoomsRef, where("participants", "array-contains", userId), limit(1));
      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        detectedChatRoomsCollectionCache.set(userId, collectionName);
        return collectionName;
      }
      if (!firstReadable) firstReadable = collectionName;
    } catch {
      // ignore
    }

    // Strategy C: small sample + client-side filter (last resort)
    try {
      const q = query(chatRoomsRef, limit(25));
      const snap = await getDocs(q);
      if (!firstReadable) firstReadable = collectionName;
      const anyMatch = snap.docs.some((d) => extractParticipantIds(d.data()).includes(userId));
      if (anyMatch) {
        detectedChatRoomsCollectionCache.set(userId, collectionName);
        return collectionName;
      }
    } catch {
      // ignore
    }
  }

  // Default fallback
  const fallback = firstReadable || "chat_rooms";
  detectedChatRoomsCollectionCache.set(userId, fallback);
  return fallback;
}

async function detectRoomCollection(chatRoomId: string): Promise<string | null> {
  const cached = detectedRoomCollectionCache.get(chatRoomId);
  if (cached) return cached;

  for (const collectionName of COLLECTION_NAMES.chatRooms) {
    try {
      const roomDoc = await getDoc(doc(db, collectionName, chatRoomId));
      if (roomDoc.exists()) {
        detectedRoomCollectionCache.set(chatRoomId, collectionName);
        return collectionName;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

// Diagnostic function to check Firebase collections
export async function diagnoseFirebaseCollections(userId: string) {
  console.log("=== Firebase Diagnostics ===");
  console.log("User ID:", userId);

  const results: any = { userId, collections: {}, detected: {} };

  try {
    results.detected.chatRoomsCollection = await detectChatRoomsCollectionForUser(userId);
  } catch (e: any) {
    results.detected.chatRoomsCollection = `detect failed: ${e?.message || String(e)}`;
  }

  for (const collectionName of COLLECTION_NAMES.chatRooms) {
    try {
      const ref = collection(db, collectionName);
      const snapshot = await getDocs(ref);
      const count = snapshot.docs.length;
      results.collections[collectionName] = { count };

      console.log(`Collection "${collectionName}": ${count} documents`);

      if (count > 0) {
        const sample = snapshot.docs[0].data();
        console.log(`  Sample fields:`, Object.keys(sample));
        console.log(`  Sample data:`, sample);

        // Find user's rooms
        const userRooms = snapshot.docs.filter((d) => {
          const ids = extractParticipantIds(d.data());
          return ids.includes(userId);
        });
        console.log(`  User's rooms: ${userRooms.length}`);
        results.collections[collectionName].userRooms = userRooms.length;
      }
    } catch (error: any) {
      console.log(`Collection "${collectionName}": Error - ${error.message}`);
      results.collections[collectionName] = { error: error.message };
    }
  }

  return results;
}

// Get chat rooms for a user
export async function getChatRoomsByUserId(
  userId: string
): Promise<ChatRoomWithParticipants[]> {
  console.log("Fetching chat rooms for user:", userId);
  const allRooms: ChatRoomWithParticipants[] = [];
  const processedIds = new Set<string>();

  // Prefer the collection that actually contains this user's rooms
  const preferredCollection = await detectChatRoomsCollectionForUser(userId);
  const orderedCollections = [
    preferredCollection,
    ...COLLECTION_NAMES.chatRooms.filter((c) => c !== preferredCollection),
  ];

  // Try each possible collection name (preferred first)
  for (const collectionName of orderedCollections) {
    try {
      const chatRoomsRef = collection(db, collectionName);

      // First try array-contains query
      let snapshot;
      try {
        const q = query(
          chatRoomsRef,
          where("participantIds", "array-contains", userId)
        );
        snapshot = await getDocs(q);
        console.log(
          `  "${collectionName}" with participantIds query: ${snapshot.docs.length} docs`
        );
      } catch (queryError) {
        // Try alternative field name
        try {
          const q = query(
            chatRoomsRef,
            where("participants", "array-contains", userId)
          );
          snapshot = await getDocs(q);
          console.log(
            `  "${collectionName}" with participants query: ${snapshot.docs.length} docs`
          );
        } catch {
          // Query failed, try fetching a small sample and filtering client-side
          console.log(`  "${collectionName}" query failed, fetching sample...`);
          snapshot = await getDocs(query(chatRoomsRef, limit(50)));
        }
      }

      // Process each document
      for (const docSnap of snapshot.docs) {
        if (processedIds.has(docSnap.id)) continue;

        const data = docSnap.data();
        const participantIds = extractParticipantIds(data);

        // Check if user is a participant
        if (!participantIds.includes(userId)) {
          continue;
        }

        processedIds.add(docSnap.id);

        // Build lastMessage if available
        let lastMessage: Message | undefined;
        if (data.lastMessage) {
          const lm = data.lastMessage;
          lastMessage = {
            messageId: lm.messageId || lm.id || `last-${docSnap.id}`,
            chatRoomId: docSnap.id,
            senderId: lm.senderId || lm.sender || "",
            type: lm.type || "text",
            text: lm.text || lm.message || lm.content || "",
            status: lm.status || "sent",
            timestamp: timestampToISO(lm.timestamp || lm.createdAt),
            deletedForEveryone: lm.deletedForEveryone || false,
            createdAt: timestampToISO(lm.createdAt),
            updatedAt: timestampToISO(lm.updatedAt),
          };
        } else if (data.lastMessageText) {
          lastMessage = {
            messageId: `last-${docSnap.id}`,
            chatRoomId: docSnap.id,
            senderId: data.lastMessageSenderId || "",
            type: "text",
            text: data.lastMessageText,
            status: "sent",
            timestamp: timestampToISO(data.lastMessageAt || data.updatedAt),
            deletedForEveryone: false,
            createdAt: timestampToISO(data.lastMessageAt || data.updatedAt),
            updatedAt: timestampToISO(data.lastMessageAt || data.updatedAt),
          };
        }

        const room: ChatRoomWithParticipants = {
          chatRoomId: docSnap.id,
          participantIds,
          lastMessage,
          lastMessageAt: timestampToISO(
            data.lastMessageAt || data.lastMessageTime || data.updatedAt
          ),
          jobId: data.jobId || data.taskId,
          createdAt: timestampToISO(data.createdAt),
          updatedAt: timestampToISO(data.updatedAt),
          unreadCount:
            typeof data.unreadCount === "object"
              ? data.unreadCount?.[userId] || 0
              : data.unreadCount || 0,
        };

        // Get other participant info
        const otherParticipantId = participantIds.find((id) => id !== userId);
        if (otherParticipantId) {
          room.otherParticipant = await getUserInfo(otherParticipantId);
        }

        allRooms.push(room);
      }
    } catch (error: any) {
      console.warn(`Error with collection "${collectionName}":`, error.message);
    }
  }

  // Sort by lastMessageAt descending
  allRooms.sort((a, b) => {
    const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return dateB - dateA;
  });

  console.log(`Total chat rooms found: ${allRooms.length}`);
  return allRooms;
}

// Get messages for a chat room
export async function getMessagesByChatRoomId(
  chatRoomId: string
): Promise<MessageWithSender[]> {
  console.log("Fetching messages for chat room:", chatRoomId);
  const allMessages: MessageWithSender[] = [];
  const processedIds = new Set<string>();

  // Method 1: Try subcollection (chats/{chatRoomId}/messages)
  for (const collectionName of COLLECTION_NAMES.chatRooms) {
    try {
      const messagesRef = collection(
        db,
        collectionName,
        chatRoomId,
        COLLECTION_NAMES.messages
      );

      let snapshot;
      try {
        const q = query(messagesRef, orderBy("timestamp", "asc"));
        snapshot = await getDocs(q);
      } catch {
        snapshot = await getDocs(messagesRef);
      }

      console.log(
        `  Subcollection "${collectionName}/${chatRoomId}/messages": ${snapshot.docs.length} docs`
      );

      for (const docSnap of snapshot.docs) {
        if (processedIds.has(docSnap.id)) continue;
        processedIds.add(docSnap.id);

        const data = docSnap.data();
        if (data.deletedForEveryone === true) continue;

        const message: MessageWithSender = {
          messageId: docSnap.id,
          localId: data.localId,
          chatRoomId: data.chatRoomId || chatRoomId,
          senderId: data.senderId || data.sender || data.userId || "",
          type: data.type || "text",
          text: data.text || data.message || data.content,
          mediaUrl: data.mediaUrl || data.media || data.imageUrl,
          thumbnailUrl: data.thumbnailUrl || data.thumbnail,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType || data.mime,
          duration: data.duration,
          replyToMessageId: data.replyToMessageId || data.replyTo,
          replyToSenderId: data.replyToSenderId,
          replyPreview: data.replyPreview,
          status: data.status || "sent",
          reactions: data.reactions,
          timestamp: timestampToISO(data.timestamp || data.createdAt),
          editedAt: data.editedAt ? timestampToISO(data.editedAt) : undefined,
          deletedAt: data.deletedAt ? timestampToISO(data.deletedAt) : undefined,
          deletedForEveryone: data.deletedForEveryone || false,
          jobId: data.jobId,
          metadata: data.metadata,
          createdAt: timestampToISO(data.createdAt || data.timestamp),
          updatedAt: timestampToISO(data.updatedAt || data.timestamp),
        };

        // Get sender info
        if (message.senderId) {
          message.sender = await getUserInfo(message.senderId);
        }

        allMessages.push(message);
      }
    } catch (error: any) {
      // Subcollection might not exist
      console.log(`  Subcollection error: ${error.message}`);
    }
  }

  // Method 2: Try top-level messages collection
  if (allMessages.length === 0) {
    try {
      const messagesRef = collection(db, COLLECTION_NAMES.messages);
      let snapshot;
      try {
        const q = query(
          messagesRef,
          where("chatRoomId", "==", chatRoomId),
          orderBy("timestamp", "asc")
        );
        snapshot = await getDocs(q);
      } catch {
        // Index might not exist, try without orderBy
        try {
          const q = query(
            messagesRef,
            where("chatRoomId", "==", chatRoomId)
          );
          snapshot = await getDocs(q);
        } catch {
          snapshot = await getDocs(messagesRef);
        }
      }

      console.log(`  Top-level messages collection: ${snapshot.docs.length} docs`);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Filter to only this chat room
        if (data.chatRoomId !== chatRoomId) continue;
        if (processedIds.has(docSnap.id)) continue;
        if (data.deletedForEveryone === true) continue;

        processedIds.add(docSnap.id);

        const message: MessageWithSender = {
          messageId: docSnap.id,
          localId: data.localId,
          chatRoomId: data.chatRoomId || chatRoomId,
          senderId: data.senderId || data.sender || data.userId || "",
          type: data.type || "text",
          text: data.text || data.message || data.content,
          mediaUrl: data.mediaUrl || data.media || data.imageUrl,
          thumbnailUrl: data.thumbnailUrl || data.thumbnail,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType || data.mime,
          duration: data.duration,
          replyToMessageId: data.replyToMessageId || data.replyTo,
          replyToSenderId: data.replyToSenderId,
          replyPreview: data.replyPreview,
          status: data.status || "sent",
          reactions: data.reactions,
          timestamp: timestampToISO(data.timestamp || data.createdAt),
          editedAt: data.editedAt ? timestampToISO(data.editedAt) : undefined,
          deletedAt: data.deletedAt ? timestampToISO(data.deletedAt) : undefined,
          deletedForEveryone: data.deletedForEveryone || false,
          jobId: data.jobId,
          metadata: data.metadata,
          createdAt: timestampToISO(data.createdAt || data.timestamp),
          updatedAt: timestampToISO(data.updatedAt || data.timestamp),
        };

        if (message.senderId) {
          message.sender = await getUserInfo(message.senderId);
        }

        allMessages.push(message);
      }
    } catch (error: any) {
      console.warn("Error fetching top-level messages:", error.message);
    }
  }

  // Sort by timestamp
  allMessages.sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  console.log(`Total messages found: ${allMessages.length}`);
  return allMessages;
}

// Send a message
export async function sendMessage(
  chatRoomId: string,
  senderId: string,
  text: string,
  type: Message["type"] = "text"
): Promise<string> {
  // Try to add to subcollection first (most common pattern)
  let messageRef;
  const roomCollection = (await detectRoomCollection(chatRoomId)) || COLLECTION_NAMES.chatRooms[0];

  // Try the detected room collection first, then fall back to others
  const collectionsToTry = [
    roomCollection,
    ...COLLECTION_NAMES.chatRooms.filter((c) => c !== roomCollection),
  ];

  for (const collectionName of collectionsToTry) {
    try {
      // Check if the chat room exists in this collection
      const roomRef = doc(db, collectionName, chatRoomId);
      const roomDoc = await getDoc(roomRef);

      if (roomDoc.exists()) {
        // Add message to subcollection
        const messagesRef = collection(
          db,
          collectionName,
          chatRoomId,
          COLLECTION_NAMES.messages
        );

        const newMessage = {
          chatRoomId,
          senderId,
          type,
          text: type === "text" ? text : undefined,
          status: "sent",
          timestamp: serverTimestamp(),
          deletedForEveryone: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        messageRef = await addDoc(messagesRef, newMessage);

        // Update chat room's last message
        await updateDoc(roomRef, {
          lastMessage: {
            text: type === "text" ? text : undefined,
            type,
            senderId,
            timestamp: serverTimestamp(),
          },
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        console.log(`Message sent to ${collectionName}/${chatRoomId}/messages`);
        break;
      }
    } catch (error) {
      console.warn(`Could not send to ${collectionName}:`, error);
    }
  }

  // Fallback: add to top-level messages collection
  if (!messageRef) {
    const messagesRef = collection(db, COLLECTION_NAMES.messages);
    const newMessage = {
      chatRoomId,
      senderId,
      type,
      text: type === "text" ? text : undefined,
      status: "sent",
      timestamp: serverTimestamp(),
      deletedForEveryone: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    messageRef = await addDoc(messagesRef, newMessage);
    console.log("Message sent to top-level messages collection");

    // Try to update chat room
    for (const collectionName of COLLECTION_NAMES.chatRooms) {
      try {
        const roomRef = doc(db, collectionName, chatRoomId);
        await updateDoc(roomRef, {
          lastMessage: {
            text: type === "text" ? text : undefined,
            type,
            senderId,
          },
          lastMessageAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        break;
      } catch {
        continue;
      }
    }
  }

  return messageRef!.id;
}

// Subscribe to messages in real-time (auto-detect correct storage, but subscribe to ONLY ONE listener)
export function subscribeToMessages(
  chatRoomId: string,
  callback: (messages: MessageWithSender[]) => void
): () => void {
  let innerUnsub: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const roomCollection = await detectRoomCollection(chatRoomId);

    // Prefer subcollection under the detected room collection
    if (roomCollection && !cancelled) {
      try {
        const messagesRef = collection(
          db,
          roomCollection,
          chatRoomId,
          COLLECTION_NAMES.messages
        );
        const q = query(messagesRef, orderBy("timestamp", "asc"));

        innerUnsub = onSnapshot(
          q,
          async (snapshot) => {
            const messages: MessageWithSender[] = [];
            for (const docSnap of snapshot.docs) {
              const data = docSnap.data();
              if (data.deletedForEveryone === true) continue;

              const message: MessageWithSender = {
                messageId: docSnap.id,
                localId: data.localId,
                chatRoomId: data.chatRoomId || chatRoomId,
                senderId: data.senderId || data.sender || data.userId || "",
                type: data.type || "text",
                text: data.text || data.message || data.content,
                mediaUrl: data.mediaUrl || data.media || data.imageUrl,
                thumbnailUrl: data.thumbnailUrl || data.thumbnail,
                fileName: data.fileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType || data.mime,
                duration: data.duration,
                replyToMessageId: data.replyToMessageId || data.replyTo,
                replyToSenderId: data.replyToSenderId,
                replyPreview: data.replyPreview,
                status: data.status || "sent",
                reactions: data.reactions,
                timestamp: timestampToISO(data.timestamp || data.createdAt),
                editedAt: data.editedAt ? timestampToISO(data.editedAt) : undefined,
                deletedAt: data.deletedAt ? timestampToISO(data.deletedAt) : undefined,
                deletedForEveryone: data.deletedForEveryone || false,
                jobId: data.jobId,
                metadata: data.metadata,
                createdAt: timestampToISO(data.createdAt || data.timestamp),
                updatedAt: timestampToISO(data.updatedAt || data.timestamp),
              };

              if (message.senderId) {
                message.sender = await getUserInfo(message.senderId);
              }
              messages.push(message);
            }

            messages.sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            callback(messages);
          },
          async () => {
            // Fall back to one-time fetch
            const msgs = await getMessagesByChatRoomId(chatRoomId);
            callback(msgs);
          }
        );
        return;
      } catch {
        // fall through to top-level
      }
    }

    // Fallback: top-level messages collection filtered by chatRoomId
    if (cancelled) return;
    const messagesRef = collection(db, COLLECTION_NAMES.messages);
    let qTop;
    try {
      qTop = query(
        messagesRef,
        where("chatRoomId", "==", chatRoomId),
        orderBy("timestamp", "asc")
      );
    } catch {
      qTop = query(messagesRef, where("chatRoomId", "==", chatRoomId));
    }

    innerUnsub = onSnapshot(
      qTop,
      async (snapshot) => {
        const messages: MessageWithSender[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (data.deletedForEveryone === true) continue;
          if (data.chatRoomId !== chatRoomId) continue;

          const message: MessageWithSender = {
            messageId: docSnap.id,
            localId: data.localId,
            chatRoomId: data.chatRoomId || chatRoomId,
            senderId: data.senderId || data.sender || data.userId || "",
            type: data.type || "text",
            text: data.text || data.message || data.content,
            mediaUrl: data.mediaUrl || data.media || data.imageUrl,
            thumbnailUrl: data.thumbnailUrl || data.thumbnail,
            fileName: data.fileName,
            fileSize: data.fileSize,
            mimeType: data.mimeType || data.mime,
            duration: data.duration,
            replyToMessageId: data.replyToMessageId || data.replyTo,
            replyToSenderId: data.replyToSenderId,
            replyPreview: data.replyPreview,
            status: data.status || "sent",
            reactions: data.reactions,
            timestamp: timestampToISO(data.timestamp || data.createdAt),
            editedAt: data.editedAt ? timestampToISO(data.editedAt) : undefined,
            deletedAt: data.deletedAt ? timestampToISO(data.deletedAt) : undefined,
            deletedForEveryone: data.deletedForEveryone || false,
            jobId: data.jobId,
            metadata: data.metadata,
            createdAt: timestampToISO(data.createdAt || data.timestamp),
            updatedAt: timestampToISO(data.updatedAt || data.timestamp),
          };

          if (message.senderId) {
            message.sender = await getUserInfo(message.senderId);
          }
          messages.push(message);
        }

        messages.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        callback(messages);
      },
      async () => {
        const msgs = await getMessagesByChatRoomId(chatRoomId);
        callback(msgs);
      }
    );
  })();

  return () => {
    cancelled = true;
    if (innerUnsub) innerUnsub();
  };
}

// Subscribe to chat rooms in real-time (auto-detect correct storage, but subscribe to ONLY ONE listener)
export function subscribeToChatRooms(
  userId: string,
  callback: (rooms: ChatRoomWithParticipants[]) => void
): () => void {
  let innerUnsub: (() => void) | null = null;
  let cancelled = false;

  (async () => {
    const collectionName = await detectChatRoomsCollectionForUser(userId);
    if (cancelled) return;

    const chatRoomsRef = collection(db, collectionName);

    // Try participantIds first; fall back to participants; finally fall back to unfiltered + client filter
    const tryQueries = async () => {
      try {
        return query(chatRoomsRef, where("participantIds", "array-contains", userId));
      } catch {
        // ignore
      }
      try {
        return query(chatRoomsRef, where("participants", "array-contains", userId));
      } catch {
        // ignore
      }
      return query(chatRoomsRef);
    };

    const q = await tryQueries();

    innerUnsub = onSnapshot(
      q,
      async (snapshot) => {
        const rooms: ChatRoomWithParticipants[] = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const participantIds = extractParticipantIds(data);
          if (!participantIds.includes(userId)) continue;

          let lastMessage: Message | undefined;
          if (data.lastMessage) {
            const lm = data.lastMessage;
            lastMessage = {
              messageId: lm.messageId || lm.id || `last-${docSnap.id}`,
              chatRoomId: docSnap.id,
              senderId: lm.senderId || lm.sender || "",
              type: lm.type || "text",
              text: lm.text || lm.message || lm.content || "",
              status: lm.status || "sent",
              timestamp: timestampToISO(lm.timestamp || lm.createdAt),
              deletedForEveryone: lm.deletedForEveryone || false,
              createdAt: timestampToISO(lm.createdAt),
              updatedAt: timestampToISO(lm.updatedAt),
            };
          } else if (data.lastMessageText) {
            lastMessage = {
              messageId: `last-${docSnap.id}`,
              chatRoomId: docSnap.id,
              senderId: data.lastMessageSenderId || "",
              type: "text",
              text: data.lastMessageText,
              status: "sent",
              timestamp: timestampToISO(data.lastMessageAt || data.updatedAt),
              deletedForEveryone: false,
              createdAt: timestampToISO(data.lastMessageAt || data.updatedAt),
              updatedAt: timestampToISO(data.lastMessageAt || data.updatedAt),
            };
          }

          const room: ChatRoomWithParticipants = {
            chatRoomId: docSnap.id,
            participantIds,
            lastMessage,
            lastMessageAt: timestampToISO(
              data.lastMessageAt || data.lastMessageTime || data.updatedAt
            ),
            jobId: data.jobId || data.taskId,
            createdAt: timestampToISO(data.createdAt),
            updatedAt: timestampToISO(data.updatedAt),
            unreadCount:
              typeof data.unreadCount === "object"
                ? data.unreadCount?.[userId] || 0
                : data.unreadCount || 0,
          };

          const otherParticipantId = participantIds.find((id) => id !== userId);
          if (otherParticipantId) {
            room.otherParticipant = await getUserInfo(otherParticipantId);
          }

          rooms.push(room);
        }

        rooms.sort((a, b) => {
          const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return dateB - dateA;
        });

        callback(rooms);
      },
      async () => {
        const rooms = await getChatRoomsByUserId(userId);
        callback(rooms);
      }
    );
  })();

  return () => {
    cancelled = true;
    if (innerUnsub) innerUnsub();
  };
}

// Create or get existing chat room
export async function getOrCreateChatRoom(
  participantIds: string[],
  jobId?: string
): Promise<string> {
  const sortedIds = [...participantIds].sort();

  // Try to find existing chat room
  for (const collectionName of COLLECTION_NAMES.chatRooms) {
    try {
      const chatRoomsRef = collection(db, collectionName);
      let snapshot;
      try {
        snapshot = await getDocs(
          query(chatRoomsRef, where("participantIds", "array-contains", sortedIds[0]))
        );
      } catch {
        try {
          snapshot = await getDocs(
            query(chatRoomsRef, where("participants", "array-contains", sortedIds[0]))
          );
        } catch {
          snapshot = await getDocs(query(chatRoomsRef, limit(50)));
        }
      }

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const roomIds = extractParticipantIds(data).sort();

        if (
          roomIds.length === sortedIds.length &&
          roomIds.every((id, index) => id === sortedIds[index])
        ) {
          console.log(`Found existing chat room: ${docSnap.id}`);
          return docSnap.id;
        }
      }
    } catch {
      continue;
    }
  }

  // Create new chat room in the first WRITABLE collection (your rules allow chat_rooms)
  const orderedForCreate = [
    "chat_rooms",
    ...COLLECTION_NAMES.chatRooms.filter((c) => c !== "chat_rooms"),
  ];

  const newRoomBase = {
    // Write both fields so web/app can both find it
    participantIds: sortedIds,
    participants: sortedIds,
    jobId: jobId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  };

  for (const collectionName of orderedForCreate) {
    try {
      const chatRoomsRef = collection(db, collectionName);
      const docRef = await addDoc(chatRoomsRef, newRoomBase);
      console.log(`Created new chat room: ${docRef.id} in ${collectionName}`);
      return docRef.id;
    } catch (e) {
      continue;
    }
  }

  throw new Error("Unable to create chat room (missing permissions).");
}
