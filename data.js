// ── Default Restaurant Data ────────────────────────────────────────────────
// Updated with Sattva Tiffins authentic South Indian menu & Cool Drinks
const DATA_VERSION = 11;

const DEFAULT_DATA = {
  _version: DATA_VERSION,
  store: {
    name: "Sattva Tiffins",
    tagline: "Pure Taste · Freshly Made · Always",
    logo: "images/sattva_logo.png",
    address: "Sattva Tiffins, Main Road",
    phone: "+91 98765 43210",
    email: "contact@sattvatiffins.com",
    primaryColor: "#021f4d",
    secondaryColor: "#009743",
    accentColor: "#FFC107",
    tableNumber: "T-1",
    gstNumber: "36AAAAA0000A1Z5",
    currency: "₹",
    openTime: "07:00",
    closeTime: "22:30",
    isOpen: true,
    vegFilterEnabled: false,
    searchEnabled: true,
    bannerImage: "images/banner.jpg",
    socialProof: "⭐ 4.9 (Pure Veg & Authentic)",
    announcement: "✨ Pure Taste · Freshly Made Always · Good Food Brings People Together ✨"
  },
  categories: [
    { 
      id: "cat-1", 
      name: "Idly, Wada & Bonda", 
      icon: "🥞", 
      image: "images/idly_plate.jpg", 
      position: 0, 
      description: "Steamed soft idlis, crunchy wadas, and golden bondas served with chutneys & sambar" 
    },
    { 
      id: "cat-2", 
      name: "Dosa", 
      icon: "🫓", 
      image: "images/masala_dosa.jpg", 
      position: 1, 
      description: "Crisp golden dosas, butter roasts, spicy karam, cheese and chef specials" 
    },
    { 
      id: "cat-3", 
      name: "Cool Drinks", 
      icon: "🥤", 
      image: "images/cool_drinks.png", 
      position: 2, 
      description: "Chilled soft drinks, energy drinks, soda cans & bottled mineral water" 
    }
  ],
  items: [
    // ── IDLY, WADA & BONDA (Items 1 to 16) ───────────────────────────────────
    {
      id: "item-1",
      categoryId: "cat-1",
      name: "IDLY (4 PCS)",
      description: "Four pieces of steaming hot, ultra-soft and fluffy rice idlis served with coconut chutney and piping hot sambhar.",
      price: 60,
      image: "images/idly_plate.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 0,
      tags: ["popular", "breakfast"],
    },
    {
      id: "item-2",
      categoryId: "cat-1",
      name: "WADA (2 PCS)",
      description: "Two crispy, golden deep-fried medu vadas made from spiced lentil batter, served with chutneys and hot sambhar.",
      price: 60,
      image: "images/medu_vada.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 1,
      tags: ["crispy", "snack"],
    },
    {
      id: "item-3",
      categoryId: "cat-1",
      name: "BONDA (4 PCS)",
      description: "Four golden-crisp Mysore bondas with soft, airy interiors seasoned with cumin, ginger, and green chilies.",
      price: 50,
      image: "images/mysore_bonda.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 2,
      tags: ["hot", "snack"],
    },
    {
      id: "item-4",
      categoryId: "cat-1",
      name: "IDLY (2 PCS) + WADA (1 PC)",
      description: "Classic popular combo featuring two soft idlis and one crispy medu vada with fresh coconut chutney and sambhar.",
      price: 60,
      image: "images/idli_vada_plate.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 3,
      tags: ["combo", "bestseller"],
    },
    {
      id: "item-5",
      categoryId: "cat-1",
      name: "IDLY (2 PCS) + BONDA (2 PCS)",
      description: "Balanced tiffin combo of two soft steamed idlis paired with two freshly fried golden bondas.",
      price: 60,
      image: "images/idly_bonda.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 4,
      tags: ["combo"],
    },
    {
      id: "item-6",
      categoryId: "cat-1",
      name: "IDLY (1 PC) + WADA (1 PC) + BONDA (1 PC)",
      description: "The ultimate trio plate! One soft idli, one crispy medu vada, and one hot bonda served with all dips.",
      price: 60,
      image: "images/idli_vada_trio.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 5,
      tags: ["trio-combo", "popular"],
    },
    {
      id: "item-7",
      categoryId: "cat-1",
      name: "GHEE IDLY",
      description: "Steamed hot idlis generously drizzled with aromatic pure desi ghee, served with chutney and sambhar.",
      price: 80,
      image: "images/ghee_idly.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 6,
      tags: ["desi-ghee", "special"],
    },
    {
      id: "item-8",
      categoryId: "cat-1",
      name: "GUNTUR IDLY – BUTTON IDLY WITH GHEE (10 PCS)",
      description: "Ten bite-sized button idlis tossed in spicy Andhra Guntur karam podi and drenched with pure fragrant ghee.",
      price: 100,
      image: "images/podi_idly.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 7,
      tags: ["spicy", "guntur-special"],
    },
    {
      id: "item-9",
      categoryId: "cat-1",
      name: "BUTTON IDLY (8 PCS)",
      description: "Eight cute mini button idlis, steamed light and fluffy, served with traditional accompaniments.",
      price: 60,
      image: "images/idly_plate.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 8,
      tags: ["mini-idli"],
    },
    {
      id: "item-10",
      categoryId: "cat-1",
      name: "TAVA IDLY",
      description: "Idlis pan-sautéed on a hot tawa with butter, mustard seeds, onions, curry leaves, and special tiffin spices.",
      price: 80,
      image: "images/ghee_idly.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: true,
      position: 9,
      tags: ["tava-special"],
    },
    {
      id: "item-11",
      categoryId: "cat-1",
      name: "TAVA WADA",
      description: "Crispy medu wadas freshly spiced and pan-tossed on hot tava with fragrant herbs and roasted masala.",
      price: 90,
      image: "images/tava_wada.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: true,
      position: 10,
      tags: ["tava-special"],
    },
    {
      id: "item-12",
      categoryId: "cat-1",
      name: "TAVA BONDA",
      description: "Crispy bondas spiced on tawa with chopped chilies, onions, and curry leaves for extra crunch and zest.",
      price: 80,
      image: "images/tava_bonda.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: true,
      position: 11,
      tags: ["tava-special"],
    },
    {
      id: "item-13",
      categoryId: "cat-1",
      name: "SAMBHAR IDLY (2 PCS)",
      description: "Two steaming hot idlis immersed and soaked deeply in a bowl of aromatic, slow-simmered vegetable sambhar.",
      price: 60,
      image: "images/sambhar_idly.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 12,
      tags: ["comfort-food", "sambar-dip"],
    },
    {
      id: "item-14",
      categoryId: "cat-1",
      name: "BUTTON SAMBHAR IDLY (6 PCS)",
      description: "Six mini button idlis fully dipped and served in a bowl of piping hot spiced sambhar.",
      price: 60,
      image: "images/button_sambhar_idly.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 13,
      tags: ["sambar-dip"],
    },
    {
      id: "item-15",
      categoryId: "cat-1",
      name: "SAMBHAR WADA (1 PC)",
      description: "Crisp medu vada submerged in hot sambhar, softening to a delicious melt-in-mouth texture.",
      price: 60,
      image: "images/sambhar_wada.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 14,
      tags: ["sambar-dip"],
    },
    {
      id: "item-16",
      categoryId: "cat-1",
      name: "BUTTON GHEE IDLY (8 PCS)",
      description: "Eight bite-sized button idlis served with a rich pour of pure cow ghee, coconut chutney, and sambhar.",
      price: 90,
      image: "images/podi_idly.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 15,
      tags: ["ghee-special"],
    },

    // ── DOSA (Items 17 to 38) ────────────────────────────────────────────────
    {
      id: "item-17",
      categoryId: "cat-2",
      name: "PLAIN DOSA",
      description: "Golden brown, ultra-thin and crispy fermented rice crepe roasted to perfection on cast iron.",
      price: 40,
      image: "images/plain_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 16,
      tags: ["classic", "crispy"],
    },
    {
      id: "item-18",
      categoryId: "cat-2",
      name: "BUTTER PLAIN DOSA",
      description: "Crispy plain dosa roasted generously with fresh creamy butter for rich flavor and aroma.",
      price: 60,
      image: "images/butter_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 17,
      tags: ["butter", "crispy"],
    },
    {
      id: "item-19",
      categoryId: "cat-2",
      name: "MASALA DOSA",
      description: "Crispy golden dosa folded around our signature spiced potato onion masala, served with 3 chutneys & sambhar.",
      price: 60,
      image: "images/masala_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 18,
      tags: ["bestseller", "signature"],
    },
    {
      id: "item-20",
      categoryId: "cat-2",
      name: "ONION DOSA",
      description: "Crisp dosa topped with finely chopped caramelized red onions and fresh green chilies.",
      price: 70,
      image: "images/onion_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 19,
      tags: ["crunchy", "onion"],
    },
    {
      id: "item-21",
      categoryId: "cat-2",
      name: "UPMA MASALA DOSA",
      description: "Unique Andhra style dosa stuffed with seasoned soft semolina upma and spiced potato filling.",
      price: 60,
      image: "images/upma_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 20,
      tags: ["special", "filling"],
    },
    {
      id: "item-22",
      categoryId: "cat-2",
      name: "UPMA BUTTER MASALA DOSA",
      description: "Generous butter roasted dosa packed with savory upma and flavorful potato masala.",
      price: 80,
      image: "images/upma_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 21,
      tags: ["butter", "upma"],
    },
    {
      id: "item-23",
      categoryId: "cat-2",
      name: "ALOO MASALA DOSA",
      description: "Hearty traditional dosa layered with spiced cumin tempered aloo sabzi and roasted golden.",
      price: 60,
      image: "images/masala_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 22,
      tags: ["classic"],
    },
    {
      id: "item-24",
      categoryId: "cat-2",
      name: "ALOO BUTTER MASALA DOSA",
      description: "Aloo masala dosa loaded with creamy yellow butter melting right across the hot crepe.",
      price: 80,
      image: "images/butter_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 23,
      tags: ["butter", "aloo"],
    },
    {
      id: "item-25",
      categoryId: "cat-2",
      name: "GHEE KARAM DOSA – PLAIN",
      description: "Coated with famous spicy red chilli garlic karam podi and roasted purely in fragrant desi ghee.",
      price: 90,
      image: "images/butter_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 24,
      tags: ["spicy", "ghee-roast"],
    },
    {
      id: "item-26",
      categoryId: "cat-2",
      name: "GHEE KARAM MASALA DOSA",
      description: "Fiery spicy garlic karam podi smeared inside with potato masala and finished with rich ghee roast.",
      price: 110,
      image: "images/masala_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 25,
      tags: ["bestseller", "spicy", "ghee"],
    },
    {
      id: "item-27",
      categoryId: "cat-2",
      name: "BUTTER MASALA DOSA",
      description: "Crispy dosa filled with potato bhaji, fried and basted in rich dollops of dairy butter.",
      price: 80,
      image: "images/butter_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 26,
      tags: ["butter", "popular"],
    },
    {
      id: "item-28",
      categoryId: "cat-2",
      name: "BUTTER MASALA CHEESE DOSA",
      description: "Indulgent dosa roasted with butter, filled with potato masala, and blanketed with melted mozzarella cheese.",
      price: 100,
      image: "images/cheese_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 27,
      tags: ["cheese", "cheesy"],
    },
    {
      id: "item-29",
      categoryId: "cat-2",
      name: "BUTTER MASALA PANEER DOSA",
      description: "Delicious butter roasted dosa filled with soft crumbled paneer cottage cheese and spiced potato filling.",
      price: 100,
      image: "images/cheese_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 28,
      tags: ["paneer", "rich"],
    },
    {
      id: "item-30",
      categoryId: "cat-2",
      name: "BUTTER MASALA CHEESE PANEER DOSA",
      description: "Super loaded luxury dosa with both grated melting cheese and soft spiced paneer over buttery potato masala.",
      price: 120,
      image: "images/jini_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 29,
      tags: ["chef-special", "cheese-paneer"],
    },
    {
      id: "item-31",
      categoryId: "cat-2",
      name: "BUTTER CRÈME DOSA",
      description: "Silky smooth crème blended with butter and roasted on a crispy crepe for a creamy, golden treat.",
      price: 90,
      image: "images/butter_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: true,
      position: 30,
      tags: ["creamy", "new"],
    },
    {
      id: "item-32",
      categoryId: "cat-2",
      name: "SCHEZWAN MASALA DOSA",
      description: "Zesty Indo-Chinese fusion dosa smeared with hot tangy Schezwan sauce, cabbage, capsicum, and potato filling.",
      price: 80,
      image: "images/schezwan_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 31,
      tags: ["fusion", "spicy"],
    },
    {
      id: "item-33",
      categoryId: "cat-2",
      name: "SCHEZWAN CHEESE DOSA",
      description: "Fiery Schezwan sauce topped with abundant grated melting cheese on a crispy wafer-thin dosa.",
      price: 100,
      image: "images/cheese_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 32,
      tags: ["fusion", "cheese"],
    },
    {
      id: "item-34",
      categoryId: "cat-2",
      name: "SCHEZWAN BUTTER CHEESE DOSA",
      description: "Rich dairy butter tossed with fiery Schezwan spices and oozy cheese, delivering mouth-watering crunch.",
      price: 120,
      image: "images/jini_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 33,
      tags: ["fusion", "butter-cheese"],
    },
    {
      id: "item-35",
      categoryId: "cat-2",
      name: "SCHEZWAN BUTTER PANEER DOSA",
      description: "Savory paneer chunks tossed in spicy Schezwan butter masala, folded into a crisp crepe.",
      price: 120,
      image: "images/cheese_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 34,
      tags: ["paneer", "schezwan"],
    },
    {
      id: "item-36",
      categoryId: "cat-2",
      name: "SCHEZWAN BUTTER CHEESE PANEER DOSA",
      description: "The complete fusion supreme: Schezwan gravy, butter, abundant grated cheese, and cottage cheese paneer.",
      price: 140,
      image: "images/jini_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 35,
      tags: ["supreme", "loaded"],
    },
    {
      id: "item-37",
      categoryId: "cat-2",
      name: "PIZZA DOSA",
      description: "Fusion sensation cut into slices: Italian pizza sauce, diced bell peppers, sweet corn, onions, and baked mozzarella.",
      price: 180,
      image: "images/jini_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: true,
      position: 36,
      tags: ["pizza-fusion", "kids-favorite"],
    },
    {
      id: "item-38",
      categoryId: "cat-2",
      name: "SATTVA SPECIAL DOSA",
      description: "Grand master delicacy! Signature 3-fold roasted dosa packed with butter, cashew dry fruits, paneer, cheese, and chef special masala.",
      price: 220,
      image: "images/butter_dosa.jpg",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 37,
      tags: ["grand-special", "chef-signature"],
    },

    // ── COOL DRINKS (Items 39 to 47) ─────────────────────────────────────────
    {
      id: "item-39",
      categoryId: "cat-3",
      name: "WATER BOTTLE",
      description: "Sattva Fine Dining chilled packaged drinking water (500 ml), pure and refreshing.",
      price: 10,
      image: "images/water_bottle.png",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 38,
      tags: ["water", "bottle", "sattva", "mineral-water", "chilled", "packaged-drinking-water"],
    },
    {
      id: "item-40",
      categoryId: "cat-3",
      name: "MONSTER",
      description: "Original Monster Energy drink can (350 ml) loaded with taurine, L-carnitine, and an intense energy boost.",
      price: 125,
      image: "images/monster_energy.png",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 39,
      tags: ["monster", "energy-drink", "caffeine", "chilled", "can"],
    },
    {
      id: "item-41",
      categoryId: "cat-3",
      name: "FANTA PET",
      description: "Vibrant and refreshing orange fruit-flavored sparkling soda served ice-cold in a convenient PET bottle.",
      price: 20,
      image: "images/fanta_pet.png",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 40,
      tags: ["fanta", "orange", "soda", "pet", "bottle", "chilled"],
    },
    {
      id: "item-42",
      categoryId: "cat-3",
      name: "REDBULL PINK",
      description: "Red Bull Pink Edition energy drink can featuring delicious wild berries flavour, served chilled.",
      price: 125,
      image: "images/redbull_pink.png",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: true,
      position: 41,
      tags: ["redbull", "pink", "berries", "energy-drink", "can", "red bull"],
    },
    {
      id: "item-43",
      categoryId: "cat-3",
      name: "REDBULL ORIGINAL",
      description: "The world-famous Red Bull Energy Drink can that vitalizes body and mind with taurine and B-vitamins.",
      price: 125,
      image: "images/redbull_original.png",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 42,
      tags: ["redbull", "original", "energy-drink", "can", "red bull"],
    },
    {
      id: "item-44",
      categoryId: "cat-3",
      name: "THUMBS UP CAN",
      description: "Iconic fizzy, strong, and spicy cola in an ice-cold 300 ml aluminum can. Taste the thunder!",
      price: 40,
      image: "images/thums_up_can.png",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 43,
      tags: ["thumbs-up", "thums-up", "cola", "can", "thunder", "soda"],
    },
    {
      id: "item-45",
      categoryId: "cat-3",
      name: "THUMPS UP PET BOTTLE",
      description: "Classic strong carbonated Thums Up cola served chilled in an easy-to-carry 250 ml PET bottle.",
      price: 20,
      image: "images/thums_up_pet.png",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 44,
      tags: ["thumps-up", "thumbs-up", "thums-up", "cola", "pet", "bottle", "soda"],
    },
    {
      id: "item-46",
      categoryId: "cat-3",
      name: "SPRITE CAN",
      description: "Crisp, clean, and refreshing lemon-lime sparkling soft drink in an ice-cold 300 ml can.",
      price: 40,
      image: "images/sprite_can.png",
      isVeg: true,
      isAvailable: true,
      isBestseller: false,
      isNew: false,
      position: 45,
      tags: ["sprite", "lemon-lime", "can", "soda", "chilled"],
    },
    {
      id: "item-47",
      categoryId: "cat-3",
      name: "COCACOLA CAN",
      description: "Original crisp and classic Coca-Cola taste, perfectly carbonated and served chilled in a 300 ml can.",
      price: 40,
      image: "images/cocacola_can.png",
      isVeg: true,
      isAvailable: true,
      isBestseller: true,
      isNew: false,
      position: 46,
      tags: ["cocacola", "coca-cola", "coke", "can", "cola", "chilled"],
    }
  ]
};

// ── Permanent Orders Storage Vault ─────────────────────────────────────────
const ORDERS_VAULT_KEY = 'sattva_permanent_orders_vault';
const ORDERS_BACKUP_KEY = 'sattva_orders_backup_archive';

function isDummyOrder(o) {
  if (!o) return true;
  const name = String(o.customerName || '').toLowerCase().trim();
  if (name === 'noname' || name === 'dummy' || name === 'test order' || name === 'test') return true;
  if (String(o.id || '').startsWith('ORD-TEST-') || String(o.id || '').startsWith('ORD-E2E-')) return true;
  return false;
}
if (typeof window !== 'undefined') window.isDummyOrder = isDummyOrder;

function loadPermanentOrders() {
  const ordersMap = new Map();
  // 1. Vault key
  try {
    const raw = localStorage.getItem(ORDERS_VAULT_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(o => { if (o && (o.id || o.tokenId) && !isDummyOrder(o)) ordersMap.set(String(o.id || o.tokenId), o); });
      }
    }
  } catch (e) {}
  // 2. Backup archive
  try {
    const raw = localStorage.getItem(ORDERS_BACKUP_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(o => { if (o && (o.id || o.tokenId) && !isDummyOrder(o) && !ordersMap.has(String(o.id || o.tokenId))) ordersMap.set(String(o.id || o.tokenId), o); });
      }
    }
  } catch (e) {}
  // 3. restaurantData.orders
  try {
    const raw = localStorage.getItem('restaurantData');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.orders)) {
        parsed.orders.forEach(o => { if (o && (o.id || o.tokenId) && !isDummyOrder(o) && !ordersMap.has(String(o.id || o.tokenId))) ordersMap.set(String(o.id || o.tokenId), o); });
      }
    }
  } catch (e) {}

  return Array.from(ordersMap.values());
}
if (typeof window !== 'undefined') window.loadPermanentOrders = loadPermanentOrders;

function savePermanentOrders(orders) {
  if (!Array.isArray(orders)) return;
  const clean = orders.filter(o => !isDummyOrder(o));
  try {
    const json = JSON.stringify(clean);
    localStorage.setItem(ORDERS_VAULT_KEY, json);
    localStorage.setItem(ORDERS_BACKUP_KEY, json);
  } catch (e) {
    console.warn('[OrdersVault] Failed to write orders vault:', e);
  }
}
if (typeof window !== 'undefined') window.savePermanentOrders = savePermanentOrders;

// ── Storage Helpers ────────────────────────────────────────────────────────
function loadData() {
  const existingOrders = loadPermanentOrders();
  let result = null;

  try {
    const raw = localStorage.getItem('restaurantData');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.categories) && Array.isArray(parsed.items) && parsed.items.length > 0) {
          result = parsed;
        }
      }
    }
  } catch (e) { /* ignore */ }

  if (!result) {
    result = structuredClone(DEFAULT_DATA);
  }

  // Migration: upgrade all item images to fast local assets
  if (result.items && Array.isArray(result.items)) {
    const localMap = {"item-1":"images/idly_plate.jpg","item-2":"images/medu_vada.jpg","item-3":"images/mysore_bonda.jpg","item-4":"images/idli_vada_plate.jpg","item-5":"images/idly_bonda.jpg","item-6":"images/idli_vada_trio.jpg","item-7":"images/ghee_idly.jpg","item-8":"images/podi_idly.jpg","item-9":"images/idly_plate.jpg","item-10":"images/ghee_idly.jpg","item-11":"images/tava_wada.jpg","item-12":"images/tava_bonda.jpg","item-13":"images/sambhar_idly.jpg","item-14":"images/button_sambhar_idly.jpg","item-15":"images/sambhar_wada.jpg","item-16":"images/podi_idly.jpg","item-17":"images/plain_dosa.jpg","item-18":"images/butter_dosa.jpg","item-19":"images/masala_dosa.jpg","item-20":"images/onion_dosa.jpg","item-21":"images/upma_dosa.jpg","item-22":"images/upma_dosa.jpg","item-23":"images/masala_dosa.jpg","item-24":"images/butter_dosa.jpg","item-25":"images/butter_dosa.jpg","item-26":"images/masala_dosa.jpg","item-27":"images/butter_dosa.jpg","item-28":"images/cheese_dosa.jpg","item-29":"images/cheese_dosa.jpg","item-30":"images/jini_dosa.jpg","item-31":"images/butter_dosa.jpg","item-32":"images/schezwan_dosa.jpg","item-33":"images/cheese_dosa.jpg","item-34":"images/jini_dosa.jpg","item-35":"images/cheese_dosa.jpg","item-36":"images/jini_dosa.jpg","item-37":"images/jini_dosa.jpg","item-38":"images/butter_dosa.jpg"};
    result.items.forEach(it => {
      if (localMap[it.id]) it.image = localMap[it.id];
      else if (it.image && (it.image.includes('wikimedia') || it.image.includes('unsplash'))) {
        if (it.categoryId === 'cat-1') it.image = 'images/idly_plate.jpg';
        else if (it.categoryId === 'cat-2') it.image = 'images/masala_dosa.jpg';
      }
    });
    if (result.store) {
      if (!result.store.logo || result.store.logo.includes('wikimedia')) result.store.logo = 'images/sattva_logo.png';
      if (!result.store.bannerImage || result.store.bannerImage.includes('unsplash')) result.store.bannerImage = 'images/banner.jpg';
    }
  }

  // Migration: ensure cool drinks category and items exist
  if (result.categories && result.items) {
    const hasCoolDrinks = result.categories.some(c => c.id === 'cat-3' || (c.name && c.name.toLowerCase().includes('cool drink')));
    if (!hasCoolDrinks) {
      const coolCat = DEFAULT_DATA.categories.find(c => c.id === 'cat-3');
      if (coolCat) result.categories.push(structuredClone(coolCat));
    } else {
      const existingCat = result.categories.find(c => c.id === 'cat-3' || (c.name && c.name.toLowerCase().includes('cool drink')));
      if (existingCat) {
        existingCat.id = 'cat-3';
        existingCat.name = 'Cool Drinks';
        existingCat.icon = '🥤';
        existingCat.image = 'images/cool_drinks.png';
      }
    }
    const coolItems = DEFAULT_DATA.items.filter(it => it.categoryId === 'cat-3');
    for (const ci of coolItems) {
      const existingIdx = result.items.findIndex(it => it.id === ci.id || (it.name && it.name.toUpperCase() === ci.name.toUpperCase()));
      if (existingIdx === -1) {
        result.items.push(structuredClone(ci));
      } else {
        result.items[existingIdx].image = ci.image;
        result.items[existingIdx].price = ci.price;
        result.items[existingIdx].categoryId = 'cat-3';
        result.items[existingIdx].description = ci.description;
        result.items[existingIdx].tags = ci.tags;
      }
    }
  }

  // SECURE ORDERS PRESERVATION:
  // Merge orders from permanent vault and result so NO order is EVER deleted automatically
  const ordersMap = new Map();
  existingOrders.forEach(o => { if (o && (o.id || o.tokenId) && !isDummyOrder(o)) ordersMap.set(String(o.id || o.tokenId), o); });
  if (Array.isArray(result.orders)) {
    result.orders.forEach(o => { if (o && (o.id || o.tokenId) && !isDummyOrder(o)) ordersMap.set(String(o.id || o.tokenId), o); });
  }

  result.orders = Array.from(ordersMap.values());
  result._version = DATA_VERSION;

  savePermanentOrders(result.orders);
  try {
    localStorage.setItem('restaurantData', JSON.stringify(result));
  } catch (e) {}

  return result;
}

function saveData(data) {
  data._version = DATA_VERSION;
  if (Array.isArray(data.orders)) {
    savePermanentOrders(data.orders);
  }
  try {
    localStorage.setItem('restaurantData', JSON.stringify(data));
  } catch (e) {
    console.warn('[Storage] Failed to save restaurantData:', e);
  }
}

function resetData() {
  // CRITICAL: NEVER wipe user orders on reset!
  const preservedOrders = loadPermanentOrders();
  const fresh = structuredClone(DEFAULT_DATA);
  fresh.orders = preservedOrders;
  saveData(fresh);
  return fresh;
}

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getCategoryDisplayName(cat) {
  if (!cat) return '';
  const raw = typeof cat === 'string' ? cat : (cat.name || '');
  let name = raw.trim();
  if (typeof cat === 'object' && cat.icon && name.startsWith(cat.icon)) {
    name = name.slice(cat.icon.length).trim();
  }
  name = name.replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/u, '').trim();
  return name || raw;
}
if (typeof window !== 'undefined') window.getCategoryDisplayName = getCategoryDisplayName;

// ── Shared Utilities ───────────────────────────────────────────────────────
function getCustomizations(item) {
  if (!item) return [];
  const c = item.customizations;
  if (!c) return [];
  if (Array.isArray(c)) {
    return c.map(s => typeof s === 'string' ? s.trim() : (s.name || String(s)).trim()).filter(Boolean);
  }
  if (typeof c === 'string') {
    return c.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}
if (typeof window !== 'undefined') window.getCustomizations = getCustomizations;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
if (typeof window !== 'undefined') window.escHtml = escHtml;

function parseOrderItems(items) {
  if (!items) return [];
  if (Array.isArray(items)) return items.filter(Boolean);
  if (typeof items === 'string') {
    const trimmed = items.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.items)) return parsed.items.filter(Boolean);
          if (Array.isArray(parsed.data)) return parsed.data.filter(Boolean);
          if (Array.isArray(parsed.list)) return parsed.list.filter(Boolean);
          return Object.values(parsed).filter(Boolean);
        }
      } catch (e) {}
    }
    // Handle comma-separated text lines like '2x Masala Dosa, 1x Idly'
    return trimmed.split(',').map(part => {
      const pTrim = part.trim();
      const match = pTrim.match(/^(\d+)\s*[x×*]\s*(.+)$/i) || pTrim.match(/^(.+?)\s*\([x×*]?\s*(\d+)\s*(?:pcs?|pc)?\)$/i);
      if (match) {
        return { name: match[2].trim(), qty: parseInt(match[1], 10) || 1, price: 0 };
      }
      return { name: pTrim, qty: 1, price: 0 };
    }).filter(it => it.name);
  }
  if (typeof items === 'object') {
    if (Array.isArray(items.items)) return items.items.filter(Boolean);
    if (Array.isArray(items.data)) return items.data.filter(Boolean);
    if (Array.isArray(items.list)) return items.list.filter(Boolean);
    return Object.values(items).filter(Boolean);
  }
  return [];
}
if (typeof window !== 'undefined') window.parseOrderItems = parseOrderItems;

if (typeof window !== 'undefined') {
  window.DEFAULT_DATA = DEFAULT_DATA;
  window.loadData = loadData;
  window.saveData = saveData;
  window.resetData = resetData;
  window.generateId = generateId;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEFAULT_DATA, loadData, saveData, resetData, generateId, loadPermanentOrders, savePermanentOrders, isDummyOrder };
}
