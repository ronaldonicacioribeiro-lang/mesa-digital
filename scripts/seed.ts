// Carrega dois restaurantes FICTÍCIOS (uma hamburgueria e um restaurante).
// Rodar: npm run seed   (pode rodar várias vezes: não duplica e mantém os tokens das mesas)
import { randomBytes } from "node:crypto";
import { scryptSync } from "node:crypto";
import mongoose from "mongoose";
import { Restaurant } from "../src/models/Restaurant";
import { Table } from "../src/models/Table";
import { MenuItem } from "../src/models/MenuItem";
import { Staff } from "../src/models/Staff";

type Item = {
  category: string;
  name: string;
  description: string;
  price: number; // em reais
  promo?: number;
  featured?: boolean;
  available?: boolean;
  // Mídia opcional, arquivos dentro de public/. Ex.: image: "/pratos/brasa-classico.jpg"
  image?: string;
  video?: string;
  poster?: string;
  // Modelo 3D (AR). Ex.: model: "/modelos/brasa-classico.glb", modelUsdz: "/modelos/brasa-classico.usdz"
  model?: string;
  modelUsdz?: string;
};

const restaurants = [
  {
    slug: "brasa-e-bun",
    name: "Brasa & Bun",
    tagline: "Hambúrguer artesanal na brasa",
    logoText: "B&B",
    colors: { primary: "#c8102e", secondary: "#ffc72c", background: "#fff8ec", text: "#2b1a14" },
    instagram: "https://instagram.com/brasaebun.exemplo",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=EXEMPLO",
    wifi: { ssid: "BrasaBun_Clientes", password: "burger2026" },
    loyalty: { stampsRequired: 9, reward: "Um brownie com sorvete por conta da casa" },
    contactEmail: "contato@brasaebun.exemplo",
    tables: 12,
    // Garçons de DEMONSTRAÇÃO (PIN pessoal). Num cliente real, cadastre os funcionários verdadeiros.
    staff: [
      { name: "Carlos", pin: "1111" },
      { name: "Ana", pin: "2222" },
    ],
    items: [
      { category: "Hambúrgueres", name: "Brasa Clássico", description: "Blend 160 g, queijo prato, alface, tomate e molho da casa.", price: 32, featured: true },
      { category: "Hambúrgueres", name: "Duplo Cheddar Bacon", description: "Dois blends de 120 g, cheddar cremoso, bacon crocante e cebola caramelizada.", price: 44, promo: 39.9, featured: true },
      { category: "Hambúrgueres", name: "Smoky BBQ", description: "Blend 160 g, barbecue defumado, onion rings e queijo provolone.", price: 38 },
      { category: "Hambúrgueres", name: "Veggie Grill", description: "Burger de grão-de-bico, rúcula, tomate seco e maionese de ervas.", price: 34 },
      { category: "Porções", name: "Batata Rústica", description: "Batatas com casca, alho e páprica. Serve 2 pessoas.", price: 24 },
      { category: "Porções", name: "Onion Rings", description: "Anéis de cebola empanados, com molho ranch.", price: 22, available: false },
      { category: "Bebidas", name: "Refrigerante lata", description: "Cola, guaraná ou limão. 350 ml.", price: 7 },
      { category: "Bebidas", name: "Milkshake de Doce de Leite", description: "Sorvete de creme, doce de leite e chantilly. 400 ml.", price: 21, promo: 18 },
      { category: "Sobremesas", name: "Brownie com Sorvete", description: "Brownie quentinho com sorvete de creme e calda de chocolate.", price: 19, featured: true },
    ] as Item[],
  },
  {
    slug: "villa-verde",
    name: "Villa Verde",
    tagline: "Cozinha de raiz, feita com calma",
    logoText: "VV",
    colors: { primary: "#1f4d3a", secondary: "#c9a24b", background: "#f6f3ea", text: "#1d2a24" },
    instagram: "https://instagram.com/villaverde.exemplo",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=EXEMPLO",
    wifi: { ssid: "VillaVerde_Guest", password: "sabor2026" },
    loyalty: { stampsRequired: 9, reward: "Uma sobremesa à escolha por conta da casa" },
    contactEmail: "contato@villaverde.exemplo",
    tables: 20,
    staff: [
      { name: "Marcos", pin: "3333" },
      { name: "Júlia", pin: "4444" },
    ],
    items: [
      { category: "Entradas", name: "Bruschetta de Tomate", description: "Pão italiano, tomate fresco, manjericão e azeite extravirgem.", price: 28 },
      { category: "Entradas", name: "Carpaccio de Carne", description: "Lâminas de filé, rúcula, parmesão e alcaparras.", price: 46, featured: true },
      { category: "Pratos principais", name: "Risoto de Cogumelos", description: "Arroz arbóreo, mix de cogumelos frescos e parmesão.", price: 62, featured: true },
      { category: "Pratos principais", name: "Filé ao Molho Madeira", description: "Filé mignon grelhado, molho madeira, purê de batata e legumes.", price: 78, promo: 69.9 },
      { category: "Pratos principais", name: "Salmão Grelhado", description: "Salmão com crosta de ervas, arroz de amêndoas e aspargos.", price: 84 },
      { category: "Pratos principais", name: "Massa ao Pesto", description: "Fettuccine artesanal, pesto de manjericão e tomate cereja.", price: 52, available: false },
      // Pizza de DEMONSTRAÇÃO com foto, vídeo e modelo 3D de verdade (arquivos em public/).
      {
        category: "Pizzas",
        name: "Pizza Calabresa",
        description: "Mussarela, fatias de calabresa e cebola, finalizada com orégano. Borda alta, assada no forno.",
        price: 58,
        featured: true,
        image: "/pratos/pizza-calabresa.jpg",
        video: "/pratos/pizza-calabresa.mp4",
        poster: "/pratos/pizza-calabresa-poster.jpg",
        model: "/modelos/pizza-calabresa.glb",
      },
      { category: "Sobremesas", name: "Petit Gâteau", description: "Bolinho de chocolate com sorvete de baunilha.", price: 30, featured: true },
      { category: "Bebidas", name: "Suco natural", description: "Laranja, limão ou maracujá. 400 ml.", price: 12 },
      { category: "Bebidas", name: "Vinho da casa (taça)", description: "Tinto ou branco, seleção do sommelier.", price: 26 },
    ] as Item[],
  },
];

const hashPin = (pin: string, slug: string) => scryptSync(pin, `pin:${slug}`, 32).toString("hex");

// Senha do painel do dono: NUNCA fica escrita no código (o repositório é público). O seed gera uma senha
// aleatória e mostra no terminal uma única vez; anote. Para escolher a sua, defina a variável de ambiente
// DEMO_OWNER_PASSWORD_BRASA_E_BUN (ou _VILLA_VERDE). O dono pode trocá-la depois no painel (Ajustes).
const hashPassword = (pw: string) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
};
function novaSenhaDoDono(slug: string) {
  const fixa = process.env[`DEMO_OWNER_PASSWORD_${slug.toUpperCase().replace(/-/g, "_")}`];
  const senha = fixa ?? randomBytes(9).toString("base64url");
  console.log(`  senha do painel do dono de "${slug}": ${senha}   (anote agora${fixa ? "" : "; não será mostrada de novo"})`);
  return hashPassword(senha);
}

// Por padrão o seed NÃO mexe em restaurante que já existe (para não apagar o que o dono editou no painel).
// Para voltar um restaurante de exemplo ao estado original:  npm run seed -- --reset
const RESET = process.argv.includes("--reset");

const novoToken = () => randomBytes(9).toString("base64url"); // 12 caracteres, difícil de adivinhar

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Defina MONGODB_URI no arquivo .env.local");
  await mongoose.connect(uri);

  for (const r of restaurants) {
    const { tables, items, staff, ...dados } = r;
    const existing = await Restaurant.findOne({ slug: dados.slug }).lean();

    // Restaurante já existe e não pediram --reset: só garante o que faltar, sem sobrescrever nada.
    if (existing && !RESET) {
      if (!existing.ownerPasswordHash) {
        await Restaurant.updateOne(
          { _id: existing._id },
          { $set: { ownerPasswordHash: novaSenhaDoDono(dados.slug) } },
        );
        console.log(`• ${existing.name}: senha do painel do dono definida`);
      }
      for (const s of staff) {
        await Staff.updateOne(
          { restaurant: existing._id, name: s.name },
          { $setOnInsert: { pinHash: hashPin(s.pin, dados.slug), active: true } },
          { upsert: true },
        );
      }
      console.log(`✔ ${existing.name}: já existe, mantido como está (use --reset para recriar)`);
      continue;
    }

    const rest = await Restaurant.findOneAndUpdate(
      { slug: dados.slug },
      { ...dados, ownerPasswordHash: novaSenhaDoDono(dados.slug) },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    // Mesas: cria só as que faltam (mantém o token das que já existem).
    for (let n = 1; n <= tables; n++) {
      await Table.updateOne(
        { restaurant: rest._id, number: n },
        { $setOnInsert: { token: novoToken(), active: true } },
        { upsert: true },
      );
    }

    // Garçons: cria ou atualiza pelo nome (o PIN fica guardado embaralhado).
    for (const s of staff) {
      await Staff.updateOne(
        { restaurant: rest._id, name: s.name },
        { $set: { pinHash: hashPin(s.pin, dados.slug), active: true } },
        { upsert: true },
      );
    }

    // Cardápio: recria do zero.
    await MenuItem.deleteMany({ restaurant: rest._id });
    const categorias = [...new Set(items.map((i) => i.category))];
    await MenuItem.insertMany(
      items.map((i, idx) => ({
        restaurant: rest._id,
        category: i.category,
        categoryOrder: categorias.indexOf(i.category),
        order: idx,
        name: i.name,
        description: i.description,
        priceCents: Math.round(i.price * 100),
        promoPriceCents: i.promo ? Math.round(i.promo * 100) : null,
        featured: i.featured ?? false,
        available: i.available ?? true,
        imageUrl: i.image ?? "",
        videoUrl: i.video ?? "",
        posterUrl: i.poster ?? "",
        modelGlbUrl: i.model ?? "",
        modelUsdzUrl: i.modelUsdz ?? "",
      })),
    );

    console.log(`✔ ${rest.name}: ${tables} mesas, ${items.length} itens, ${staff.length} garçons (recriado)`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("Erro no seed:", e.message);
  process.exit(1);
});
