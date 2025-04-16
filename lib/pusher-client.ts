import Pusher from "pusher-js"

// Only initialize Pusher on the client side
const pusherClient =
  typeof window !== "undefined"
    ? new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
      })
    : null

export default pusherClient
