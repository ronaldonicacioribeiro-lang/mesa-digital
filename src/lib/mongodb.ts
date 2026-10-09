import mongoose from "mongoose";

// Reaproveita a conexão entre requisições (e entre recarregamentos do modo dev),
// para não abrir uma conexão nova a cada página.
type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalCache = globalThis as unknown as { _mongoose?: Cache };
const cache: Cache = (globalCache._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Defina MONGODB_URI no arquivo .env.local");

  if (cache.conn) return cache.conn;
  cache.promise ??= mongoose.connect(uri, { bufferCommands: false });
  cache.conn = await cache.promise;
  return cache.conn;
}
