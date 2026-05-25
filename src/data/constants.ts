// ─── Types ───────────────────────────────────────────────────────────────────

export const VEHICLES = [
  /* ── SUVs e Crossovers ── */
  { id: 1,  name: "Toyota Land Cruiser Prado", brand: "Toyota", cat: "suv",      mode: "aluguer", price: "6.500 MT/dia",
    description: "O Toyota Land Cruiser Prado é um ícone de durabilidade e desempenho off-road. Equipado com um motor diesel potente e um sistema de tração nas quatro rodas sofisticado, é ideal para as condições variadas das estradas moçambicanas. O interior espaçoso e luxuoso oferece conforto premium para até 7 passageiros, tornando-o perfeito para expedições em família ou viagens de negócios exigentes.",
    img: "https://images.unsplash.com/photo-1572629166063-011a332eafed?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1572629166063-011a332eafed?w=800&q=80",
      "https://images.unsplash.com/photo-1625753783753-855783cde647?w=800&q=80",
      "https://images.unsplash.com/photo-1581235707960-35f13de5aff2?w=800&q=80",
      "https://images.unsplash.com/photo-1606148632349-564e8c897018?w=800&q=80",
    ], fuel: "Diesel", seats: 7, year: 2023, discount: 10, available: true },

  { id: 2,  name: "BMW X5",                    brand: "BMW", cat: "suv",      mode: "compra",  price: "7.200.000 MT",
    description: "O BMW X5 combina luxo desportivo com tecnologia de ponta. Este SUV premium oferece uma experiência de condução dinâmica, interiores em pele de alta qualidade e os sistemas de segurança mais avançados do mercado. Ideal para quem procura status, conforto e performance numa só máquina.",
    img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
      "https://images.unsplash.com/photo-1606611013004-1a72e7eda43c?w=800&q=80",
      "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80",
    ], fuel: "Diesel", seats: 5, year: 2024, discount: 0, available: true },

  { id: 3,  name: "Hyundai Tucson",             brand: "Hyundai", cat: "suv",      mode: "aluguer", price: "4.200 MT/dia",
    description: "Moderno e versátil, o Hyundai Tucson é excelente para a condução urbana e viagens curtas. Com um design arrojado e tecnologia intuitiva, oferece um equilíbrio perfeito entre economia e conforto.",
    img: "https://images.unsplash.com/photo-1575090536203-2a6193126514?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1575090536203-2a6193126514?w=800&q=80",
      "https://images.unsplash.com/photo-1633695028498-e6a0999bb85e?w=800&q=80",
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2022, discount: 5, available: false },

  /* ── Pick-ups ── */
  { id: 4,  name: "Toyota Hilux",              brand: "Toyota", cat: "pickup",   mode: "aluguer", price: "4.500 MT/dia",
    description: "A lendária Toyota Hilux é conhecida pela sua indestrutibilidade. Perfeita para trabalhos pesados ou terrenos difíceis, é a escolha número um para quem precisa de robustez sem comprometer o espaço para passageiros.",
    img: "https://images.unsplash.com/photo-1758393605683-e28bb39d8917?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1758393605683-e28bb39d8917?w=800&q=80",
      "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
      "https://images.unsplash.com/photo-1612544448445-b8232cff3b4c?w=800&q=80",
    ], fuel: "Diesel", seats: 5, year: 2023, discount: 0, available: true },

  { id: 5,  name: "Ford Ranger Raptor",        brand: "Ford", cat: "pickup",   mode: "compra",  price: "4.800.000 MT",
    description: "A Ford Ranger Raptor é a pick-up de performance definitiva. Projetada pela Ford Performance para lidar com os terrenos mais exigentes a altas velocidades, conta com suspensão Fox Racing e um motor biturbo potente. É a combinação perfeita de adrenalina e utilidade.",
    img: "https://images.unsplash.com/photo-1770096171604-2e6f19fc33c0?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1770096171604-2e6f19fc33c0?w=800&q=80",
      "https://images.unsplash.com/photo-1612911912531-c3eb3bf45c67?w=800&q=80",
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
    ], fuel: "Diesel", seats: 5, year: 2023, discount: 15, available: true },

  { id: 6,  name: "Mitsubishi L200",           brand: "Mitsubishi", cat: "pickup",   mode: "aluguer", price: "4.000 MT/dia",
    description: "A Mitsubishi L200 é uma parceira confiável para qualquer desafio. Com um sistema de tração integral lendário e uma cabine confortável, é ideal tanto para o trabalho no campo quanto para deslocações na cidade com carga.",
    img: "https://images.unsplash.com/photo-1760560131262-dbbba7943cbd?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1760560131262-dbbba7943cbd?w=800&q=80",
      "https://images.unsplash.com/photo-1605893477799-b99e3b8b93fe?w=800&q=80",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80",
    ], fuel: "Diesel", seats: 5, year: 2022, discount: 0, available: true },

  /* ── Sedans ── */
  { id: 7,  name: "Mercedes-Benz C 220",       brand: "Mercedes-Benz", cat: "sedan",    mode: "compra",  price: "3.200.000 MT",
    description: "Elegância, conforto e prestígio definem o Mercedes-Benz Classe C. Este sedan oferece um interior luxuoso, condução suave e um conjunto completo de tecnologias de assistência ao condutor. É a escolha ideal para profissionais e famílias que valorizam a qualidade alemã.",
    img: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80",
      "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=600&q=80",
      "https://images.unsplash.com/photo-1609006726961-4cffc7403e38?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2022, discount: 5, available: true },

  { id: 8,  name: "Toyota Corolla",            brand: "Toyota", cat: "sedan",    mode: "aluguer", price: "2.200 MT/dia",
    description: "O Toyota Corolla é o carro mais vendido do mundo por uma razão: fiabilidade incomparável. Confortável, económico e fácil de conduzir, é o sedan perfeito para todas as ocasiões.",
    img: "https://images.unsplash.com/photo-1749058982846-c30cf5cad13a?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1749058982846-c30cf5cad13a?w=600&q=80",
      "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&q=80",
      "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=600&q=80",
    ], fuel: "Híbrido", seats: 5, year: 2023, discount: 0, available: true },

  { id: 9,  name: "Honda Accord",              brand: "Honda", cat: "sedan",    mode: "compra",  price: "2.600.000 MT",
    description: "O Honda Accord oferece um equilíbrio refinado entre sofisticação e dinâmica de condução. Com um habitáculo espaçoso e silencioso, é um sedan premium que se destaca pela sua qualidade de construção e eficiência.",
    img: "https://images.unsplash.com/photo-1577112319788-377a2131e05b?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1577112319788-377a2131e05b?w=600&q=80",
      "https://images.unsplash.com/photo-1605816988069-b11383b50717?w=600&q=80",
      "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2022, discount: 0, available: true },

  /* ── Hatchbacks ── */
  { id: 10, name: "Volkswagen Polo",           brand: "Volkswagen", cat: "hatchback",mode: "aluguer", price: "1.800 MT/dia",
    description: "O VW Polo é o rei dos compactos. Oferece a sensação de um carro maior num pacote ágil e fácil de estacionar. Ideal para o dia-a-dia na cidade com a qualidade de engenharia alemã.",
    img: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&q=80",
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2022, discount: 0, available: true },

  { id: 11, name: "Toyota Yaris",              brand: "Toyota", cat: "hatchback",mode: "compra",  price: "1.450.000 MT",
    description: "Compacto, moderno e extremamente eficiente. O Toyota Yaris é a escolha inteligente para quem procura um carro citadino fiável com baixo custo de manutenção e consumo.",
    img: "https://images.unsplash.com/photo-1749058983469-11eaef8d7bc5?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1749058983469-11eaef8d7bc5?w=600&q=80",
      "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=600&q=80",
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2023, discount: 10, available: true },

  { id: 12, name: "Suzuki Swift",              brand: "Suzuki", cat: "hatchback",mode: "aluguer", price: "1.600 MT/dia",
    description: "Divertido de conduzir e muito económico. O Suzuki Swift é perfeito para navegar no trânsito urbano com facilidade e estilo.",
    img: "https://images.unsplash.com/photo-1692970060626-8e96d7ee70d2?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1692970060626-8e96d7ee70d2?w=600&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80",
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2021, discount: 0, available: true },

  /* ── Vans / Minivans ── */
  { id: 13, name: "Toyota HiAce",              brand: "Toyota", cat: "van",      mode: "aluguer", price: "5.500 MT/dia",
    description: "A Toyota HiAce é a solução definitiva para transporte de grupos ou carga leve. Espaçosa, robusta e confiável, é o padrão de ouro para serviços de transporte em Moçambique.",
    img: "https://images.unsplash.com/photo-1773391966523-cfb3c8524e7d?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1773391966523-cfb3c8524e7d?w=600&q=80",
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&q=80",
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&q=80",
    ], fuel: "Diesel", seats: 14, year: 2022, discount: 0, available: true },

  { id: 14, name: "Mercedes Vito",             brand: "Mercedes", cat: "van",      mode: "compra",  price: "3.900.000 MT",
    description: "A Mercedes Vito combina a versatilidade de uma van com o conforto de um automóvel de passageiros Mercedes-Benz. Ideal para empresas que transportam clientes VIP ou famílias grandes que não abdicam do luxo.",
    img: "https://images.unsplash.com/photo-1765461734605-34657fa04db2?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1765461734605-34657fa04db2?w=600&q=80",
      "https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=600&q=80",
      "https://images.unsplash.com/photo-1583267746897-2cf415887172?w=600&q=80",
    ], fuel: "Diesel", seats: 8,  year: 2023, discount: 20, available: true },

  { id: 15, name: "Volkswagen Caravelle",      brand: "Volkswagen", cat: "van",      mode: "aluguer", price: "5.000 MT/dia",
    description: "O expoente máximo do transporte de passageiros em van. A VW Caravelle oferece um interior modular de alta qualidade e conforto de condução superior, perfeita para viagens de longa distância em grupo.",
    img: "https://images.unsplash.com/photo-1646422462528-0a48ac201c3b?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1646422462528-0a48ac201c3b?w=600&q=80",
      "https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?w=600&q=80",
      "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&q=80",
    ], fuel: "Diesel", seats: 9,  year: 2022, discount: 0, available: true },
];

export type Vehicle = (typeof VEHICLES)[number];

export const STEPS = [
  { n: "01", title: "Escolha o Veículo",       desc: "Filtre por categoria, preço ou modalidade no catálogo digital.",               icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { n: "02", title: "Calcule Prestações",      desc: "Simulações para funcionários públicos e privados, com descontos exclusivos para clientes.",      icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { n: "03", title: "Pague como quiser",      desc: "Pagamento digital — M-Pesa, e-Mola ou transferência bancária.",           icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { n: "04", title: "Receba as Chaves",        desc: "Entrega rápida em Maputo — receba o seu veículo com total comodidade.",               icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" },
];

export const PAYMENT_METHODS = [
  { 
    name: "M-Pesa", 
    color: "#E30613", 
    desc: "Pagamento instantâneo via Vodacom M-Pesa",
    logo: "https://idolo.co.mz/wp-content/uploads/2024/07/MPESA.png" 
  },
  { 
    name: "e-Mola", 
    color: "#FFD700", 
    desc: "Transferência segura via Movitel e-Mola",
    logo: "https://play-lh.googleusercontent.com/2TGAhJ55tiyhCwW0ZM43deGv4lUTFTBMoq83mnAO6-bU5hi2NPyKX8BN8iKt13irK7Y" 
  },
  { 
    name: "Débito Direto", 
    color: "#22C55E", 
    desc: "Desconto mensal no salário (Estado)",
    logo: "https://cdn-icons-png.flaticon.com/512/8007/8007010.png" 
  },
];

export const NAV_LINKS = [
  ["catalogo",      "Catálogo"],
  ["como-funciona", "Como Funciona"],
  ["simulador",     "Simulador"],
  ["pagamentos",    "Pagamentos"],
];

export const CATEGORY_LABEL: Record<string, string> = {
  func_publico: "Público",
  func_privado: "Privado",
  empreendedor: "Empreendedor",
};

export const DOC_LABEL: Record<string, string> = {
  bi: "B.I",
  nuit: "NUIT",
  declaracao_rendimento: "Declaração de Rendimento",
  contrato_trabalho: "Contrato de trabalho",
  carta_conducao: "Carta de Condução",
};
