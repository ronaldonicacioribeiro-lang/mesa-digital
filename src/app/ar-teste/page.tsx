import { notFound } from "next/navigation";
import { devToolsEnabled } from "@/lib/devtools";
import { DishModelViewer } from "@/components/DishModelViewer";

// Ferramenta de desenvolvimento: testa o visualizador 3D e a realidade aumentada com um cubo
// (NÃO é um prato). Só existe em modo dev. Os pratos reais usam o modelo cadastrado em cada item.
export default function Page() {
  if (!devToolsEnabled()) notFound();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 bg-neutral-950 p-4 text-white">
      <h1 className="text-xl font-bold">Teste de realidade aumentada</h1>
      <p className="text-sm text-white/70">
        Cubo laranja de 15 cm, só para testar o recurso. Não é um prato.
      </p>
      <DishModelViewer
        glb="/modelos/teste-cubo.glb"
        name="cubo de teste"
        colors={{ primary: "#c8102e", secondary: "#ffc72c" }}
      />
    </main>
  );
}
