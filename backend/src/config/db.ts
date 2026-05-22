import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectMongo(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  const conn = await mongoose.connect(env.MONGODB_URI);
  // eslint-disable-next-line no-console
  console.log(`Mongo connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
