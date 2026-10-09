import { Schema, model, models, type InferSchemaType } from "mongoose";

// Um chamado de uma mesa: "chamar garçom" ou "pedir a conta".
// Estados: waiting (aguardando) -> attending (em atendimento) -> done (atendido) | canceled.
const ServiceCallSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableNumber: { type: Number, required: true },
    type: { type: String, enum: ["waiter", "bill"], required: true },
    billMethod: { type: String, enum: ["", "pix", "card", "cash"], default: "" },
    status: { type: String, enum: ["waiting", "attending", "done", "canceled"], default: "waiting" },
    attendedAt: { type: Date, default: null },
    attendedBy: { type: String, default: "" },
    doneAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ServiceCallSchema.index({ restaurant: 1, status: 1, createdAt: 1 });
ServiceCallSchema.index({ restaurant: 1, tableNumber: 1, createdAt: -1 });

export type ServiceCallDoc = InferSchemaType<typeof ServiceCallSchema>;
export const ServiceCall = models.ServiceCall || model("ServiceCall", ServiceCallSchema);
