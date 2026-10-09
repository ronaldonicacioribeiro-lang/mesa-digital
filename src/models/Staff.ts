import { Schema, model, models, type InferSchemaType } from "mongoose";

// Funcionário (garçom) com PIN pessoal. O PIN fica guardado embaralhado, nunca em texto.
const StaffSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    name: { type: String, required: true, maxlength: 40 },
    pinHash: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Cada PIN identifica uma única pessoa dentro do restaurante.
StaffSchema.index({ restaurant: 1, pinHash: 1 }, { unique: true });
StaffSchema.index({ restaurant: 1, name: 1 }, { unique: true });

export type StaffDoc = InferSchemaType<typeof StaffSchema>;
export const Staff = models.Staff || model("Staff", StaffSchema);
