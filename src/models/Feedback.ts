import { Schema, model, models, type InferSchemaType } from "mongoose";

// Feedback ANÔNIMO: de propósito não guarda mesa, nome, IP nem nada que identifique quem enviou.
// `rateKey` é só um código embaralhado (IP + restaurante + dia) usado para limitar envios repetidos.
const FeedbackSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    message: { type: String, required: true, maxlength: 1000 },
    photo: { type: String, default: "" }, // imagem pequena (JPEG) em data URL
    read: { type: Boolean, default: false },
    rateKey: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

export type FeedbackDoc = InferSchemaType<typeof FeedbackSchema>;
export const Feedback = models.Feedback || model("Feedback", FeedbackSchema);
