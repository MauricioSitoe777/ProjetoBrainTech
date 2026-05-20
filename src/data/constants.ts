// ─── Types ───────────────────────────────────────────────────────────────────

export const VEHICLES = [
  /* ── SUVs e Crossovers ── */
  { id: 1,  name: "Toyota Land Cruiser Prado", cat: "suv",      mode: "aluguer", price: "6.500 MT/dia",
    img: "https://images.unsplash.com/photo-1572629166063-011a332eafed?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1572629166063-011a332eafed?w=800&q=80",
      "https://images.unsplash.com/photo-1625753783753-855783cde647?w=800&q=80",
      "https://images.unsplash.com/photo-1581235707960-35f13de5aff2?w=800&q=80",
    ], fuel: "Diesel", seats: 7, year: 2023 },

  { id: 2,  name: "BMW X5",                    cat: "suv",      mode: "compra",  price: "7.200.000 MT",
    img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80",
      "https://images.unsplash.com/photo-1606611013004-1a72e7eda43c?w=800&q=80",
      "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=800&q=80",
    ], fuel: "Diesel", seats: 5, year: 2024 },

  { id: 3,  name: "Hyundai Tucson",             cat: "suv",      mode: "aluguer", price: "4.200 MT/dia",
    img: "https://images.unsplash.com/photo-1575090536203-2a6193126514?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1575090536203-2a6193126514?w=800&q=80",
      "https://images.unsplash.com/photo-1633695028498-e6a0999bb85e?w=800&q=80",
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2022 },

  /* ── Pick-ups ── */
  { id: 4,  name: "Toyota Hilux",              cat: "pickup",   mode: "aluguer", price: "4.500 MT/dia",
    img: "https://images.unsplash.com/photo-1758393605683-e28bb39d8917?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1758393605683-e28bb39d8917?w=800&q=80",
      "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&q=80",
      "https://images.unsplash.com/photo-1612544448445-b8232cff3b4c?w=800&q=80",
    ], fuel: "Diesel", seats: 5, year: 2023 },

  { id: 5,  name: "Ford Ranger Raptor",        cat: "pickup",   mode: "compra",  price: "4.800.000 MT",
    img: "https://images.unsplash.com/photo-1770096171604-2e6f19fc33c0?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1770096171604-2e6f19fc33c0?w=800&q=80",
      "https://images.unsplash.com/photo-1612911912531-c3eb3bf45c67?w=800&q=80",
      "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80",
    ], fuel: "Diesel", seats: 5, year: 2023 },

  { id: 6,  name: "Mitsubishi L200",           cat: "pickup",   mode: "aluguer", price: "4.000 MT/dia",
    img: "https://images.unsplash.com/photo-1760560131262-dbbba7943cbd?w=800&q=80",
    images: [
      "https://images.unsplash.com/photo-1760560131262-dbbba7943cbd?w=800&q=80",
      "https://images.unsplash.com/photo-1605893477799-b99e3b8b93fe?w=800&q=80",
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80",
    ], fuel: "Diesel", seats: 5, year: 2022 },

  /* ── Sedans ── */
  { id: 7,  name: "Mercedes-Benz C 220",       cat: "sedan",    mode: "compra",  price: "3.200.000 MT",
    img: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80",
      "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=600&q=80",
      "https://images.unsplash.com/photo-1609006726961-4cffc7403e38?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2022 },

  { id: 8,  name: "Toyota Corolla",            cat: "sedan",    mode: "aluguer", price: "2.200 MT/dia",
    img: "https://images.unsplash.com/photo-1749058982846-c30cf5cad13a?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1749058982846-c30cf5cad13a?w=600&q=80",
      "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&q=80",
      "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=600&q=80",
    ], fuel: "Híbrido", seats: 5, year: 2023 },

  { id: 9,  name: "Honda Accord",              cat: "sedan",    mode: "compra",  price: "2.600.000 MT",
    img: "https://images.unsplash.com/photo-1577112319788-377a2131e05b?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1577112319788-377a2131e05b?w=600&q=80",
      "https://images.unsplash.com/photo-1605816988069-b11383b50717?w=600&q=80",
      "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2022 },

  /* ── Hatchbacks ── */
  { id: 10, name: "Volkswagen Polo",           cat: "hatchback",mode: "aluguer", price: "1.800 MT/dia",
    img: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&q=80",
      "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=600&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2022 },

  { id: 11, name: "Toyota Yaris",              cat: "hatchback",mode: "compra",  price: "1.450.000 MT",
    img: "https://images.unsplash.com/photo-1749058983469-11eaef8d7bc5?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1749058983469-11eaef8d7bc5?w=600&q=80",
      "https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=600&q=80",
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2023 },

  { id: 12, name: "Suzuki Swift",              cat: "hatchback",mode: "aluguer", price: "1.600 MT/dia",
    img: "https://images.unsplash.com/photo-1692970060626-8e96d7ee70d2?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1692970060626-8e96d7ee70d2?w=600&q=80",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80",
      "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&q=80",
    ], fuel: "Gasolina", seats: 5, year: 2021 },

  /* ── Vans / Minivans ── */
  { id: 13, name: "Toyota HiAce",              cat: "van",      mode: "aluguer", price: "5.500 MT/dia",
    img: "https://images.unsplash.com/photo-1773391966523-cfb3c8524e7d?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1773391966523-cfb3c8524e7d?w=600&q=80",
      "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=600&q=80",
      "https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=600&q=80",
    ], fuel: "Diesel", seats: 14, year: 2022 },

  { id: 14, name: "Mercedes Vito",             cat: "van",      mode: "compra",  price: "3.900.000 MT",
    img: "https://images.unsplash.com/photo-1765461734605-34657fa04db2?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1765461734605-34657fa04db2?w=600&q=80",
      "https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=600&q=80",
      "https://images.unsplash.com/photo-1583267746897-2cf415887172?w=600&q=80",
    ], fuel: "Diesel", seats: 8,  year: 2023 },

  { id: 15, name: "Volkswagen Caravelle",      cat: "van",      mode: "aluguer", price: "5.000 MT/dia",
    img: "https://images.unsplash.com/photo-1646422462528-0a48ac201c3b?w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1646422462528-0a48ac201c3b?w=600&q=80",
      "https://images.unsplash.com/photo-1532581140115-3e355d1ed1de?w=600&q=80",
      "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&q=80",
    ], fuel: "Diesel", seats: 9,  year: 2022 },
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
