import { Schema, model, models } from "mongoose";

// Conta tentativas erradas de PIN por pessoa/restaurante, para travar quem tenta adivinhar.
// O registro some sozinho depois de `expiresAt` (índice TTL do MongoDB).
const AuthAttemptSchema = new Schema({
  key: { type: String, required: true, unique: true }, // código embaralhado (IP + restaurante)
  fails: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const AuthAttempt = models.AuthAttempt || model("AuthAttempt", AuthAttemptSchema);
