/**
 * data.js – Noor Optics Brand & Product Catalog
 * Authoritative optical frames inventory (56 curated frames).
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

const EYEWEAR_CATALOG = [
  {
    "id": "prod-1793606608894",
    "sku": "RAY BAN",
    "name": "meta glasses meta",
    "brand": "meta glasses",
    "collection": "meta glasses Luxury Collection",
    "price": 48000,
    "originalPrice": 48500,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Acetate",
    "fit": "M",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 15,
    "image": "data:image/jpeg;base64,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",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: meta glasses | Model: meta | Color: black | Size: M"
  },
  {
    "id": "prod-noor-01",
    "sku": "NOOR-CRT-01",
    "name": "Cartier Panther Gold",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1461,
    "originalPrice": 1961,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 18,
    "image": "images/frames/frame_01.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Panther Gold | Color: Gold | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-02",
    "sku": "NOOR-CRT-02",
    "name": "Cartier Sunset Rimless",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1448,
    "originalPrice": 1948,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 21,
    "image": "images/frames/frame_02.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Sunset Rimless | Color: Brown Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-03",
    "sku": "NOOR-CRT-03",
    "name": "Cartier Blue Horizon",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1456,
    "originalPrice": 1956,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 24,
    "image": "images/frames/frame_03.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Blue Horizon | Color: Blue Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-04",
    "sku": "NOOR-CRT-04",
    "name": "Cartier Hexagon Facet",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1455,
    "originalPrice": 1955,
    "badge": "Limited",
    "shape": "Hex / Geometric",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 27,
    "image": "images/frames/frame_04.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Hexagon Facet | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-05",
    "sku": "NOOR-CRT-05",
    "name": "Cartier Crystal Rimless",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1425,
    "originalPrice": 1925,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 30,
    "image": "images/frames/frame_05.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Crystal Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-06",
    "sku": "NOOR-CRT-06",
    "name": "Cartier Gold Aviator",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1433,
    "originalPrice": 1933,
    "badge": "Limited",
    "shape": "Aviator",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 33,
    "image": "images/frames/frame_06.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Gold Aviator | Color: Gold | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-07",
    "sku": "NOOR-CRT-07",
    "name": "Cartier Black Panther",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1456,
    "originalPrice": 1956,
    "badge": "Bestseller",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 36,
    "image": "images/frames/frame_07.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Black Panther | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-08",
    "sku": "NOOR-CRT-08",
    "name": "Cartier Brown Silhouette",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1432,
    "originalPrice": 1932,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 39,
    "image": "images/frames/frame_08.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Brown Silhouette | Color: Brown Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-09",
    "sku": "NOOR-CRT-09",
    "name": "Cartier Mirage Shield",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1450,
    "originalPrice": 1950,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 42,
    "image": "images/frames/frame_09.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Mirage Shield | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-10",
    "sku": "NOOR-CRT-10",
    "name": "Cartier Double Bridge",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1468,
    "originalPrice": 1968,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 45,
    "image": "images/frames/frame_10.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Double Bridge | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-11",
    "sku": "NOOR-CRT-11",
    "name": "Cartier Amber Luxe",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1443,
    "originalPrice": 1943,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 48,
    "image": "images/frames/frame_11.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Amber Luxe | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-12",
    "sku": "NOOR-CRT-12",
    "name": "Cartier Silver Facet",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1499,
    "originalPrice": 1999,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 51,
    "image": "images/frames/frame_12.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Silver Facet | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-13",
    "sku": "NOOR-CRT-13",
    "name": "Cartier Diamond Cut",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1486,
    "originalPrice": 1986,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 54,
    "image": "images/frames/frame_13.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Diamond Cut | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-14",
    "sku": "NOOR-VRC-14",
    "name": "Versace Medusa Havana",
    "brand": "Versace",
    "collection": "Versace Luxury Collection",
    "price": 1485,
    "originalPrice": 1985,
    "badge": "Bestseller",
    "shape": "Square",
    "material": "Hand-Polished Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 57,
    "image": "images/frames/frame_14.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Versace | Style: Versace Medusa Havana | Color: Tortoise Havana | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-15",
    "sku": "NOOR-VRC-15",
    "name": "Versace Crystal Grey",
    "brand": "Versace",
    "collection": "Versace Luxury Collection",
    "price": 1415,
    "originalPrice": 1915,
    "badge": "New Arrival",
    "shape": "Square",
    "material": "Hand-Polished Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 60,
    "image": "images/frames/frame_15.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Versace | Style: Versace Crystal Grey | Color: Smoked Grey | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-16",
    "sku": "NOOR-VRC-16",
    "name": "Versace Bold Square",
    "brand": "Versace",
    "collection": "Versace Luxury Collection",
    "price": 1475,
    "originalPrice": 1975,
    "badge": "Limited",
    "shape": "Square",
    "material": "Hand-Polished Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 63,
    "image": "images/frames/frame_16.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Versace | Style: Versace Bold Square | Color: Onyx Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-17",
    "sku": "NOOR-DNG-17",
    "name": "D&G Shield Rimless",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1479,
    "originalPrice": 1979,
    "badge": "Limited",
    "shape": "Hex / Geometric",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 66,
    "image": "images/frames/frame_17.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Shield Rimless | Color: Dark Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-18",
    "sku": "NOOR-DNG-18",
    "name": "D&G Gold Baroque",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1443,
    "originalPrice": 1943,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 69,
    "image": "images/frames/frame_18.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Gold Baroque | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-19",
    "sku": "NOOR-DNG-19",
    "name": "D&G Black Gradient",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1407,
    "originalPrice": 1907,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 72,
    "image": "images/frames/frame_19.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Black Gradient | Color: Dark Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-20",
    "sku": "NOOR-DNG-20",
    "name": "D&G Sunset Pilot",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1438,
    "originalPrice": 1938,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 75,
    "image": "images/frames/frame_20.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Sunset Pilot | Color: Dark Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-21",
    "sku": "NOOR-DNG-21",
    "name": "D&G Crystal Smoke",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1484,
    "originalPrice": 1984,
    "badge": "Bestseller",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 78,
    "image": "images/frames/frame_21.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Crystal Smoke | Color: Dark Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-22",
    "sku": "NOOR-DNG-22",
    "name": "D&G Milan Square",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1493,
    "originalPrice": 1993,
    "badge": "Limited",
    "shape": "Square",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 81,
    "image": "images/frames/frame_22.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Milan Square | Color: Dark Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-23",
    "sku": "NOOR-BRB-23",
    "name": "Burberry Check Square",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1438,
    "originalPrice": 1938,
    "badge": "Limited",
    "shape": "Square",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 84,
    "image": "images/frames/frame_23.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry Check Square | Color: Black Check | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-24",
    "sku": "NOOR-BRB-24",
    "name": "Burberry Classic Noir",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1499,
    "originalPrice": 1999,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 87,
    "image": "images/frames/frame_24.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry Classic Noir | Color: Black Check | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-25",
    "sku": "NOOR-BRB-25",
    "name": "Burberry Burgundy Chic",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1429,
    "originalPrice": 1929,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 90,
    "image": "images/frames/frame_25.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry Burgundy Chic | Color: Burgundy | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-26",
    "sku": "NOOR-BRB-26",
    "name": "Burberry Urban Grey",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1448,
    "originalPrice": 1948,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 93,
    "image": "images/frames/frame_26.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry Urban Grey | Color: Translucent Grey | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-27",
    "sku": "NOOR-CRT-27",
    "name": "Cartier Royal Shield",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1422,
    "originalPrice": 1922,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 96,
    "image": "images/frames/frame_27.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Royal Shield | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-28",
    "sku": "NOOR-CRT-28",
    "name": "Cartier Octagon Gold",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1480,
    "originalPrice": 1980,
    "badge": "Bestseller",
    "shape": "Hex / Geometric",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 99,
    "image": "images/frames/frame_28.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Octagon Gold | Color: Gold | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-29",
    "sku": "NOOR-CRT-29",
    "name": "Cartier Champagne Tint",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1498,
    "originalPrice": 1998,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 102,
    "image": "images/frames/frame_29.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Champagne Tint | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-30",
    "sku": "NOOR-BRB-30",
    "name": "Burberry Havana Tartan",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1419,
    "originalPrice": 1919,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 105,
    "image": "images/frames/frame_30.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry Havana Tartan | Color: Tartan Havana | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-31",
    "sku": "NOOR-CRT-31",
    "name": "Cartier Emerald Rimless",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1461,
    "originalPrice": 1961,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 108,
    "image": "images/frames/frame_31.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Emerald Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-32",
    "sku": "NOOR-CRT-32",
    "name": "Cartier Jaguar Noir",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1461,
    "originalPrice": 1961,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 111,
    "image": "images/frames/frame_32.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Jaguar Noir | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-33",
    "sku": "NOOR-DNG-33",
    "name": "D&G Olive Gradient",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1482,
    "originalPrice": 1982,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 114,
    "image": "images/frames/frame_33.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Olive Gradient | Color: Olive Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-34",
    "sku": "NOOR-DNG-34",
    "name": "D&G Logo Cutout",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1459,
    "originalPrice": 1959,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 117,
    "image": "images/frames/frame_34.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Logo Cutout | Color: Dark Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-35",
    "sku": "NOOR-DNG-35",
    "name": "D&G Blue Marine",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1439,
    "originalPrice": 1939,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 120,
    "image": "images/frames/frame_35.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Blue Marine | Color: Ocean Blue | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-36",
    "sku": "NOOR-CRT-36",
    "name": "Cartier Gold Studded",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1408,
    "originalPrice": 1908,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 123,
    "image": "images/frames/frame_36.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Gold Studded | Color: Gold | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-37",
    "sku": "NOOR-CRT-37",
    "name": "Cartier Horizon Gradient",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1484,
    "originalPrice": 1984,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 126,
    "image": "images/frames/frame_37.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Horizon Gradient | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-38",
    "sku": "NOOR-DNG-38",
    "name": "D&G Havana Modern",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1437,
    "originalPrice": 1937,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 129,
    "image": "images/frames/frame_38.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Havana Modern | Color: Dark Gradient | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-39",
    "sku": "NOOR-DNG-39",
    "name": "D&G Gold Filigree",
    "brand": "Dolce & Gabbana",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1425,
    "originalPrice": 1925,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 132,
    "image": "images/frames/frame_39.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Dolce & Gabbana | Style: D&G Gold Filigree | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-40",
    "sku": "NOOR-CRT-40",
    "name": "Cartier Titanium Pilot",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1424,
    "originalPrice": 1924,
    "badge": "New Arrival",
    "shape": "Aviator",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 135,
    "image": "images/frames/frame_40.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Titanium Pilot | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-41",
    "sku": "NOOR-CRT-41",
    "name": "Cartier Faceted Smoke",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1403,
    "originalPrice": 1903,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 138,
    "image": "images/frames/frame_41.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Faceted Smoke | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-42",
    "sku": "NOOR-CRT-42",
    "name": "Cartier Rose Gold",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1456,
    "originalPrice": 1956,
    "badge": "Bestseller",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 141,
    "image": "images/frames/frame_42.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Rose Gold | Color: Gold | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-43",
    "sku": "NOOR-CRT-43",
    "name": "Cartier Classic Rimless",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1416,
    "originalPrice": 1916,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 144,
    "image": "images/frames/frame_43.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Classic Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-44",
    "sku": "NOOR-CRT-44",
    "name": "Cartier Bronze Shield",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1441,
    "originalPrice": 1941,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 147,
    "image": "images/frames/frame_44.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Bronze Shield | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-45",
    "sku": "NOOR-CRT-45",
    "name": "Cartier Platinum Pilot",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1486,
    "originalPrice": 1986,
    "badge": "New Arrival",
    "shape": "Aviator",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 150,
    "image": "images/frames/frame_45.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Platinum Pilot | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-46",
    "sku": "NOOR-CRT-46",
    "name": "Cartier Sleek Rimless",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1414,
    "originalPrice": 1914,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 153,
    "image": "images/frames/frame_46.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Sleek Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-47",
    "sku": "NOOR-CRT-47",
    "name": "Cartier Midnight Panther",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1455,
    "originalPrice": 1955,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 156,
    "image": "images/frames/frame_47.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Midnight Panther | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-48",
    "sku": "NOOR-CRT-48",
    "name": "Cartier Gold Silhouette",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1458,
    "originalPrice": 1958,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 159,
    "image": "images/frames/frame_48.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Gold Silhouette | Color: Gold | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-49",
    "sku": "NOOR-CRT-49",
    "name": "Cartier Havana Edge",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1403,
    "originalPrice": 1903,
    "badge": "Bestseller",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 162,
    "image": "images/frames/frame_49.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Cartier | Style: Cartier Havana Edge | Color: Gold & Black | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-50",
    "sku": "NOOR-BRB-50",
    "name": "Burberry Optical Square",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1495,
    "originalPrice": 1995,
    "badge": "New Arrival",
    "shape": "Square",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 165,
    "image": "images/frames/frame_50.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry Optical Square | Color: Black Check | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-51",
    "sku": "NOOR-BRB-51",
    "name": "Burberry London Rectangle",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1478,
    "originalPrice": 1978,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 168,
    "image": "images/frames/frame_51.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry London Rectangle | Color: Black Check | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-52",
    "sku": "NOOR-BRB-52",
    "name": "Burberry Vintage Check",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1474,
    "originalPrice": 1974,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 171,
    "image": "images/frames/frame_52.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry Vintage Check | Color: Black Check | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-53",
    "sku": "NOOR-BRB-53",
    "name": "Burberry Crystal Clear",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1466,
    "originalPrice": 1966,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 174,
    "image": "images/frames/frame_53.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry Crystal Clear | Color: Black Check | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-54",
    "sku": "NOOR-BRB-54",
    "name": "Burberry Amber Tartan",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1428,
    "originalPrice": 1928,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 177,
    "image": "images/frames/frame_54.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry Amber Tartan | Color: Tartan Havana | Authenticity Card & Premium Case Included"
  },
  {
    "id": "prod-noor-55",
    "sku": "NOOR-BRB-55",
    "name": "Burberry British Modern",
    "brand": "Burberry",
    "collection": "Burberry Luxury Collection",
    "price": 1425,
    "originalPrice": 1925,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 180,
    "image": "images/frames/frame_55.jpg",
    "colors": [
      {
        "name": "Classic Edition",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "53mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "18g"
    },
    "description": "Brand: Burberry | Style: Burberry British Modern | Color: Black Check | Authenticity Card & Premium Case Included"
  }
];

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
