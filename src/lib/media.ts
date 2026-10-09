// Mídia dos pratos (foto, vídeo, modelo 3D): onde pode ficar e como montar os endereços otimizados.

const cloudName = () => process.env.CLOUDINARY_CLOUD_NAME ?? "";

export const mediaConfigured = () =>
  Boolean(cloudName() && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Só aceita arquivos da nossa pasta pública ou da nossa conta do Cloudinary.
// Impede que alguém grave um endereço qualquer (ou "javascript:") num prato.
export function isAllowedMediaUrl(url: string): boolean {
  if (!url) return true;
  if (url.startsWith("/pratos/") || url.startsWith("/modelos/")) return !url.includes("..");
  const cloud = cloudName();
  return Boolean(cloud) && url.startsWith(`https://res.cloudinary.com/${cloud}/`);
}
