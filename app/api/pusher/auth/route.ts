import { NextResponse } from "next/server"
import { pusherServer } from "@/lib/pusher-server"

export async function POST(request: Request) {
  let socket_id: string | null = null;
  let channel_name: string | null = null;
  try {
    // Pusher client sends auth request as form data
    const formData = await request.formData()
    socket_id = formData.get("socket_id") as string | null
    channel_name = formData.get("channel_name") as string | null

    console.log(`[Pusher Auth] Received auth request: socket_id=${socket_id}, channel_name=${channel_name}`);

    if (!socket_id || !channel_name) {
      console.error("[Pusher Auth] Missing required parameters:", { socket_id, channel_name })
      return new NextResponse(JSON.stringify({ error: "Missing socket_id or channel_name" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Ensure this is a private channel
    if (!channel_name.startsWith('private-')) {
      console.error("[Pusher Auth] Attempted to authenticate non-private channel:", channel_name)
      return new NextResponse(JSON.stringify({ error: "Only private channels require authentication" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    
    console.log(`[Pusher Auth] Authorizing client ${socket_id} for channel: ${channel_name}`)
    
    try {
      // No user data needed for simple private channel authorization
      const authResponse = pusherServer.authorizeChannel(socket_id, channel_name)
      console.log(`[Pusher Auth] Successfully authorized channel: ${channel_name} for socket ${socket_id}`)
      return NextResponse.json(authResponse)
    } catch (pusherError) {
      console.error("[Pusher Auth] Error authorizing channel:", { 
        channel: channel_name, 
        socket: socket_id, 
        error: pusherError 
      });
      return new NextResponse(JSON.stringify({ 
        error: "Pusher authorization failed",
        details: pusherError instanceof Error ? pusherError.message : "Unknown Pusher error"
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error("[Pusher Auth] Error processing auth request:", { 
      channel: channel_name, 
      socket: socket_id, 
      error: error 
    });
    return new NextResponse(JSON.stringify({ 
      error: "Authentication processing failed",
      details: error instanceof Error ? error.message : "Unknown error"
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
