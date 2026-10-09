import { Schema, model, models, type InferSchemaType } from "mongoose";

// Um item do cardápio. Preços em centavos (inteiro), para evitar erro de arredondamento.
const MenuItemSchema = new Schema(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true, index: true },
    category: { type: String, required: true },
    categoryOrder: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    priceCents: { type: Number, required: true },
    promoPriceCents: { type: Number, default: null },
    featured: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
    imageUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    posterUrl: { type: String, default: "" },
    // Modelo 3D para realidade aumentada: GLB (Android e visualizador) e USDZ (iPhone, opcional).
    modelGlbUrl: { type: String, default: "" },
    modelUsdzUrl: { type: String, default: "" },
  },
  { timestamps: true },
);

export type MenuItemDoc = InferSchemaType<typeof MenuItemSchema>;
export const MenuItem = models.MenuItem || model("MenuItem", MenuItemSchema);
