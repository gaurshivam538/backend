import { createClient } from "redis";

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on("connect", () => {
  console.log(" Redis connected");
});

client.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

const connectRedis = async () => {
  await client.connect();
};

export { connectRedis };
export default client;
