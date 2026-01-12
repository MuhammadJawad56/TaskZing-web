"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/firebase/AuthContext";
import { ChatRoomWithParticipants, MessageWithSender } from "@/lib/types/message";
import { cn } from "@/lib/utils/cn";
import {
  getChatRoomsByUserId,
  getMessagesByChatRoomId,
  sendMessage,
  subscribeToMessages,
  subscribeToChatRooms,
  diagnoseFirebaseCollections,
} from "@/lib/firebase/messages";
import { Send, RefreshCw, AlertCircle, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoomWithParticipants[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Refs to track subscription state
  const chatRoomsUnsubRef = useRef<(() => void) | null>(null);
  const messagesUnsubRef = useRef<(() => void) | null>(null);
  const isSubscribedRef = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load chat rooms using one-time fetch (avoid subscription conflicts)
  const loadChatRooms = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      console.log("Loading chat rooms for user:", user.uid);
      
      const rooms = await getChatRoomsByUserId(user.uid);
      console.log("Loaded chat rooms:", rooms);
      
      setChatRooms(rooms);
      
      if (rooms.length > 0 && !selectedRoom) {
        setSelectedRoom(rooms[0].chatRoomId);
      }
    } catch (err: any) {
      console.error("Error loading chat rooms:", err);
      setError(`Failed to load conversations: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedRoom]);

  // Initial load of chat rooms
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setIsLoading(false);
      setError("Please log in to view messages");
      return;
    }

    loadChatRooms();
  }, [user, authLoading, loadChatRooms]);

  // Set up real-time subscription for chat rooms (single subscription)
  useEffect(() => {
    if (!user || isSubscribedRef.current) return;

    console.log("Setting up chat rooms subscription for user:", user.uid);
    isSubscribedRef.current = true;
    
    // Clean up any existing subscription
    if (chatRoomsUnsubRef.current) {
      chatRoomsUnsubRef.current();
    }

    chatRoomsUnsubRef.current = subscribeToChatRooms(user.uid, (rooms) => {
      console.log("Received chat rooms update:", rooms.length, "rooms");
      setChatRooms(rooms);
      setIsLoading(false);
      setError(null);
    });

    return () => {
      if (chatRoomsUnsubRef.current) {
        chatRoomsUnsubRef.current();
        chatRoomsUnsubRef.current = null;
      }
      isSubscribedRef.current = false;
    };
  }, [user?.uid]);

  // Load messages when room is selected
  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }

    // Clean up existing messages subscription
    if (messagesUnsubRef.current) {
      messagesUnsubRef.current();
      messagesUnsubRef.current = null;
    }

    console.log("Setting up messages subscription for room:", selectedRoom);
    
    // First, load messages with a one-time fetch
    getMessagesByChatRoomId(selectedRoom)
      .then((msgs) => {
        console.log("Loaded messages:", msgs.length);
        setMessages(msgs);
      })
      .catch((err) => {
        console.error("Error loading messages:", err);
      });

    // Then set up real-time subscription
    messagesUnsubRef.current = subscribeToMessages(selectedRoom, (msgs) => {
      console.log("Received messages update:", msgs.length, "messages");
      setMessages(msgs);
    });

    return () => {
      if (messagesUnsubRef.current) {
        messagesUnsubRef.current();
        messagesUnsubRef.current = null;
      }
    };
  }, [selectedRoom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(selectedRoom, user.uid, newMessage.trim());
      setNewMessage("");
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleDiagnose = async () => {
    if (!user) return;
    
    try {
      setDebugInfo("Running diagnostics...");
      const result = await diagnoseFirebaseCollections(user.uid);
      setDebugInfo(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setDebugInfo(`Diagnostic error: ${err.message}`);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return date.toLocaleDateString("en-US", { weekday: "short" });
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      return "";
    }
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const selectedRoomData = chatRooms.find((r) => r.chatRoomId === selectedRoom);

  // Show loading state during auth check
  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
          <AlertCircle className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Please Log In
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            You need to be logged in to view your messages
          </p>
          <Link
            href="/login"
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={loadChatRooms}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
          </button>
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={handleDiagnose}
              className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded"
            >
              Debug
            </button>
          )}
        </div>
      </div>

      {/* Debug Info */}
      {debugInfo && (
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Debug Info</span>
            <button
              onClick={() => setDebugInfo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-40">
            {debugInfo}
          </pre>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Chat List */}
        <div className="lg:col-span-1 bg-white dark:bg-darkBlue-003 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading conversations...</p>
              </div>
            ) : chatRooms.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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
                    "w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0",
                    selectedRoom === room.chatRoomId && "bg-red-50 dark:bg-red-900/20"
                  )}
                >
                  {/* Profile Picture */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {room.otherParticipant?.photoUrl ? (
                        <img
                          src={room.otherParticipant.photoUrl}
                          alt={room.otherParticipant.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 font-semibold text-lg">
                          {(room.otherParticipant?.fullName || "U").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {room.unreadCount && room.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {room.unreadCount > 9 ? "9+" : room.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Name and Message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {room.otherParticipant?.fullName || "Unknown User"}
                      </p>
                      {room.lastMessageAt && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                          {formatTime(room.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    {room.lastMessage?.text && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {room.lastMessage.text}
                      </p>
                    )}
                  </div>
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    {selectedRoomData.otherParticipant?.photoUrl ? (
                      <img
                        src={selectedRoomData.otherParticipant.photoUrl}
                        alt={selectedRoomData.otherParticipant.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 font-semibold">
                        {(selectedRoomData.otherParticipant?.fullName || "U").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {selectedRoomData.otherParticipant?.fullName || "Unknown User"}
                    </p>
                    {selectedRoomData.jobId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Task: {selectedRoomData.jobId}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Start the conversation!
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => {
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
                              "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                              isOwn
                                ? "bg-red-500 text-white rounded-br-md"
                                : "bg-white dark:bg-darkBlue-003 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-bl-md"
                            )}
                          >
                            {!isOwn && message.sender && (
                              <p className="text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
                                {message.sender.fullName}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.text}
                            </p>
                            {message.mediaUrl && (
                              <div className="mt-2">
                                <img
                                  src={message.mediaUrl}
                                  alt="Media"
                                  className="max-w-full rounded-lg"
                                />
                              </div>
                            )}
                            <p
                              className={cn(
                                "text-xs mt-1 flex items-center gap-1",
                                isOwn ? "text-red-100" : "text-gray-400 dark:text-gray-500"
                              )}
                            >
                              {formatMessageTime(message.timestamp)}
                              {isOwn && message.status && (
                                <span className="ml-1">
                                  {message.status === "sent" && "✓"}
                                  {message.status === "delivered" && "✓✓"}
                                  {message.status === "read" && "✓✓"}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBlue-003">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-800 dark:text-white placeholder-gray-400"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className={cn(
                      "p-3 rounded-full transition-all duration-200",
                      newMessage.trim() && !isSending
                        ? "bg-red-500 text-white hover:bg-red-600 shadow-lg hover:shadow-xl"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {isSending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8">
              <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Choose a chat from the list to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
