"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { ChatRoomWithParticipants, MessageWithSender } from "@/lib/types/message";
import { cn } from "@/lib/utils/cn";
import {
  getChatRoomsByUserId,
  getMessagesByChatRoomId,
  sendMessage,
  subscribeToMessages,
  subscribeToChatRooms,
} from "@/lib/firebase/messages";
import { Send } from "lucide-react";

export default function MessagesPage() {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithParticipants[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Load chat rooms
  useEffect(() => {
    if (user) {
      console.log("User logged in:", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
      loadChatRooms();
    } else {
      console.log("No user logged in");
      setIsLoading(false);
    }
  }, [user]);

  // Subscribe to real-time chat rooms updates
  useEffect(() => {
    if (!user) {
      console.log("No user, skipping subscription");
      return;
    }

    console.log("Setting up chat rooms subscription for user:", user.uid);
    const unsubscribe = subscribeToChatRooms(user.uid, (rooms) => {
      console.log("Chat rooms updated via subscription:", rooms.length, rooms);
      setChatRooms(rooms);
      setIsLoading(false);
      if (rooms.length > 0 && !selectedRoom) {
        setSelectedRoom(rooms[0].chatRoomId);
      }
    });

    return () => {
      console.log("Unsubscribing from chat rooms");
      unsubscribe();
    };
  }, [user]);

  // Load messages when room is selected
  useEffect(() => {
    if (selectedRoom) {
      loadMessages();
      
      // Subscribe to real-time messages
      const unsubscribe = subscribeToMessages(selectedRoom, (msgs) => {
        setMessages(msgs);
      });

      return () => unsubscribe();
    }
  }, [selectedRoom]);

  const loadChatRooms = async () => {
    if (!user) {
      console.log("No user found, cannot load chat rooms");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Loading chat rooms for user:", user.uid, user.email);
      
      const rooms = await getChatRoomsByUserId(user.uid);
      console.log("Loaded chat rooms:", rooms);
      setChatRooms(rooms);
      if (rooms.length > 0 && !selectedRoom) {
        setSelectedRoom(rooms[0].chatRoomId);
      }
    } catch (error: any) {
      console.error("Error loading chat rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedRoom) return;

    try {
      const msgs = await getMessagesByChatRoomId(selectedRoom);
      setMessages(msgs);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(selectedRoom, user.uid, newMessage.trim());
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getLastMessageTime = (room: ChatRoomWithParticipants) => {
    if (room.lastMessageAt) {
      return formatTime(room.lastMessageAt);
    }
    return "";
  };

  const selectedRoomData = chatRooms.find((r) => r.chatRoomId === selectedRoom);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Chat List */}
        <div className="lg:col-span-1 bg-white dark:bg-darkBlue-003 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
              </div>
            ) : chatRooms.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 font-medium">No conversations yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Start a conversation from a task or profile
                </p>
              </div>
            ) : (
              chatRooms.map((room) => (
                <button
                  key={room.chatRoomId}
                  onClick={() => setSelectedRoom(room.chatRoomId)}
                  className={cn(
                    "w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3",
                    selectedRoom === room.chatRoomId && "bg-gray-50 dark:bg-gray-800"
                  )}
                >
                  {room.otherParticipant && (
                    <>
                      {/* Profile Picture */}
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                          {room.otherParticipant.photoUrl ? (
                            <img
                              src={room.otherParticipant.photoUrl}
                              alt={room.otherParticipant.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-600 dark:text-gray-400 font-semibold">
                              {room.otherParticipant.fullName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {/* Online status dot */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full border-2 border-white dark:border-darkBlue-003"></div>
                      </div>

                      {/* Name and Message */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {room.otherParticipant.fullName}
                        </p>
                        {room.lastMessage && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5">
                            {room.lastMessage.text || "Media"}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      {room.lastMessageAt && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {getLastMessageTime(room)}
                        </div>
                      )}
                    </>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 flex flex-col bg-white dark:bg-darkBlue-003 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {selectedRoom && selectedRoomData ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                {selectedRoomData.otherParticipant && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {selectedRoomData.otherParticipant.photoUrl ? (
                        <img
                          src={selectedRoomData.otherParticipant.photoUrl}
                          alt={selectedRoomData.otherParticipant.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400 font-semibold">
                          {selectedRoomData.otherParticipant.fullName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {selectedRoomData.otherParticipant.fullName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.senderId === user?.uid;
                    return (
                      <div
                        key={message.messageId}
                        className={cn(
                          "flex",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-4 py-2",
                            isOwn
                              ? "bg-red-500 text-white"
                              : "bg-white dark:bg-darkBlue-003 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                          )}
                        >
                          {!isOwn && message.sender && (
                            <p className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                              {message.sender.fullName}
                            </p>
                          )}
                          <p className="text-sm">{message.text}</p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              isOwn ? "text-red-100" : "text-gray-400 dark:text-gray-500"
                            )}
                          >
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-darkBlue-003 dark:text-white"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      newMessage.trim() && !isSending
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

