import { Schema, model, models, type InferSchemaType } from "mongoose";

// Uma mesa. O `token` é o código secreto do link/QR da mesa e pode ser trocado
// a qualquer momento sem mudar o número da mesa.
const TableSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    number: { type: Number, required: true },
    token: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

TableSchema.index({ restaurant: 1, number: 1 }, { unique: true });

export type TableDoc = InferSchemaType<typeof TableSchema>;
export const Table = models.Table || model("Table", TableSchema);
