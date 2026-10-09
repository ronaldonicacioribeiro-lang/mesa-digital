// As páginas de teste (hoje só /ar-teste; /placas e /feedbacks foram substituídas pelo painel do dono)
// ficam sempre ligadas no modo dev. Em produção só abrem se ENABLE_DEV_TOOLS=true.
export const devToolsEnabled = () =>
  process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_TOOLS === "true";
