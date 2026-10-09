// Foto do prato. Sem foto cadastrada, mostra uma imagem provisória com a cor do restaurante.
type Props = {
  src: string;
  name: string;
  primary: string;
  secondary: string;
  className?: string;
};

export function DishImage({ src, name, primary, secondary, className = "" }: Props) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} loading="lazy" className={`object-cover ${className}`} />;
  }
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
      role="img"
      aria-label={name}
    >
      <span className="select-none text-5xl font-bold text-white/80 drop-shadow">{name.charAt(0)}</span>
    </div>
  );
}
