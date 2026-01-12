import { NextResponse } from "next/server";
import {
  getChatRoomsByUserId,
  getMessagesByChatRoomId,
} from "@/lib/firebase/messages";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const chatRoomId = searchParams.get("chatRoomId");

    if (chatRoomId) {
      // Return messages for specific chat room
      const messages = await getMessagesByChatRoomId(chatRoomId);
      return NextResponse.json(messages);
    }

    if (userId) {
      // Return chat rooms for user
      const userRooms = await getChatRoomsByUserId(userId);
      return NextResponse.json(userRooms);
    }

    return NextResponse.json(
      { error: "Missing userId or chatRoomId parameter" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
