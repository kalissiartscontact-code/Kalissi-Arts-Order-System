export interface Wilaya {
  code: string;
  name: string;
  arabicName: string;
  homeDeliveryFee: number; // DA
  stopdeskDeliveryFee: number; // DA
  communes: string[];
  zrStopDesks: string[];
}

export const ALGERIAN_WILAYAS: Wilaya[] = [
  {
    code: "01",
    name: "Adrar",
    arabicName: "أدرار",
    homeDeliveryFee: 950,
    stopdeskDeliveryFee: 650,
    communes: ["Adrar", "Tamest", "Charouine", "Reggane", "In Zghmir", "Tit", "Timimoun", "Aoulef", "Zaouiet Kounta", "Fenoughil"],
    zrStopDesks: ["Bureau ZR Adrar Centre (Rue Principale)", "Bureau ZR Timimoun"]
  },
  {
    code: "02",
    name: "Chlef",
    arabicName: "الشلف",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Chlef", "Ténès", "El Karimia", "Oued Fodda", "Ouled Fares", "Boukadir", "Béni Haoua", "Zeboudja", "Taougrit", "Ain Merane"],
    zrStopDesks: ["Bureau ZR Chlef Centre (Hay Ben Souna)", "Bureau ZR Ténès"]
  },
  {
    code: "03",
    name: "Laghouat",
    arabicName: "الأغواط",
    homeDeliveryFee: 800,
    stopdeskDeliveryFee: 500,
    communes: ["Laghouat", "Ksar El Hirane", "Bennasser Benchohra", "Sidi Makhlouf", "Hassi Delaa", "Aflou", "Oued Morra"],
    zrStopDesks: ["Bureau ZR Laghouat Centre (Maamoura)", "Bureau ZR Aflou"]
  },
  {
    code: "04",
    name: "Oum El Bouaghi",
    arabicName: "أم البواقي",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Oum El Bouaghi", "Ain Beida", "Ain M'lila", "Ain Fakroun", "Sigus", "Ain Kercha", "Meskiana", "Dhalaa"],
    zrStopDesks: ["Bureau ZR Ain M'lila (Zone Commerciale)", "Bureau ZR Oum El Bouaghi Centre", "Bureau ZR Ain Beida"]
  },
  {
    code: "05",
    name: "Batna",
    arabicName: "باتنة",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Batna", "Barika", "Ain Touta", "Arris", "Merouana", "Tazoult", "N'Gaous", "Seriana", "Chemora", "Ras El Aioun"],
    zrStopDesks: ["Bureau ZR Batna Centre (Boulevard Biskra)", "Bureau ZR Barika", "Bureau ZR Ain Touta"]
  },
  {
    code: "06",
    name: "Béjaïa",
    arabicName: "بجاية",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Béjaïa", "Amizour", "Akbou", "El Kseur", "Seddouk", "Tichy", "Aokas", "Sidi Aïch", "Tazmalt", "Kherrata"],
    zrStopDesks: ["Bureau ZR Béjaïa 4 Chemins", "Bureau ZR Akbou (Zone Industrielle)", "Bureau ZR El Kseur"]
  },
  {
    code: "07",
    name: "Biskra",
    arabicName: "بسكرة",
    homeDeliveryFee: 750,
    stopdeskDeliveryFee: 450,
    communes: ["Biskra", "Ouled Djellal", "Sidi Okba", "Tolga", "Zeribet El Oued", "El Kantara", "M'Chouneche", "Foughala"],
    zrStopDesks: ["Bureau ZR Biskra Gare", "Bureau ZR Tolga"]
  },
  {
    code: "08",
    name: "Béchar",
    arabicName: "بشار",
    homeDeliveryFee: 900,
    stopdeskDeliveryFee: 600,
    communes: ["Béchar", "Kenadsa", "Abadla", "Taghit", "Béni Abbès", "Igli", "Tabelbala", "El Ouata"],
    zrStopDesks: ["Bureau ZR Béchar Centre (Hay El Badr)"]
  },
  {
    code: "09",
    name: "Blida",
    arabicName: "البليدة",
    homeDeliveryFee: 550,
    stopdeskDeliveryFee: 350,
    communes: ["Blida", "Boufarik", "Ouled Yaïch", "Mouzaia", "El Affroun", "Bougara", "Meftah", "Larbaa", "Oued El Alleug", "Chréa"],
    zrStopDesks: ["Bureau ZR Blida Bab Dzair", "Bureau ZR Boufarik Centre", "Bureau ZR Ouled Yaïch"]
  },
  {
    code: "10",
    name: "Bouira",
    arabicName: "البويرة",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Bouira", "Lakhdaria", "Sour El Ghozlane", "Ain Bessem", "M'Chedallah", "Bechloul", "Kadiria", "Bir Ghbalou"],
    zrStopDesks: ["Bureau ZR Bouira Centre (Route de M'Chedallah)", "Bureau ZR Lakhdaria"]
  },
  {
    code: "11",
    name: "Tamanrasset",
    arabicName: "تمنراست",
    homeDeliveryFee: 1100,
    stopdeskDeliveryFee: 800,
    communes: ["Tamanrasset", "Abalessa", "In Ghar", "In Amguel", "Tazrouk", "Idles"],
    zrStopDesks: ["Bureau ZR Tamanrasset Centre (Avenue Emir Abdelkader)"]
  },
  {
    code: "12",
    name: "Tébessa",
    arabicName: "تبسة",
    homeDeliveryFee: 700,
    stopdeskDeliveryFee: 450,
    communes: ["Tébessa", "Cheria", "El Aouinet", "Bir El Ater", "Ouenza", "Morsott", "Negrine", "El Kouif"],
    zrStopDesks: ["Bureau ZR Tébessa El Houria", "Bureau ZR Bir El Ater"]
  },
  {
    code: "13",
    name: "Tlemcen",
    arabicName: "تلمسان",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Tlemcen", "Mansourah", "Chetouane", "Maghnia", "Remchi", "Ghazaouet", "Nedroma", "Sebdou", "Hennaya", "Béni Saf"],
    zrStopDesks: ["Bureau ZR Tlemcen Kiffane", "Bureau ZR Maghnia Centre", "Bureau ZR Remchi"]
  },
  {
    code: "14",
    name: "Tiaret",
    arabicName: "تيارت",
    homeDeliveryFee: 700,
    stopdeskDeliveryFee: 450,
    communes: ["Tiaret", "Sougueur", "Frenda", "Ksar Chellala", "Mahdia", "Rahouia", "Mechraa Safa", "Oued Lilli"],
    zrStopDesks: ["Bureau ZR Tiaret Centre (Route d'Alger)", "Bureau ZR Sougueur"]
  },
  {
    code: "15",
    name: "Tizi Ouzou",
    arabicName: "تيزي وزو",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Tizi Ouzou", "Azazga", "Draa El Mizan", "Tigzirt", "Boghni", "Larbaa Nath Irathen", "Ain El Hammam", "Ouadhia", "Azeffoun"],
    zrStopDesks: ["Bureau ZR Tizi Ouzou Gare Routière", "Bureau ZR Azazga", "Bureau ZR Draa El Mizan"]
  },
  {
    code: "16",
    name: "Alger",
    arabicName: "الجزائر",
    homeDeliveryFee: 500,
    stopdeskDeliveryFee: 300,
    communes: [
      "Alger Centre", "Sidi M'Hamed", "El Madania", "Hamma Annassers", "Bab El Oued", "Bologhine", "Casbah", "Oued Koriche",
      "Bir Mourad Raïs", "El Biar", "Bouzareah", "Hydra", "Ben Aknoun", "Kouba", "Hussein Dey", "Bachdjerrah", "Bourouba",
      "El Harrach", "Baraki", "Oued Smar", "Bordj El Kiffan", "Bab Ezzouar", "Dar El Beïda", "Rouïba", "Reghaïa", "Ain Taya",
      "Cheraga", "Dely Ibrahim", "Ouled Fayet", "Ain Benian", "Staoueli", "Zeralda", "Draria", "Saoula", "Birtouta"
    ],
    zrStopDesks: [
      "Bureau ZR Alger - Bab Ezzouar (Cité 8 Mai 1945)",
      "Bureau ZR Alger - Chéraga (Zone Dely Ibrahim)",
      "Bureau ZR Alger - Kouba (Garidi 1)",
      "Bureau ZR Alger - Hussein Dey (Rue Tripoli)",
      "Bureau ZR Alger - Rouiba (Zone Industrielle)",
      "Bureau ZR Alger - Bir Mourad Raïs (Les Sources)",
      "Bureau ZR Alger - Bab El Oued"
    ]
  },
  {
    code: "17",
    name: "Djelfa",
    arabicName: "الجلفة",
    homeDeliveryFee: 750,
    stopdeskDeliveryFee: 450,
    communes: ["Djelfa", "Messaad", "Ain Oussera", "Hassi Bahbah", "Dar Chioukh", "Charef", "Birine", "El Idrissia"],
    zrStopDesks: ["Bureau ZR Djelfa Centre (Avenue de la République)", "Bureau ZR Ain Oussera"]
  },
  {
    code: "18",
    name: "Jijel",
    arabicName: "جيجل",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Jijel", "Taher", "El Milia", "El Ancer", "Chekfa", "Ziama Mansouriah", "Sidi Abdelaziz", "Texenna"],
    zrStopDesks: ["Bureau ZR Jijel Ville (Camp Chevalier)", "Bureau ZR Taher Centre"]
  },
  {
    code: "19",
    name: "Sétif",
    arabicName: "سطيف",
    homeDeliveryFee: 600,
    stopdeskDeliveryFee: 400,
    communes: ["Sétif", "El Eulma", "Ain Oulmene", "Ain Azel", "Bougaa", "Béni Aziz", "Amoucha", "Guellal", "Hammam Guergour"],
    zrStopDesks: [
      "Bureau ZR Sétif Centre (Boulevard 8 Mai 1945)",
      "Bureau ZR El Eulma (Cité Dubaï)",
      "Bureau ZR Ain Oulmene"
    ]
  },
  {
    code: "20",
    name: "Saïda",
    arabicName: "سعيدة",
    homeDeliveryFee: 700,
    stopdeskDeliveryFee: 450,
    communes: ["Saïda", "Ain El Hadjar", "Youb", "Sidi Boubekeur", "El Hassasna", "Ouled Brahim"],
    zrStopDesks: ["Bureau ZR Saïda Centre (Avenue de la Gare)"]
  },
  {
    code: "21",
    name: "Skikda",
    arabicName: "سكيكدة",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Skikda", "Collo", "Azzaba", "El Harrouch", "Tamalous", "Ben Azzouz", "Ramdane Djamel", "Ain Charchar"],
    zrStopDesks: ["Bureau ZR Skikda Centre (Allées du 20 Août)", "Bureau ZR El Harrouch", "Bureau ZR Azzaba"]
  },
  {
    code: "22",
    name: "Sidi Bel Abbès",
    arabicName: "سيدي بلعباس",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Sidi Bel Abbès", "Sfisef", "Telagh", "Ben Badis", "Sidi Ali Boussidi", "Ras El Ma", "Tessala", "Mostefa Ben Brahim"],
    zrStopDesks: ["Bureau ZR Sidi Bel Abbès Gambetta", "Bureau ZR Sfisef"]
  },
  {
    code: "23",
    name: "Annaba",
    arabicName: "عنابة",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Annaba", "El Bouni", "El Hadjar", "Sidi Amar", "Berrahal", "Ain El Berda", "Chetaibi", "Seraïdi"],
    zrStopDesks: [
      "Bureau ZR Annaba Centre (Cours de la Révolution)",
      "Bureau ZR El Bouni",
      "Bureau ZR El Hadjar"
    ]
  },
  {
    code: "24",
    name: "Guelma",
    arabicName: "قالمة",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Guelma", "Oued Zenati", "Bouchegouf", "Héliopolis", "Hammam Debagh", "Ain Makhlouf", "Guelaat Bou Sbaa"],
    zrStopDesks: ["Bureau ZR Guelma Centre (Bab Souk)", "Bureau ZR Oued Zenati"]
  },
  {
    code: "25",
    name: "Constantine",
    arabicName: "قسنطينة",
    homeDeliveryFee: 500,
    stopdeskDeliveryFee: 460,
    communes: ["Constantine", "El Khroub", "Hamma Bouziane", "Didouche Mourad", "Zighoud Youcef", "Ain Smara", "Ouled Rahmoune", "Ali Mendjeli", "Ibn Ziad"],
    zrStopDesks: [
      "Hub Zouaghi 25 — مكتب زواغي",
      "Hub Belle vue 25 — مكتب المنظر الجميل",
      "Hub NOUVELLE VILLE 25 — مكتب المدينة الجديدة"
    ]
  },
  {
    code: "26",
    name: "Médéa",
    arabicName: "المدية",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Médéa", "Berrouaghia", "Ksar El Boukhari", "Beni Slimane", "Tablat", "Ouzera", "Ain Boucif", "Chahbounia"],
    zrStopDesks: ["Bureau ZR Médéa Centre (Ain D'Heb)", "Bureau ZR Berrouaghia", "Bureau ZR Ksar El Boukhari"]
  },
  {
    code: "27",
    name: "Mostaganem",
    arabicName: "مستغانم",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Mostaganem", "Ain Tedeles", "Sidi Ali", "Hassi Mameche", "Bouguirat", "Kheir Eddine", "Sidi Lakhdar", "Mesra"],
    zrStopDesks: ["Bureau ZR Mostaganem Salamandre", "Bureau ZR Ain Tedeles"]
  },
  {
    code: "28",
    name: "M'Sila",
    arabicName: "المسيلة",
    homeDeliveryFee: 700,
    stopdeskDeliveryFee: 450,
    communes: ["M'Sila", "Bou Saâda", "Sidi Aïssa", "Magra", "Ain El Hadjel", "Ouled Derradj", "Hammam Dhalaa", "Beni Ilmane"],
    zrStopDesks: ["Bureau ZR M'Sila Centre (Cité 500)", "Bureau ZR Bou Saâda Centre"]
  },
  {
    code: "29",
    name: "Mascara",
    arabicName: "معسكر",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Mascara", "Sig", "Mohammadia", "Tighennif", "Ghriss", "Oued El Abtal", "Aouf", "Bouhanifia"],
    zrStopDesks: ["Bureau ZR Mascara Centre (Sidi Said)", "Bureau ZR Sig", "Bureau ZR Mohammadia"]
  },
  {
    code: "30",
    name: "Ouargla",
    arabicName: "ورقلة",
    homeDeliveryFee: 850,
    stopdeskDeliveryFee: 550,
    communes: ["Ouargla", "Hassi Messaoud", "Touggourt", "Rouissat", "Sidi Khouiled", "N'Goussa", "El Hadjira"],
    zrStopDesks: ["Bureau ZR Ouargla Centre (Sidi Bouzid)", "Bureau ZR Hassi Messaoud (Base de Vie)"]
  },
  {
    code: "31",
    name: "Oran",
    arabicName: "وهران",
    homeDeliveryFee: 600,
    stopdeskDeliveryFee: 350,
    communes: ["Oran", "Es Senia", "Bir El Djir", "Arzew", "Bethioua", "Ain El Turk", "Mers El Kébir", "Gdyel", "Oued Tlelat", "Boutlelis"],
    zrStopDesks: [
      "Bureau ZR Oran Centre (Avenue Larbi Ben M'hidi)",
      "Bureau ZR Oran - Bir El Djir (USTO)",
      "Bureau ZR Oran - Es Senia (Zone d'Activité)",
      "Bureau ZR Arzew"
    ]
  },
  {
    code: "32",
    name: "El Bayadh",
    arabicName: "البيض",
    homeDeliveryFee: 850,
    stopdeskDeliveryFee: 550,
    communes: ["El Bayadh", "Rogassa", "Brezina", "Bougtob", "El Abiodh Sidi Cheikh"],
    zrStopDesks: ["Bureau ZR El Bayadh Centre"]
  },
  {
    code: "33",
    name: "Illizi",
    arabicName: "إليزي",
    homeDeliveryFee: 1100,
    stopdeskDeliveryFee: 800,
    communes: ["Illizi", "Djanet", "In Amenas", "Bordj Omar Driss", "Debdeb"],
    zrStopDesks: ["Bureau ZR Illizi Ville", "Bureau ZR In Amenas"]
  },
  {
    code: "34",
    name: "Bordj Bou Arréridj",
    arabicName: "برج بوعريريج",
    homeDeliveryFee: 600,
    stopdeskDeliveryFee: 400,
    communes: ["Bordj Bou Arréridj", "Ras El Oued", "Mansoura", "Medjana", "Bordj Zemoura", "El Achir", "Ain Taghrout"],
    zrStopDesks: ["Bureau ZR BBA Centre (Route de Sétif)", "Bureau ZR Ras El Oued"]
  },
  {
    code: "35",
    name: "Boumerdès",
    arabicName: "بومرداس",
    homeDeliveryFee: 550,
    stopdeskDeliveryFee: 350,
    communes: ["Boumerdès", "Khemis El Khechna", "Dellys", "Bordj Menaiel", "Baghlia", "Isser", "Zemmouri", "Thénia", "Corso", "Boudouaou"],
    zrStopDesks: [
      "Bureau ZR Boumerdès Centre (Front de Mer)",
      "Bureau ZR Boudouaou",
      "Bureau ZR Bordj Menaiel",
      "Bureau ZR Khemis El Khechna"
    ]
  },
  {
    code: "36",
    name: "El Tarf",
    arabicName: "الطارف",
    homeDeliveryFee: 700,
    stopdeskDeliveryFee: 450,
    communes: ["El Tarf", "El Kala", "Ben M'Hidi", "Besbes", "Drean", "Bouhadjar"],
    zrStopDesks: ["Bureau ZR El Tarf Centre", "Bureau ZR El Kala"]
  },
  {
    code: "37",
    name: "Tindouf",
    arabicName: "تندوف",
    homeDeliveryFee: 1150,
    stopdeskDeliveryFee: 850,
    communes: ["Tindouf", "Oum El Assel"],
    zrStopDesks: ["Bureau ZR Tindouf Centre"]
  },
  {
    code: "38",
    name: "Tissemsilt",
    arabicName: "تيسمسيلت",
    homeDeliveryFee: 700,
    stopdeskDeliveryFee: 450,
    communes: ["Tissemsilt", "Khemisti", "Theniet El Had", "Bordj Bounaama", "Lardjem", "Ammari"],
    zrStopDesks: ["Bureau ZR Tissemsilt Centre"]
  },
  {
    code: "39",
    name: "El Oued",
    arabicName: "الوادي",
    homeDeliveryFee: 800,
    stopdeskDeliveryFee: 550,
    communes: ["El Oued", "Robbah", "Guemar", "Debila", "Kouinine", "Bayadha", "Reguiba"],
    zrStopDesks: ["Bureau ZR El Oued Centre (Hay Chohada)", "Bureau ZR Guemar"]
  },
  {
    code: "40",
    name: "Khenchela",
    arabicName: "خنشلة",
    homeDeliveryFee: 700,
    stopdeskDeliveryFee: 450,
    communes: ["Khenchela", "Kais", "Chechar", "Bouhmama", "Ouled Rechache", "El Hamma", "Babar"],
    zrStopDesks: ["Bureau ZR Khenchela Centre (Avenue de la Paix)", "Bureau ZR Kais"]
  },
  {
    code: "41",
    name: "Souk Ahras",
    arabicName: "سوق أهراس",
    homeDeliveryFee: 700,
    stopdeskDeliveryFee: 450,
    communes: ["Souk Ahras", "Sedrata", "M'Daourouch", "Taoura", "Mechroha", "Ouled Driss"],
    zrStopDesks: ["Bureau ZR Souk Ahras Centre", "Bureau ZR Sedrata"]
  },
  {
    code: "42",
    name: "Tipaza",
    arabicName: "تيبازة",
    homeDeliveryFee: 550,
    stopdeskDeliveryFee: 350,
    communes: ["Tipaza", "Cherchell", "Kolea", "Bou Ismail", "Hadjout", "Gouraya", "Fouka", "Douaouda", "Damous"],
    zrStopDesks: ["Bureau ZR Kolea Centre", "Bureau ZR Hadjout", "Bureau ZR Bou Ismail", "Bureau ZR Cherchell"]
  },
  {
    code: "43",
    name: "Mila",
    arabicName: "ميلة",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Mila", "Chelghoum Laid", "Ferdjioua", "Tadjenanet", "Grarem Gouga", "Oued Endja", "Teleghma"],
    zrStopDesks: ["Bureau ZR Mila Centre (El Senia)", "Bureau ZR Chelghoum Laid", "Bureau ZR Tadjenanet"]
  },
  {
    code: "44",
    name: "Ain Defla",
    arabicName: "عين الدفلى",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Ain Defla", "Khemis Miliana", "Miliana", "El Attaf", "Djelida", "Djendel", "Boumedfaa"],
    zrStopDesks: ["Bureau ZR Khemis Miliana (Route Nationale 4)", "Bureau ZR Ain Defla Centre", "Bureau ZR Miliana"]
  },
  {
    code: "45",
    name: "Naâma",
    arabicName: "النعامة",
    homeDeliveryFee: 850,
    stopdeskDeliveryFee: 550,
    communes: ["Naâma", "Mecheria", "Ain Sefra", "Tiout", "Sfissifa", "Moghrar", "Asla"],
    zrStopDesks: ["Bureau ZR Mecheria Centre", "Bureau ZR Ain Sefra"]
  },
  {
    code: "46",
    name: "Ain Témouchent",
    arabicName: "عين تموشنت",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Ain Témouchent", "Beni Saf", "Hammam Bou Hadjar", "El Malah", "Ain El Arbaa"],
    zrStopDesks: ["Bureau ZR Ain Témouchent Centre (Rue de l'Indépendance)", "Bureau ZR Beni Saf"]
  },
  {
    code: "47",
    name: "Ghardaïa",
    arabicName: "غرداية",
    homeDeliveryFee: 800,
    stopdeskDeliveryFee: 500,
    communes: ["Ghardaïa", "El Guerara", "Berriane", "Metlili", "Bounoura", "Dhayet Bendhahoua", "Zelfana"],
    zrStopDesks: ["Bureau ZR Ghardaïa Theniet El Makhzen", "Bureau ZR El Guerara"]
  },
  {
    code: "48",
    name: "Relizane",
    arabicName: "غليزان",
    homeDeliveryFee: 650,
    stopdeskDeliveryFee: 400,
    communes: ["Relizane", "Oued Rhiou", "Mazouna", "Zemmora", "Yellel", "Djidioua", "Ammi Moussa"],
    zrStopDesks: ["Bureau ZR Relizane Centre (Boulevard Zirout)", "Bureau ZR Oued Rhiou"]
  },
  {
    code: "49",
    name: "Timimoun",
    arabicName: "تيميمون",
    homeDeliveryFee: 950,
    stopdeskDeliveryFee: 650,
    communes: ["Timimoun", "Aougrout", "Deldoul", "Ksar Kaddour", "Tinerkouk", "Charouine"],
    zrStopDesks: ["Bureau ZR Timimoun Oasis"]
  },
  {
    code: "50",
    name: "Bordj Badji Mokhtar",
    arabicName: "برج باجي مختار",
    homeDeliveryFee: 1200,
    stopdeskDeliveryFee: 900,
    communes: ["Bordj Badji Mokhtar", "Timiaouine"],
    zrStopDesks: ["Bureau ZR Bordj Badji Mokhtar"]
  },
  {
    code: "51",
    name: "Ouled Djellal",
    arabicName: "أولاد جلال",
    homeDeliveryFee: 800,
    stopdeskDeliveryFee: 500,
    communes: ["Ouled Djellal", "Sidi Khaled", "Ras El Miad", "Besbes", "Doucen"],
    zrStopDesks: ["Bureau ZR Ouled Djellal Centre"]
  },
  {
    code: "52",
    name: "Béni Abbès",
    arabicName: "بني عباس",
    homeDeliveryFee: 950,
    stopdeskDeliveryFee: 650,
    communes: ["Béni Abbès", "Kerzaz", "El Ouata", "Igli", "Tabelbala", "Timoudi"],
    zrStopDesks: ["Bureau ZR Béni Abbès Centre"]
  },
  {
    code: "53",
    name: "In Salah",
    arabicName: "عين صالح",
    homeDeliveryFee: 1050,
    stopdeskDeliveryFee: 750,
    communes: ["In Salah", "In Ghar", "Foggaret Ezzaouia"],
    zrStopDesks: ["Bureau ZR In Salah Centre"]
  },
  {
    code: "54",
    name: "In Guezzam",
    arabicName: "عين قزام",
    homeDeliveryFee: 1200,
    stopdeskDeliveryFee: 900,
    communes: ["In Guezzam", "Tin Zaouatine"],
    zrStopDesks: ["Bureau ZR In Guezzam"]
  },
  {
    code: "55",
    name: "Touggourt",
    arabicName: "تقرت",
    homeDeliveryFee: 850,
    stopdeskDeliveryFee: 550,
    communes: ["Touggourt", "Nezla", "Tebesbest", "Zaouia El Abidia", "Megarine", "Taibet"],
    zrStopDesks: ["Bureau ZR Touggourt Centre (Avenue de la Gare)"]
  },
  {
    code: "56",
    name: "Djanet",
    arabicName: "جانت",
    homeDeliveryFee: 1150,
    stopdeskDeliveryFee: 850,
    communes: ["Djanet", "Bordj El Haouas"],
    zrStopDesks: ["Bureau ZR Djanet Ville"]
  },
  {
    code: "57",
    name: "El M'Ghair",
    arabicName: "المغير",
    homeDeliveryFee: 850,
    stopdeskDeliveryFee: 550,
    communes: ["El M'Ghair", "Djamaa", "Oum Touyour", "Sidi Amrane", "Still", "Tendla"],
    zrStopDesks: ["Bureau ZR El M'Ghair Centre"]
  },
  {
    code: "58",
    name: "El Meniaa",
    arabicName: "المنيعة",
    homeDeliveryFee: 900,
    stopdeskDeliveryFee: 600,
    communes: ["El Meniaa", "Hassi Gara", "Hassi Fehal"],
    zrStopDesks: ["Bureau ZR El Meniaa Centre"]
  }
];

export function getWilayaByCode(code: string): Wilaya | undefined {
  return ALGERIAN_WILAYAS.find(w => w.code === code);
}
