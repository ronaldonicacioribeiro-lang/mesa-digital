import { Schema, model, models, type InferSchemaType } from "mongoose";

// Um restaurante (cliente do sistema). Tudo que é "marca" fica aqui:
// cores, textos, Instagram, Wi-Fi e link de avaliação do Google.
const RestaurantSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    tagline: { type: String, default: "" },
    logoText: { type: String, default: "" }, // iniciais usadas no logo provisório
    colors: {
      primary: { type: String, default: "#e11d48" },
      secondary: { type: String, default: "#facc15" },
      background: { type: String, default: "#ffffff" },
      text: { type: String, default: "#111827" },
    },
    instagram: { type: String, default: "" },
    googleReviewUrl: { type: String, default: "" },
    wifi: {
      ssid: { type: String, default: "" },
      password: { type: String, default: "" },
    },
    // Cartão fidelidade: quantos carimbos para ganhar e qual é o prêmio.
    loyalty: {
      stampsRequired: { type: Number, default: 9 },
      reward: { type: String, default: "" },
    },
    // PIN do atendente (guardado embaralhado) para confirmar o resgate do prêmio.
    staffPinHash: { type: String, default: "" },
    contactEmail: { type: String, default: "" }, // contato para pedidos de privacidade (LGPD)
    // Validação de presença (opcional): IPs públicos do Wi-Fi do restaurante. Vazio = desligado.
    presence: { allowedIps: { type: [String], default: [] } },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type RestaurantDoc = InferSchemaType<typeof RestaurantSchema>;
export const Restaurant = models.Restaurant || model("Restaurant", RestaurantSchema);
