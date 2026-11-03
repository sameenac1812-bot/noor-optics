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
    "gender": "Unisex",
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
    "gender": "Women",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Women",
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
    "gender": "Women",
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
    "gender": "Men",
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
    "gender": "Women",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Men",
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
    "gender": "Women",
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
    "gender": "Women",
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
    "gender": "Unisex",
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
    "gender": "Women",
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
    "gender": "Women",
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
    "gender": "Men",
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
    "gender": "Men",
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
    "gender": "Women",
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
    "gender": "Men",
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
    "gender": "Men",
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
    "gender": "Women",
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
    "gender": "Men",
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
    "gender": "Women",
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
    "gender": "Men",
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
    "gender": "Women",
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
    "gender": "Men",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Men",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Men",
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
    "gender": "Men",
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
    "gender": "Men",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Men",
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
    "gender": "Men",
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
    "gender": "Unisex",
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
    "gender": "Women",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Women",
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
    "gender": "Unisex",
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
    "gender": "Unisex",
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
    "gender": "Men",
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
    "gender": "Women",
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
    "gender": "Men",
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
    "gender": "Women",
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
    "gender": "Men",
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
    "gender": "Women",
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
  },
  {
    id: "prod-noor-gj-3069",
    sku: "NOOR-GJ-3069",
    name: "Grey Jack Classic Aviator (3069)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Japanese Titanium",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3069.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3069.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3069 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3070",
    sku: "NOOR-GJ-3070",
    name: "Grey Jack Retro Square (3070)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3070.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3070.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3070 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3071",
    sku: "NOOR-GJ-3071",
    name: "Grey Jack Titanium Minimalist (3071)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Surgical Stainless Steel",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3071.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3071.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3071 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3072",
    sku: "NOOR-GJ-3072",
    name: "Grey Jack Executive Browline (3072)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3072.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3072.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3072 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3073",
    sku: "NOOR-GJ-3073",
    name: "Grey Jack Modern Navigator (3073)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3073.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3073.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3073 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3074",
    sku: "NOOR-GJ-3074",
    name: "Grey Jack Sleek Rimless (3074)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Japanese Titanium",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3074.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3074.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3074 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3075",
    sku: "NOOR-GJ-3075",
    name: "Grey Jack Matte Carbon (3075)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3075.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3075.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3075 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3076",
    sku: "NOOR-GJ-3076",
    name: "Grey Jack Polarized Pilot (3076)",
    brand: "Grey Jack",
    category: "Sunglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Surgical Stainless Steel",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3076.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3076.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3076 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3077",
    sku: "NOOR-GJ-3077",
    name: "Grey Jack Urban Wayfarer (3077)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3077.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3077.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3077 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3078",
    sku: "NOOR-GJ-3078",
    name: "Grey Jack Vintage Round (3078)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3078.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3078.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3078 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3079",
    sku: "NOOR-GJ-3079",
    name: "Grey Jack Geometric Hexagon (3079)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Japanese Titanium",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3079.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3079.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3079 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3080",
    sku: "NOOR-GJ-3080",
    name: "Grey Jack Obsidian Metal (3080)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3080.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3080.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3080 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3081",
    sku: "NOOR-GJ-3081",
    name: "Grey Jack Stealth Sport (3081)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Surgical Stainless Steel",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3081.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3081.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3081 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3082",
    sku: "NOOR-GJ-3082",
    name: "Grey Jack Gunmetal Edge (3082)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3082.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3082.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3082 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3083",
    sku: "NOOR-GJ-3083",
    name: "Grey Jack Amber Horizon (3083)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3083.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3083.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3083 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3084",
    sku: "NOOR-GJ-3084",
    name: "Grey Jack Deep Ocean Pilot (3084)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Japanese Titanium",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3084.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3084.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3084 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3085",
    sku: "NOOR-GJ-3085",
    name: "Grey Jack Polarized Shield (3085)",
    brand: "Grey Jack",
    category: "Sunglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Rectangular",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3085.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3085.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3085 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3086",
    sku: "NOOR-GJ-3086",
    name: "Grey Jack Falcon Titanium (3086)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Surgical Stainless Steel",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3086.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3086.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3086 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3281",
    sku: "NOOR-GJ-3281",
    name: "Grey Jack Apex Rectangle (3281)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3281.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3281.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3281 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3282",
    sku: "NOOR-GJ-3282",
    name: "Grey Jack Matrix Rimless (3282)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3282.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3282.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3282 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3283",
    sku: "NOOR-GJ-3283",
    name: "Grey Jack Royal Wayfarer (3283)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Japanese Titanium",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3283.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3283.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3283 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3284",
    sku: "NOOR-GJ-3284",
    name: "Grey Jack Sovereign Round (3284)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3284.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3284.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3284 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3285",
    sku: "NOOR-GJ-3285",
    name: "Grey Jack Pioneer Square (3285)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Surgical Stainless Steel",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3285.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3285.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3285 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3286",
    sku: "NOOR-GJ-3286",
    name: "Grey Jack Streamline Pilot (3286)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3286.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3286.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3286 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3287",
    sku: "NOOR-GJ-3287",
    name: "Grey Jack Nordic Clubmaster (3287)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Rectangular",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3287.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3287.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3287 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3288",
    sku: "NOOR-GJ-3288",
    name: "Grey Jack Monochrome Edge (3288)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Japanese Titanium",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3288.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3288.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3288 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-gj-3289",
    sku: "NOOR-GJ-3289",
    name: "Grey Jack Vanguard Oval (3289)",
    brand: "Grey Jack",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Grey Jack",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/grey_jack_3289.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/grey_jack_3289.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3289 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3315",
    sku: "NOOR-LUX-3315",
    name: "Luxury Sunglasses Diamond Rimless (3315)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Women",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Rectangular",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3315.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3315.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3315 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3316",
    sku: "NOOR-LUX-3316",
    name: "Luxury Sunglasses Gold Octagon Shield (3316)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Men",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3316.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3316.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3316 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3317",
    sku: "NOOR-LUX-3317",
    name: "Luxury Sunglasses Faceted Crystal (3317)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Women",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3317.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3317.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3317 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3318",
    sku: "NOOR-LUX-3318",
    name: "Luxury Sunglasses Emerald Horizon (3318)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3318.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3318.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3318 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3319",
    sku: "NOOR-LUX-3319",
    name: "Luxury Sunglasses Platinum Pilot (3319)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Men",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3319.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3319.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3319 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3320",
    sku: "NOOR-LUX-3320",
    name: "Luxury Sunglasses Black Onyx Silhouette (3320)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3320.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3320.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3320 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3321",
    sku: "NOOR-LUX-3321",
    name: "Luxury Sunglasses Amber Gradient (3321)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3321.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3321.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3321 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3322",
    sku: "NOOR-LUX-3322",
    name: "Luxury Sunglasses Sapphire Wayfarer (3322)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3322.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3322.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3322 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3323",
    sku: "NOOR-LUX-3323",
    name: "Luxury Sunglasses Imperial Square (3323)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Men",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3323.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3323.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3323 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3324",
    sku: "NOOR-LUX-3324",
    name: "Luxury Sunglasses Midnight Pilot (3324)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Men",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3324.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3324.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3324 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3325",
    sku: "NOOR-LUX-3325",
    name: "Luxury Sunglasses Baroque Filigree (3325)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3325.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3325.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3325 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3326",
    sku: "NOOR-LUX-3326",
    name: "Luxury Sunglasses Monaco Rimless (3326)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3326.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3326.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3326 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3327",
    sku: "NOOR-LUX-3327",
    name: "Luxury Sunglasses Cannes Aviator (3327)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3327.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3327.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3327 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3328",
    sku: "NOOR-LUX-3328",
    name: "Luxury Sunglasses Riviera Gradient (3328)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Women",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3328.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3328.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3328 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3329",
    sku: "NOOR-LUX-3329",
    name: "Luxury Sunglasses Milano Bold Square (3329)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Men",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3329.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3329.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3329 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3330",
    sku: "NOOR-LUX-3330",
    name: "Luxury Sunglasses St. Moritz Shield (3330)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3330.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3330.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3330 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-lux-3331",
    sku: "NOOR-LUX-3331",
    name: "Luxury Sunglasses Beverly Hills Luxe (3331)",
    brand: "Luxury Eyewear",
    category: "Sunglasses",
    gender: "Women",
    collection: "Luxury Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Rectangular",
    material: "Gold-Plated Alloy",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/luxury_sunglasses_3331.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/luxury_sunglasses_3331.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Luxury Eyewear | Category: Luxury Sunglasses | Model Ref: 3331 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3335",
    sku: "NOOR-RBE-3335",
    name: "Ray-Ban Eyesight Frames Classic Wayfarer Optics (3335)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3335.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3335.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3335 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3336",
    sku: "NOOR-RBE-3336",
    name: "Ray-Ban Eyesight Frames Round Metal Optics (3336)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3336.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3336.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3336 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3337",
    sku: "NOOR-RBE-3337",
    name: "Ray-Ban Eyesight Frames Clubmaster Eyeglass (3337)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3337.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3337.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3337 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3338",
    sku: "NOOR-RBE-3338",
    name: "Ray-Ban Eyesight Frames Aviator Optical (3338)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3338.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3338.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3338 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3339",
    sku: "NOOR-RBE-3339",
    name: "Ray-Ban Eyesight Frames Square Bio-Acetate (3339)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3339.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3339.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3339 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3340",
    sku: "NOOR-RBE-3340",
    name: "Ray-Ban Eyesight Frames Hexagonal Metal Optics (3340)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3340.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3340.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3340 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3341",
    sku: "NOOR-RBE-3341",
    name: "Ray-Ban Eyesight Frames Erika Eyeglass (3341)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3341.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3341.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3341 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3342",
    sku: "NOOR-RBE-3342",
    name: "Ray-Ban Eyesight Frames Justin Modern Fit (3342)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3342.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3342.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3342 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3343",
    sku: "NOOR-RBE-3343",
    name: "Ray-Ban Eyesight Frames Clubround Optical (3343)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Rectangular",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3343.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3343.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3343 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3344",
    sku: "NOOR-RBE-3344",
    name: "Ray-Ban Eyesight Frames State Street Eyeglass (3344)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3344.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3344.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3344 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3345",
    sku: "NOOR-RBE-3345",
    name: "Ray-Ban Eyesight Frames Frank Metal Optics (3345)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3345.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3345.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3345 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3346",
    sku: "NOOR-RBE-3346",
    name: "Ray-Ban Eyesight Frames Bill Optical Classic (3346)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3346.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3346.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3346 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3347",
    sku: "NOOR-RBE-3347",
    name: "Ray-Ban Eyesight Frames Burbank Sleek Square (3347)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3347.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3347.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3347 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3348",
    sku: "NOOR-RBE-3348",
    name: "Ray-Ban Eyesight Frames Nomad Browline Optics (3348)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3348.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3348.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3348 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3349",
    sku: "NOOR-RBE-3349",
    name: "Ray-Ban Eyesight Frames Meteor Vintage Optical (3349)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3349.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3349.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3349 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3350",
    sku: "NOOR-RBE-3350",
    name: "Ray-Ban Eyesight Frames Balorama Wrap Eyeglass (3350)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3350.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3350.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3350 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3351",
    sku: "NOOR-RBE-3351",
    name: "Ray-Ban Eyesight Frames Olympian Metal Eyeglass (3351)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Rectangular",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3351.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3351.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3351 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3352",
    sku: "NOOR-RBE-3352",
    name: "Ray-Ban Eyesight Frames Caribbean Wayfarer (3352)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3352.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3352.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3352 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3353",
    sku: "NOOR-RBE-3353",
    name: "Ray-Ban Eyesight Frames Nina Cat-Eye Optics (3353)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3353.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3353.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3353 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3354",
    sku: "NOOR-RBE-3354",
    name: "Ray-Ban Eyesight Frames Daddy-O Sleek Optics (3354)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3354.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3354.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3354 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3355",
    sku: "NOOR-RBE-3355",
    name: "Ray-Ban Eyesight Frames Predator Edge Eyeglass (3355)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3355.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3355.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3355 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3357",
    sku: "NOOR-RBE-3357",
    name: "Ray-Ban Eyesight Frames Clubmaster Square Optics (3357)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3357.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3357.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3357 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3358",
    sku: "NOOR-RBE-3358",
    name: "Ray-Ban Eyesight Frames Round Fleck Optical (3358)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3358.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3358.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3358 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3359",
    sku: "NOOR-RBE-3359",
    name: "Ray-Ban Eyesight Frames Marshal Double-Bridge (3359)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3359.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3359.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3359 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3360",
    sku: "NOOR-RBE-3360",
    name: "Ray-Ban Eyesight Frames General Pilot Optics (3360)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3360.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3360.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3360 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3361",
    sku: "NOOR-RBE-3361",
    name: "Ray-Ban Eyesight Frames Outdoorsman Eyeglass (3361)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Men",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3361.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3361.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3361 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbe-3362",
    sku: "NOOR-RBE-3362",
    name: "Ray-Ban Eyesight Frames Shooter Gold Optics (3362)",
    brand: "Ray-Ban",
    category: "Eyeglasses",
    gender: "Unisex",
    collection: "Ray-Ban Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_eyesight_3362.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_eyesight_3362.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Eyesight Frames | Model Ref: 3362 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3290",
    sku: "NOOR-RBS-3290",
    name: "Ray-Ban Sunglasses Original Aviator Classic (3290)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Men",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3290.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3290.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3290 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3291",
    sku: "NOOR-RBS-3291",
    name: "Ray-Ban Sunglasses Polarized Wayfarer (3291)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Men",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3291.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3291.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3291 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3292",
    sku: "NOOR-RBS-3292",
    name: "Ray-Ban Sunglasses Clubmaster Classic (3292)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Men",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3292.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3292.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3292 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3293",
    sku: "NOOR-RBS-3293",
    name: "Ray-Ban Sunglasses Round Flat Metal Sun (3293)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3293.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3293.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3293 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3294",
    sku: "NOOR-RBS-3294",
    name: "Ray-Ban Sunglasses Hexagonal Gold Sun (3294)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3294.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3294.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3294 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3295",
    sku: "NOOR-RBS-3295",
    name: "Ray-Ban Sunglasses Erika Velvet Touch (3295)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Women",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3295.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3295.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3295 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3296",
    sku: "NOOR-RBS-3296",
    name: "Ray-Ban Sunglasses Justin Matte Black (3296)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Men",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3296.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3296.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3296 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3297",
    sku: "NOOR-RBS-3297",
    name: "Ray-Ban Sunglasses Predator Sport Sun (3297)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Men",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3297.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3297.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3297 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3298",
    sku: "NOOR-RBS-3298",
    name: "Ray-Ban Sunglasses State Street Bold Sun (3298)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Rectangular",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3298.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3298.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3298 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3299",
    sku: "NOOR-RBS-3299",
    name: "Ray-Ban Sunglasses Nomad Vintage Sun (3299)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Men",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3299.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3299.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3299 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3300",
    sku: "NOOR-RBS-3300",
    name: "Ray-Ban Sunglasses Meteor Dark Havana (3300)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3300.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3300.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3300 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3301",
    sku: "NOOR-RBS-3301",
    name: "Ray-Ban Sunglasses Marshal Pilot Sun (3301)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Men",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3301.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3301.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3301 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3302",
    sku: "NOOR-RBS-3302",
    name: "Ray-Ban Sunglasses Highstreet Oval Sun (3302)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3302.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3302.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3302 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3303",
    sku: "NOOR-RBS-3303",
    name: "Ray-Ban Sunglasses Cockpit Aviator (3303)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Men",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3303.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3303.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3303 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3304",
    sku: "NOOR-RBS-3304",
    name: "Ray-Ban Sunglasses Active Lifestyle Square (3304)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3304.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3304.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3304 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3305",
    sku: "NOOR-RBS-3305",
    name: "Ray-Ban Sunglasses Olympian Chrome Sun (3305)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3305.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3305.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3305 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3306",
    sku: "NOOR-RBS-3306",
    name: "Ray-Ban Sunglasses Balorama Sport Wrap (3306)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Rectangular",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3306.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3306.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3306 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3307",
    sku: "NOOR-RBS-3307",
    name: "Ray-Ban Sunglasses Caravan Square Sun (3307)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Men",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3307.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3307.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3307 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3308",
    sku: "NOOR-RBS-3308",
    name: "Ray-Ban Sunglasses Chris Velvet Sun (3308)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Women",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3308.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3308.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3308 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3309",
    sku: "NOOR-RBS-3309",
    name: "Ray-Ban Sunglasses Andy Modern Rectangle (3309)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3309.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3309.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3309 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3310",
    sku: "NOOR-RBS-3310",
    name: "Ray-Ban Sunglasses Round Double Bridge (3310)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3310.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3310.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3310 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3311",
    sku: "NOOR-RBS-3311",
    name: "Ray-Ban Sunglasses Shooter Ambermatic Sun (3311)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3311.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3311.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3311 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3312",
    sku: "NOOR-RBS-3312",
    name: "Ray-Ban Sunglasses Clubround Fleck Sun (3312)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3312.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3312.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3312 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3313",
    sku: "NOOR-RBS-3313",
    name: "Ray-Ban Sunglasses Jack Geometric Sun (3313)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3313.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3313.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3313 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-rbs-3314",
    sku: "NOOR-RBS-3314",
    name: "Ray-Ban Sunglasses Frank Legend Gold (3314)",
    brand: "Ray-Ban",
    category: "Sunglasses",
    gender: "Unisex",
    collection: "Ray-Ban Sunglasses",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Rectangular",
    material: "Italian Bio-Acetate",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/rayban_sunglasses_3314.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/rayban_sunglasses_3314.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Ray-Ban | Category: Ray-Ban Sunglasses | Model Ref: 3314 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3364",
    sku: "NOOR-VG-3364",
    name: "Vogue Eyesight Frames Chic Cat-Eye Optics (3364)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3364.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3364.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3364 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3365",
    sku: "NOOR-VG-3365",
    name: "Vogue Eyesight Frames Modern Butterfly Eyeglass (3365)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3365.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3365.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3365 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3366",
    sku: "NOOR-VG-3366",
    name: "Vogue Eyesight Frames Slim Oval Optics (3366)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Oval",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3366.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3366.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3366 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3367",
    sku: "NOOR-VG-3367",
    name: "Vogue Eyesight Frames Soft Square Eyeglass (3367)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3367.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3367.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3367 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3368",
    sku: "NOOR-VG-3368",
    name: "Vogue Eyesight Frames Elegant Filigree Metal (3368)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3368.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3368.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3368 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3369",
    sku: "NOOR-VG-3369",
    name: "Vogue Eyesight Frames Crystal Acetate Optics (3369)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3369.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3369.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3369 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3370",
    sku: "NOOR-VG-3370",
    name: "Vogue Eyesight Frames Rose Gold Round (3370)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Round",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3370.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3370.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3370 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3371",
    sku: "NOOR-VG-3371",
    name: "Vogue Eyesight Frames Classic Browline Eyeglass (3371)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3371.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3371.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3371 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3372",
    sku: "NOOR-VG-3372",
    name: "Vogue Eyesight Frames Geometric Hexagon Optics (3372)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3372.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3372.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3372 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3373",
    sku: "NOOR-VG-3373",
    name: "Vogue Eyesight Frames Parisian Pilot Eyeglass (3373)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Aviator",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3373.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3373.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3373 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3374",
    sku: "NOOR-VG-3374",
    name: "Vogue Eyesight Frames Havana Cat-Eye Optics (3374)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3374.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3374.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3374 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3375",
    sku: "NOOR-VG-3375",
    name: "Vogue Eyesight Frames Urban Minimalist Eyeglass (3375)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Square",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3375.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3375.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3375 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3376",
    sku: "NOOR-VG-3376",
    name: "Vogue Eyesight Frames Retro Rectangle Optics (3376)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Geometric",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3376.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3376.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3376 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3377",
    sku: "NOOR-VG-3377",
    name: "Vogue Eyesight Frames Glamour Petite Eyeglass (3377)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Wayfarer",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3377.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3377.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3377 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
  },
  {
    id: "prod-noor-vg-3378",
    sku: "NOOR-VG-3378",
    name: "Vogue Eyesight Frames Couture Butterfly Optics (3378)",
    brand: "Vogue",
    category: "Eyeglasses",
    gender: "Women",
    collection: "Vogue Eyesight Frames",
    price: 0,
    originalPrice: null,
    badge: "New Arrival",
    shape: "Cat-Eye",
    material: "Ultra-light TR90",
    fit: "Regular",
    rating: 5.0,
    reviewsCount: 1,
    image: "/images/products/vogue_eyesight_3378.jpg",
    colors: [
      { name: "Standard", hex: "#111111", image: "/images/products/vogue_eyesight_3378.jpg" }
    ],
    dimensions: { lens: "52mm", bridge: "18mm", temple: "145mm", weight: "16g" },
    description: "Brand: Vogue | Category: Vogue Eyesight Frames | Model Ref: 3378 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    stock: 1
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
