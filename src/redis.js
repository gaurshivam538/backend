import { Redis } from '@upstash/redis'
// import { createClient } from "redis";

// const client = createClient({
//   url: process.env.UPSTASH_REDIS_REST_URL,
// });

const client = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

// client.on("connect", () => {
//   console.log(" Redis connected");
// });

// client.on("error", (err) => {
//   console.error("❌ Redis error:", err);
// });
// const connectRedis = async () => {
//   await client.connect();
// };

// export { connectRedis };
export default client;

