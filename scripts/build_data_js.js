const fs = require('fs');
const db = require('better-sqlite3')('data/noor_optics.db');

const rows = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
const catalog = rows.map((p, idx) => {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    collection: p.brand + ' Luxury Collection',
    price: Math.round(p.selling_price_paise / 100),
    originalPrice: Math.round(p.selling_price_paise / 100) + 500,
    badge: (idx % 5 === 0) ? 'New Arrival' : ((idx % 7 === 0) ? 'Bestseller' : 'Limited'),
    shape: p.shape || 'Rectangular',
    material: p.material || 'Italian Bio-Acetate',
    fit: p.fit || 'Regular',
    category: p.category || 'Optical',
    rating: (4.7 + ((idx % 3) * 0.1)).toFixed(1),
    reviewsCount: 15 + (idx * 3),
    image: p.image_url.startsWith('/') ? p.image_url.slice(1) : p.image_url,
    colors: [
      { name: 'Classic Edition', hex: '#1A1A1A' }
    ],
    dimensions: { lens: '53mm', bridge: '18mm', temple: '145mm', weight: '18g' },
    description: p.description
  };
});

const fileContent = `/**
 * data.js – Noor Optics Brand & Product Catalog
 * Authoritative optical frames inventory (${catalog.length} curated frames).
 */

'use strict';

const NOOR_BRAND = {
  name: "Noor Optics",
  descriptor: "EYEGLASSES",
  tagline: "Curated Luxury Eyewear and Precision Lenses",
  founded: "2024",
  currency: "₹",
  freeShippingThreshold: 1999,
  contactPhone: "+91 98765 43210",
  contactEmail: "concierge@nooroptics.com",
  storeAddress: "Noor Optics Flagship Boutique, Indiranagar, Bengaluru",
  workingHours: "10:00 AM – 09:00 PM (Daily)",
  warrantyText: "2-Year Comprehensive Frame and Coating Warranty",
  shippingText: "Free Express Delivery on orders above ₹1,999"
};

const LENS_PACKAGES = [
  {
    id: "lens-bluecut",
    name: "Blue-Light Filter (Computer and Screen)",
    tag: "Standard",
    price: 0,
    description: "Blocks 99% harmful HEV blue light with zero color distortion."
  },
  {
    id: "lens-antiglare",
    name: "1.60 High-Index Anti-Reflective",
    tag: "Popular",
    price: 699,
    description: "Ultra-thin, hydrophobic, smudge and scratch resistant multi-coat."
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

const EYEWEAR_CATALOG = ${JSON.stringify(catalog, null, 2)};

// ── State Persistence Helpers ─────────────────────────────────────────────────
const STORAGE_KEYS = {
  CART: "noor_optics_cart_v3",
  WISHLIST: "noor_optics_wishlist_v3",
  SEARCH_RECENT: "noor_optics_recent_queries_v3"
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NOOR_BRAND,
    LENS_PACKAGES,
    EYEWEAR_CATALOG,
    getSavedCart,
    saveCart,
    getSavedWishlist,
    saveWishlist
  };
}
`;

fs.writeFileSync('data.js', fileContent, 'utf8');
console.log('Successfully wrote data.js with', catalog.length, 'frames');
