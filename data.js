/**
 * data.js – Noor Optics Brand & Product Catalog
 * Scandinavian-inspired luxury eyewear collection with 18 curated frames.
 */

'use strict';

const NOOR_BRAND = {
  name: "Noor Optics",
  descriptor: "EYEGLASSES",
  tagline: "Curated Scandinavian Eyewear & Precision Lenses",
  founded: "2024",
  currency: "₹",
  freeShippingThreshold: 1999,
  contactPhone: "+91 98765 43210",
  contactEmail: "concierge@nooroptics.com",
  storeAddress: "Noor Optics Flagship Boutique, Indiranagar, Bengaluru",
  workingHours: "10:00 AM – 09:00 PM (Daily)",
  warrantyText: "2-Year Comprehensive Frame & Coating Warranty",
  shippingText: "Free Express Delivery on orders above ₹1,999"
};

const LENS_PACKAGES = [
  {
    id: "lens-bluecut",
    name: "Blue-Light Filter (Computer & Screen)",
    tag: "Standard",
    price: 0,
    description: "Blocks 99% harmful HEV blue light with zero color distortion."
  },
  {
    id: "lens-antiglare",
    name: "1.60 High-Index Anti-Reflective",
    tag: "Popular",
    price: 699,
    description: "Ultra-thin, hydrophobic, smudge & scratch resistant multi-coat."
  },
  {
    id: "lens-progressive",
    name: "Digital Free-Form Progressive",
    tag: "Precision",
    price: 1499,
    description: "Seamless corridor transition from reading to distance vision."
  },
  {
    id: "lens-photochromic",
    name: "Adaptive Photochromic Transition",
    tag: "All-Day",
    price: 1199,
    description: "Rapidly darkens into grey sunglasses outdoors in UV sunlight."
  }
];

const EYEWEAR_CATALOG = [
  {
    id: "noor-01",
    name: "The Stockholm Noir",
    collection: "Nordic Minimalist",
    price: 3499,
    originalPrice: 4299,
    badge: "Bestseller",
    shape: "Rectangular",
    material: "Japanese Titanium",
    fit: "Regular",
    category: "Optical",
    rating: 4.9,
    reviewsCount: 142,
    image: "images/stockholm_noir.jpg",
    colors: [
      { name: "Matte Black", hex: "#1A1A1A" },
      { name: "Gunmetal", hex: "#4A4D52" },
      { name: "Brushed Silver", hex: "#D1D5DB" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "14g" },
    description: "An architectural masterpiece engineered from aerospace-grade Japanese titanium. Featherweight rectangular profile with custom barrel hinges and medical-grade silicone nose pads for effortless all-day wear."
  },
  {
    id: "noor-02",
    name: "The Copenhagen Round",
    collection: "Atelier Heritage",
    price: 3899,
    originalPrice: 4799,
    badge: "New Arrival",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Narrow",
    category: "Optical",
    rating: 5.0,
    reviewsCount: 88,
    image: "images/copenhagen_round.jpg",
    colors: [
      { name: "Dark Havana", hex: "#5C3A21" },
      { name: "Classic Tortoise", hex: "#8A5A36" },
      { name: "Onyx Black", hex: "#151515" }
    ],
    dimensions: { lens: "48mm", bridge: "21mm", temple: "142mm", weight: "19g" },
    description: "Timeless mid-century round silhouette featuring hand-beveled Italian bio-acetate and our signature keyhole bridge. Finished with hand-riveted hinges and wire-core temple detailing."
  },
  {
    id: "noor-03",
    name: "The Oslo Crystal",
    collection: "Clear Architectural",
    price: 3699,
    originalPrice: 4499,
    badge: "Trending",
    shape: "Square",
    material: "Crystal Bio-Acetate",
    fit: "Regular",
    category: "Blue-Light",
    rating: 4.8,
    reviewsCount: 104,
    image: "images/oslo_crystal.jpg",
    colors: [
      { name: "Champagne Crystal", hex: "#F3EDE2" },
      { name: "Pure Clear", hex: "#E8EAEF" },
      { name: "Smoky Quartz", hex: "#8E8882" }
    ],
    dimensions: { lens: "51mm", bridge: "19mm", temple: "145mm", weight: "21g" },
    description: "Exquisite hand-polished translucent bio-acetate revealing an intricately engraved golden titanium core wire. The square silhouette flatters round and oval face profiles with effortless poise."
  },
  {
    id: "noor-04",
    name: "The Kyoto Havana",
    collection: "Atelier Heritage",
    price: 4199,
    originalPrice: 5199,
    badge: "Handcrafted",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    category: "Optical",
    rating: 4.9,
    reviewsCount: 167,
    image: "images/kyoto_havana.jpg",
    colors: [
      { name: "Honey Tortoise", hex: "#C68239" },
      { name: "Deep Amber", hex: "#8E4B17" },
      { name: "Chestnut", hex: "#4B2810" }
    ],
    dimensions: { lens: "49mm", bridge: "20mm", temple: "144mm", weight: "22g" },
    description: "Mazzucchelli acetate cured for 90 days before precision cutting and hand tumbling for 72 hours. Rich amber marbling with dual dot-rivets on each endpiece."
  },
  {
    id: "noor-05",
    name: "The Milan Aureum",
    collection: "Titanium Wire",
    price: 4599,
    originalPrice: 5499,
    badge: "Luxury Edition",
    shape: "Aviator",
    material: "Japanese Titanium",
    fit: "Wide",
    category: "Sun Optical",
    rating: 5.0,
    reviewsCount: 76,
    image: "images/milan_aureum.jpg",
    colors: [
      { name: "Champagne Gold", hex: "#D4AF37" },
      { name: "Rose Gold", hex: "#B76E79" },
      { name: "Brushed Platinum", hex: "#E5E4E2" }
    ],
    dimensions: { lens: "56mm", bridge: "16mm", temple: "145mm", weight: "13g" },
    description: "A refined reinterpretation of the classic double-bridge pilot frame. Milled from single-sheet beta-titanium with hand-engraved filigree motifs along the eyewire and temples."
  },
  {
    id: "noor-06",
    name: "The Zurich Titanium",
    collection: "Titanium Wire",
    price: 4299,
    originalPrice: 5199,
    badge: "Ultralight",
    shape: "Rectangular",
    material: "Japanese Titanium",
    fit: "Regular",
    category: "Optical",
    rating: 4.8,
    reviewsCount: 92,
    image: "images/zurich_titanium.jpg",
    colors: [
      { name: "Matte Silver", hex: "#C0C0C0" },
      { name: "Titanium Grey", hex: "#63666A" },
      { name: "Satin Black", hex: "#222222" }
    ],
    dimensions: { lens: "53mm", bridge: "18mm", temple: "148mm", weight: "12g" },
    description: "Weighing only 12 grams, the Zurich embodies Swiss reductionist principles. Features an innovative hinge with zero screws, eliminating mechanical wear and looseness forever."
  },
  {
    id: "noor-07",
    name: "The Berlin Hex",
    collection: "Geometric Series",
    price: 3799,
    originalPrice: 4599,
    badge: "Design Award",
    shape: "Geometric",
    material: "Stainless Steel",
    fit: "Regular",
    category: "Optical",
    rating: 4.9,
    reviewsCount: 115,
    image: "images/berlin_hex.jpg",
    colors: [
      { name: "Gunmetal Steel", hex: "#3A3D40" },
      { name: "Matte Gold", hex: "#CFB53B" },
      { name: "Raw Silver", hex: "#DCDCDC" }
    ],
    dimensions: { lens: "50mm", bridge: "20mm", temple: "145mm", weight: "16g" },
    description: "Bauhaus-inspired hexagonal geometry that sharpens facial contours. Crafted from cold-rolled German medical stainless steel for incredible structural resilience with thin elegance."
  },
  {
    id: "noor-08",
    name: "The Helsinki Quad",
    collection: "Nordic Minimalist",
    price: 3999,
    originalPrice: 4899,
    badge: "Bestseller",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Wide",
    category: "Optical",
    rating: 4.9,
    reviewsCount: 138,
    image: "images/helsinki_quad.jpg",
    colors: [
      { name: "Forest Olive", hex: "#4B5320" },
      { name: "Matte Black", hex: "#181818" },
      { name: "Deep Cognac", hex: "#7B3F00" }
    ],
    dimensions: { lens: "53mm", bridge: "19mm", temple: "146mm", weight: "24g" },
    description: "Commanding architectural square frame cut from 8mm thick Italian bio-acetate with sculpted inner bevels that reduce weight while preserving a bold, confident silhouette."
  },
  {
    id: "noor-09",
    name: "The Reykjavik Pilot",
    collection: "Titanium Wire",
    price: 4399,
    originalPrice: 5299,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Japanese Titanium",
    fit: "Regular",
    category: "Sun Optical",
    rating: 4.7,
    reviewsCount: 64,
    image: "images/reykjavik_pilot.jpg",
    colors: [
      { name: "Graphite", hex: "#41424C" },
      { name: "Brushed Gold", hex: "#D4AF37" },
      { name: "Pure Titanium", hex: "#A8A9AD" }
    ],
    dimensions: { lens: "55mm", bridge: "17mm", temple: "145mm", weight: "14g" },
    description: "Subtle teardrop contours paired with an ultra-slim top stabilization bar. Perfect balance between retro aviator heritage and futuristic Nordic clarity."
  },
  {
    id: "noor-10",
    name: "The Vienna Silhouette",
    collection: "Atelier Heritage",
    price: 4199,
    originalPrice: 4999,
    badge: "Signature",
    shape: "Cat-Eye",
    material: "Italian Bio-Acetate",
    fit: "Narrow",
    category: "Optical",
    rating: 5.0,
    reviewsCount: 112,
    image: "images/vienna_silhouette.jpg",
    colors: [
      { name: "Burgundy Wine", hex: "#5C1D24" },
      { name: "Midnight Black", hex: "#111111" },
      { name: "Milky Tortoise", hex: "#9E7B5A" }
    ],
    dimensions: { lens: "51mm", bridge: "18mm", temple: "140mm", weight: "20g" },
    description: "Softly uplifted cat-eye brow line that adds gentle lift to the face without dramatic excess. Milled in northern Italy with 5-barrel German OBE hinges."
  },
  {
    id: "noor-11",
    name: "The Amber Arch",
    collection: "Clear Architectural",
    price: 3599,
    originalPrice: 4399,
    badge: "Trending",
    shape: "Round",
    material: "Crystal Bio-Acetate",
    fit: "Regular",
    category: "Optical",
    rating: 4.8,
    reviewsCount: 89,
    image: "images/amber_arch.jpg",
    colors: [
      { name: "Honey Amber", hex: "#D68A36" },
      { name: "Caramel Clear", hex: "#B87333" },
      { name: "Crystal Ice", hex: "#E5E9EC" }
    ],
    dimensions: { lens: "49mm", bridge: "20mm", temple: "145mm", weight: "20g" },
    description: "Glowing honey-amber translucent acetate that catches the light like molten glass. Features balanced round proportions that harmonize effortlessly with casual and formal attire."
  },
  {
    id: "noor-12",
    name: "The Tokyo Steel",
    collection: "Titanium Wire",
    price: 4499,
    originalPrice: 5499,
    badge: "Ultralight",
    shape: "Round",
    material: "Japanese Titanium",
    fit: "Narrow",
    category: "Blue-Light",
    rating: 4.9,
    reviewsCount: 147,
    image: "images/tokyo_steel.jpg",
    colors: [
      { name: "Satin Black", hex: "#1C1C1C" },
      { name: "Antique Bronze", hex: "#6E4D25" },
      { name: "Polished Silver", hex: "#C5C6C7" }
    ],
    dimensions: { lens: "47mm", bridge: "21mm", temple: "145mm", weight: "11g" },
    description: "Handcrafted in Sabae, Japan — the optical capital of the world. Pure Japanese beta-titanium wire rim with flexible temple tips that naturally curve behind the ears without pressure points."
  },
  {
    id: "noor-13",
    name: "The Geneva Feather",
    collection: "Titanium Wire",
    price: 4699,
    originalPrice: 5699,
    badge: "Ultralight",
    shape: "Oval",
    material: "Japanese Titanium",
    fit: "Narrow",
    category: "Optical",
    rating: 4.8,
    reviewsCount: 53,
    image: "images/zurich_titanium.jpg",
    colors: [
      { name: "Frosted Titanium", hex: "#A0A2A6" },
      { name: "Matte Gold", hex: "#D8C078" },
      { name: "Midnight Navy", hex: "#1E2A3A" }
    ],
    dimensions: { lens: "49mm", bridge: "19mm", temple: "145mm", weight: "10g" },
    description: "An ethereal 10-gram oval rimless-inspired design. Engineered for professionals seeking an invisible optical presence paired with uncompromising optical clarity."
  },
  {
    id: "noor-14",
    name: "The Malmö Olive",
    collection: "Nordic Minimalist",
    price: 3699,
    originalPrice: 4399,
    badge: "Handcrafted",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    category: "Optical",
    rating: 4.9,
    reviewsCount: 79,
    image: "images/helsinki_quad.jpg",
    colors: [
      { name: "Muted Olive", hex: "#556B2F" },
      { name: "Charcoal Slate", hex: "#2F4F4F" },
      { name: "Black Sand", hex: "#232B2B" }
    ],
    dimensions: { lens: "51mm", bridge: "20mm", temple: "145mm", weight: "22g" },
    description: "Understated square proportions rendered in custom-cast matte olive bio-acetate. Designed in Sweden with clean lines and comfortable saddle bridge distribution."
  },
  {
    id: "noor-15",
    name: "The Paris Oval",
    collection: "Atelier Heritage",
    price: 3899,
    originalPrice: 4699,
    badge: "New Arrival",
    shape: "Oval",
    material: "Stainless Steel",
    fit: "Narrow",
    category: "Optical",
    rating: 4.7,
    reviewsCount: 42,
    image: "images/copenhagen_round.jpg",
    colors: [
      { name: "Rose Bronze", hex: "#8C584A" },
      { name: "Champagne", hex: "#E6D5AC" },
      { name: "Matte Black", hex: "#1A1A1A" }
    ],
    dimensions: { lens: "48mm", bridge: "20mm", temple: "142mm", weight: "15g" },
    description: "Chic Parisian silhouette blending soft oval curves with sharp structural bridge architecture. Perfect for smaller facial profiles seeking refined intellectual flair."
  },
  {
    id: "noor-16",
    name: "The Arctic Mist",
    collection: "Clear Architectural",
    price: 3799,
    originalPrice: 4599,
    badge: "Trending",
    shape: "Rectangular",
    material: "Crystal Bio-Acetate",
    fit: "Regular",
    category: "Blue-Light",
    rating: 4.9,
    reviewsCount: 97,
    image: "images/oslo_crystal.jpg",
    colors: [
      { name: "Frosted Smoke", hex: "#708090" },
      { name: "Crystal Clear", hex: "#F5F5F7" },
      { name: "Pale Sage", hex: "#9CAF88" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "146mm", weight: "20g" },
    description: "Frosted semi-matte crystal acetate mimicking ice formations in the northern fjords. Fitted with premium zero-power Blue-Light Shield lenses for screen protection."
  },
  {
    id: "noor-17",
    name: "The Bergen Dual",
    collection: "Nordic Minimalist",
    price: 4299,
    originalPrice: 5199,
    badge: "Limited Edition",
    shape: "Square",
    material: "Japanese Titanium",
    fit: "Wide",
    category: "Optical",
    rating: 5.0,
    reviewsCount: 68,
    image: "images/stockholm_noir.jpg",
    colors: [
      { name: "Matte Black & Gold", hex: "#222222" },
      { name: "Silver & Navy", hex: "#3A4D6B" },
      { name: "Titanium & Havana", hex: "#634731" }
    ],
    dimensions: { lens: "54mm", bridge: "19mm", temple: "148mm", weight: "17g" },
    description: "A dual-material combination frame fusing lightweight titanium rim inserts with sculpted matte bio-acetate brows. Contemporary luxury with extraordinary structural strength."
  },
  {
    id: "noor-18",
    name: "The Bordeaux Edge",
    collection: "Atelier Heritage",
    price: 4099,
    originalPrice: 4899,
    badge: "Signature",
    shape: "Cat-Eye",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    category: "Sun Optical",
    rating: 4.8,
    reviewsCount: 81,
    image: "images/vienna_silhouette.jpg",
    colors: [
      { name: "Bordeaux Merlot", hex: "#4A1521" },
      { name: "Espresso", hex: "#2B1B17" },
      { name: "Tiger Tortoise", hex: "#8B5A2B" }
    ],
    dimensions: { lens: "52mm", bridge: "19mm", temple: "142mm", weight: "21g" },
    description: "Deep burgundy hues polished to a mirror gloss. Sculpted bevels catch ambient light across the cheekbones, providing a tailored European optical look."
  }
];

// ── State Persistence Helpers ─────────────────────────────────────────────────
const STORAGE_KEYS = {
  CART: "noor_optics_cart_v1",
  WISHLIST: "noor_optics_wishlist_v1",
  SEARCH_RECENT: "noor_optics_recent_queries_v1"
};

function getSavedCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cartItems) {
  try {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cartItems));
  } catch (e) {}
}

function getSavedWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WISHLIST);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(wishlistIds) {
  try {
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlistIds));
  } catch (e) {}
}

if (typeof window !== "undefined") {
  window.NOOR_BRAND = NOOR_BRAND;
  window.EYEWEAR_CATALOG = EYEWEAR_CATALOG;
  window.LENS_PACKAGES = LENS_PACKAGES;
  window.getSavedCart = getSavedCart;
  window.saveCart = saveCart;
  window.getSavedWishlist = getSavedWishlist;
  window.saveWishlist = saveWishlist;
}
