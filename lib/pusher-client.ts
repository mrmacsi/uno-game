import Pusher from "pusher-js"

let pusherClient: Pusher | null = null;

if (typeof window !== "undefined") {
  pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || "", {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "",
    forceTLS: true,
  });
}

export default pusherClient;
