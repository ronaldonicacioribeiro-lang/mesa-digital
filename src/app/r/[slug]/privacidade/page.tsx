import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { connectDB } from "@/lib/mongodb";
import { Restaurant } from "@/models/Restaurant";
import { POLICY_VERSION } from "@/lib/loyalty";

export const metadata: Metadata = { title: "Política de privacidade" };

type Params = Promise<{ slug: string }>;

export default function Page({ params }: { params: Params }) {
  return (
    <Suspense fallback={<main className="p-6 text-center text-gray-500">Carregando…</main>}>
      <Politica params={params} />
    </Suspense>
  );
}

async function Politica({ params }: { params: Params }) {
  const { slug } = await params;
  await connection();
  await connectDB();
  const r = await Restaurant.findOne({ slug: slug.toLowerCase(), active: true }).lean();
  if (!r) notFound();

  const h2 = "mt-6 text-lg font-bold";
  const contato = r.contactEmail
    ? `pelo e-mail ${r.contactEmail} ou falando com um atendente`
    : "falando com um atendente";

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 text-[15px] leading-relaxed" style={{ color: r.colors.text }}>
      <h1 className="text-2xl font-bold">Política de privacidade: cartão fidelidade</h1>
      <p className="mt-1 text-sm opacity-60">Versão {POLICY_VERSION}</p>

      <h2 className={h2}>Quem é responsável pelos seus dados</h2>
      <p>
        O responsável (controlador) pelos dados do cartão fidelidade é o estabelecimento <strong>{r.name}</strong>. A
        plataforma Mesa Digital apenas fornece a tecnologia.
      </p>

      <h2 className={h2}>Quais dados coletamos</h2>
      <ul className="list-disc pl-6">
        <li>Seu <strong>nome</strong> e seu <strong>e-mail</strong>, que você digita ao criar o cartão.</li>
        <li>As <strong>datas</strong> em que você registrou carimbos e os prêmios resgatados.</li>
        <li>
          Um <strong>cookie técnico</strong> neste celular, só para reconhecer o seu cartão. Ele não serve para
          propaganda nem rastreamento.
        </li>
      </ul>
      <p className="mt-2">
        Não pedimos CPF, telefone, endereço nem localização. O envio de feedback anônimo não coleta dado pessoal
        nenhum.
      </p>

      <h2 className={h2}>Para que usamos</h2>
      <p>
        Somente para controlar os carimbos e o prêmio do seu cartão fidelidade. <strong>Não enviamos propaganda</strong>,
        não vendemos e não repassamos seus dados para outras empresas com fins comerciais.
      </p>

      <h2 className={h2}>Base legal</h2>
      <p>Seu consentimento, dado ao marcar a caixa de aceite ao criar o cartão (LGPD, art. 7º, inciso I).</p>

      <h2 className={h2}>Com quem os dados ficam</h2>
      <p>
        Os dados ficam guardados em serviços de tecnologia usados para o funcionamento do sistema (hospedagem e banco
        de dados em nuvem). Eles só tratam os dados para armazená-los, por conta do estabelecimento.
      </p>

      <h2 className={h2}>Por quanto tempo guardamos</h2>
      <p>Enquanto o seu cartão existir. Você pode apagá-lo quando quiser, como explicado abaixo.</p>

      <h2 className={h2}>Seus direitos</h2>
      <p>
        Você pode pedir confirmação do tratamento, acesso, correção e eliminação dos seus dados, e revogar o
        consentimento a qualquer momento (LGPD, art. 18). Para <strong>apagar tudo na hora</strong>, abra seu cartão
        e toque em <em>“Apagar meus dados”</em>. Para outros pedidos, fale com o estabelecimento {contato}.
      </p>
    </main>
  );
}
