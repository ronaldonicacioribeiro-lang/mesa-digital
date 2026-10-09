// As páginas de teste (/placas, /feedbacks, /ar-teste) listam dados sensíveis (tokens das mesas e
// feedbacks). Ficam sempre ligadas no modo dev. Em produção só abrem se ENABLE_DEV_TOOLS=true.
// Quando o painel do dono (Fase 7) existir, essas páginas deixam de ser necessárias.
export const devToolsEnabled = () =>
  process.env.NODE_ENV !== "production" || process.env.ENABLE_DEV_TOOLS === "true";
