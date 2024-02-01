import { TX_COLLECTION_NAME, UserData, isLocal, redis } from "~~/utils/constants";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" }); // 405 Method Not Allowed
    return;
  }

  const { user } = req.body;
  if (isLocal) {
    const currentUser: any = UserData[user];
    console.log(`n-🔴 => handler => currentUser:`, currentUser);
    res.status(200).json({ user: currentUser ? currentUser : [] });
  } else {
    const currentUser: any = await redis.hget(TX_COLLECTION_NAME, user);
    res.status(200).json({ user: currentUser ? currentUser : [] });
  }
}
