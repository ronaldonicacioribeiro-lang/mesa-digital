import { Schema, model, models, type InferSchemaType } from "mongoose";

// Cliente do cartão fidelidade de UM restaurante. Dados pessoais: guardar o mínimo (LGPD).
const CustomerSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true, maxlength: 60 },
    email: { type: String, required: true, maxlength: 120 },
    emailLower: { type: String, required: true },
    // Prova do consentimento: quando e qual versão da política a pessoa aceitou.
    consentAt: { type: Date, required: true },
    consentVersion: { type: String, required: true },
    // O celular guarda o código; aqui fica só o "embaralhado" dele.
    cardTokenHash: { type: String, required: true, unique: true },
    stamps: { type: Number, default: 0 },
    lastStampDay: { type: String, default: "" }, // AAAA-MM-DD (horário de Brasília)
    totalRedeemed: { type: Number, default: 0 },
    // Proteção contra tentar adivinhar o PIN do atendente.
    pinFails: { type: Number, default: 0 },
    pinLockedUntil: { type: Date, default: null },
    rateKey: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

CustomerSchema.index({ restaurant: 1, emailLower: 1 }, { unique: true });

export type CustomerDoc = InferSchemaType<typeof CustomerSchema>;
export const Customer = models.Customer || model("Customer", CustomerSchema);
