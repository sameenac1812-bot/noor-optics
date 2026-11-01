/**
 * data.js – Noor Optics Brand & Product Catalog
 * Authoritative optical frames inventory (55 curated frames).
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
    "id": "prod-noor-01",
    "sku": "NOOR-CRT-01",
    "name": "Cartier Panther Gold",
    "brand": "Cartier",
    "collection": "Cartier Luxury Collection",
    "price": 1461,
    "originalPrice": 1961,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 15,
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
    "rating": "4.8",
    "reviewsCount": 18,
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
    "rating": "4.9",
    "reviewsCount": 21,
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
    "rating": "4.7",
    "reviewsCount": 24,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 27,
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
    "badge": "New Arrival",
    "shape": "Aviator",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 30,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 33,
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
    "badge": "Bestseller",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 36,
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
    "rating": "4.9",
    "reviewsCount": 39,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 42,
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
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 45,
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
    "rating": "4.9",
    "reviewsCount": 48,
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
    "rating": "4.7",
    "reviewsCount": 51,
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
    "badge": "Limited",
    "shape": "Square",
    "material": "Hand-Polished Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 54,
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
    "badge": "Bestseller",
    "shape": "Square",
    "material": "Hand-Polished Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 57,
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
    "badge": "New Arrival",
    "shape": "Square",
    "material": "Hand-Polished Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 60,
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
    "rating": "4.8",
    "reviewsCount": 63,
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
    "rating": "4.9",
    "reviewsCount": 66,
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
    "rating": "4.7",
    "reviewsCount": 69,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 72,
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
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 75,
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
    "badge": "Bestseller",
    "shape": "Square",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 78,
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
    "rating": "4.8",
    "reviewsCount": 81,
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
    "rating": "4.9",
    "reviewsCount": 84,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 87,
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
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 90,
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
    "rating": "4.9",
    "reviewsCount": 93,
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
    "badge": "Limited",
    "shape": "Hex / Geometric",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 96,
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
    "badge": "Bestseller",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 99,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 102,
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
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 105,
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
    "rating": "4.8",
    "reviewsCount": 108,
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
    "rating": "4.9",
    "reviewsCount": 111,
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
    "rating": "4.7",
    "reviewsCount": 114,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 117,
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
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 120,
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
    "rating": "4.7",
    "reviewsCount": 123,
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
    "rating": "4.8",
    "reviewsCount": 126,
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
    "rating": "4.9",
    "reviewsCount": 129,
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
    "badge": "Limited",
    "shape": "Aviator",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 132,
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
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 135,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 138,
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
    "badge": "Bestseller",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 141,
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
    "rating": "4.8",
    "reviewsCount": 144,
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
    "badge": "Limited",
    "shape": "Aviator",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 147,
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
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 150,
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
    "rating": "4.8",
    "reviewsCount": 153,
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
    "rating": "4.9",
    "reviewsCount": 156,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Gold-Plated Titanium",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 159,
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
    "badge": "Bestseller",
    "shape": "Square",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.8",
    "reviewsCount": 162,
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
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.9",
    "reviewsCount": 165,
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
    "rating": "4.7",
    "reviewsCount": 168,
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
    "rating": "4.8",
    "reviewsCount": 171,
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
    "rating": "4.9",
    "reviewsCount": 174,
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
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "category": "Frames",
    "rating": "4.7",
    "reviewsCount": 177,
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
