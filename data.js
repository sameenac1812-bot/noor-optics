/**
 * data.js – Noor Optics Brand & Product Catalog
 * Authoritative optical frames inventory (23 verified in-stock frames).
 */

'use strict';

const NOOR_BRAND = {
  "name": "Noor Optics",
  "descriptor": "EYEGLASSES",
  "tagline": "Curated Luxury Eyewear and Precision Lenses",
  "founded": "2024",
  "currency": "₹",
  "freeShippingThreshold": 1999,
  "contactPhone": "+91 98765 43210",
  "contactEmail": "concierge@nooroptics.com",
  "storeAddress": "Noor Optics Flagship Boutique, Indiranagar, Bengaluru",
  "workingHours": "10:00 AM – 09:00 PM (Daily)",
  "warrantyText": "2-Year Comprehensive Frame and Coating Warranty",
  "shippingText": "Free Express Delivery on orders above ₹1,999"
};

const LENS_PACKAGES = [
  {
    "id": "lens-bluecut",
    "name": "Blue-Light Filter (Computer and Screen)",
    "tag": "Standard",
    "price": 0,
    "description": "Blocks 99% harmful HEV blue light with zero color distortion."
  },
  {
    "id": "lens-antiglare",
    "name": "1.60 High-Index Anti-Reflective",
    "tag": "Popular",
    "price": 699,
    "description": "Ultra-thin, hydrophobic, smudge and scratch resistant multi-coat."
  },
  {
    "id": "lens-progressive",
    "name": "Digital Free-Form Progressive",
    "tag": "Precision",
    "price": 1499,
    "description": "Seamless corridor transition from reading to distance vision."
  },
  {
    "id": "lens-photochromic",
    "name": "Adaptive Photochromic Transition",
    "tag": "All-Day",
    "price": 1199,
    "description": "Rapidly darkens into grey sunglasses outdoors in UV sunlight."
  }
];

const EYEWEAR_CATALOG = [
  {
    "id": "prod-noor-34",
    "sku": "NOOR-DNG-34",
    "name": "D&G Logo Cutout",
    "brand": "Dolce & Gabbana",
    "gender": "Men",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1459,
    "originalPrice": 1959,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "category": "Sunglasses",
    "rating": "4.8",
    "reviewsCount": 117,
    "image": "images/frames/frame_34.jpg",
    "imageUrl": "/images/frames/frame_34.jpg",
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
    "description": "Brand: Dolce & Gabbana | Style: D&G Logo Cutout | Color: Dark Gradient | Authenticity Card & Premium Case Included",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-35",
    "sku": "NOOR-DNG-35",
    "name": "D&G Blue Marine",
    "brand": "Dolce & Gabbana",
    "gender": "Men",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1439,
    "originalPrice": 1939,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "category": "Sunglasses",
    "rating": "4.9",
    "reviewsCount": 120,
    "image": "images/frames/frame_35.jpg",
    "imageUrl": "/images/frames/frame_35.jpg",
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
    "description": "Brand: Dolce & Gabbana | Style: D&G Blue Marine | Color: Ocean Blue | Authenticity Card & Premium Case Included",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-38",
    "sku": "NOOR-DNG-38",
    "name": "D&G Havana Modern",
    "brand": "Dolce & Gabbana",
    "gender": "Men",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1437,
    "originalPrice": 1937,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Wide",
    "frame_size": "Large",
    "size": "Large",
    "category": "Sunglasses",
    "rating": "4.9",
    "reviewsCount": 129,
    "image": "images/frames/frame_38.jpg",
    "imageUrl": "/images/frames/frame_38.jpg",
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
    "description": "Brand: Dolce & Gabbana | Style: D&G Havana Modern | Color: Dark Gradient | Authenticity Card & Premium Case Included",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-39",
    "sku": "NOOR-DNG-39",
    "name": "D&G Gold Filigree",
    "brand": "Dolce & Gabbana",
    "gender": "Men",
    "collection": "Dolce & Gabbana Luxury Collection",
    "price": 1425,
    "originalPrice": 1925,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Beta-Titanium & Acetate",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "category": "Sunglasses",
    "rating": "4.7",
    "reviewsCount": 132,
    "image": "images/frames/frame_39.jpg",
    "imageUrl": "/images/frames/frame_39.jpg",
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
    "description": "Brand: Dolce & Gabbana | Style: D&G Gold Filigree | Color: Gold & Black | Authenticity Card & Premium Case Included",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-50",
    "sku": "NOOR-BRB-50",
    "name": "Burberry Optical Square",
    "brand": "Burberry",
    "gender": "Men",
    "collection": "Burberry Luxury Collection",
    "price": 1495,
    "originalPrice": 1995,
    "badge": "New Arrival",
    "shape": "Square",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 165,
    "image": "images/frames/frame_50.jpg",
    "imageUrl": "/images/frames/frame_50.jpg",
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
    "description": "Brand: Burberry | Style: Burberry Optical Square | Color: Black Check | Authenticity Card & Premium Case Included",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-51",
    "sku": "NOOR-BRB-51",
    "name": "Burberry London",
    "brand": "Burberry",
    "gender": "Women",
    "collection": "Burberry Luxury Collection",
    "price": 1478,
    "originalPrice": 1978,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "category": "Eyeglasses",
    "rating": "4.7",
    "reviewsCount": 168,
    "image": "images/frames/frame_51.jpg",
    "imageUrl": "/images/frames/frame_51.jpg",
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
    "description": "Brand: Burberry | Style: Burberry London Rectangle | Color: Black Check | Authenticity Card & Premium Case Included",
    "stock": 10,
    "total_stock": 10,
    "available_qty": 10,
    "inStock": true
  },
  {
    "id": "prod-noor-52",
    "sku": "NOOR-BRB-52",
    "name": "Burberry Vintage Check",
    "brand": "Burberry",
    "gender": "Men",
    "collection": "Burberry Luxury Collection",
    "price": 1474,
    "originalPrice": 1974,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "category": "Eyeglasses",
    "rating": "4.8",
    "reviewsCount": 171,
    "image": "images/frames/frame_52.jpg",
    "imageUrl": "/images/frames/frame_52.jpg",
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
    "description": "Brand: Burberry | Style: Burberry Vintage Check | Color: Black Check | Authenticity Card & Premium Case Included",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-53",
    "sku": "NOOR-BRB-53",
    "name": "Burberry Crystal Clear",
    "brand": "Burberry",
    "gender": "Women",
    "collection": "Burberry Luxury Collection",
    "price": 1466,
    "originalPrice": 1966,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Narrow",
    "frame_size": "Small",
    "size": "Small",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 174,
    "image": "images/frames/frame_53.jpg",
    "imageUrl": "/images/frames/frame_53.jpg",
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
    "description": "Brand: Burberry | Style: Burberry Crystal Clear | Color: Black Check | Authenticity Card & Premium Case Included",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-54",
    "sku": "NOOR-BRB-54",
    "name": "Burberry Amber Tartan",
    "brand": "Burberry",
    "gender": "Men",
    "collection": "Burberry Luxury Collection",
    "price": 1428,
    "originalPrice": 1928,
    "badge": "Limited",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "category": "Eyeglasses",
    "rating": "4.7",
    "reviewsCount": 177,
    "image": "images/frames/frame_54.jpg",
    "imageUrl": "/images/frames/frame_54.jpg",
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
    "description": "Brand: Burberry | Style: Burberry Amber Tartan | Color: Tartan Havana | Authenticity Card & Premium Case Included",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-55",
    "sku": "NOOR-BRB-55",
    "name": "Burberry British Modern",
    "brand": "Burberry",
    "gender": "Women",
    "collection": "Burberry Luxury Collection",
    "price": 1425,
    "originalPrice": 1925,
    "badge": "New Arrival",
    "shape": "Rectangular",
    "material": "Italian Bio-Acetate",
    "fit": "Wide",
    "frame_size": "Large",
    "size": "Large",
    "category": "Eyeglasses",
    "rating": "4.8",
    "reviewsCount": 180,
    "image": "images/frames/frame_55.jpg",
    "imageUrl": "/images/frames/frame_55.jpg",
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
    "description": "Brand: Burberry | Style: Burberry British Modern | Color: Black Check | Authenticity Card & Premium Case Included",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3069",
    "sku": "NOOR-GJ-3069",
    "name": "Grey Jack Classic Aviator (3069)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Aviator",
    "material": "Japanese Titanium",
    "fit": "Wide",
    "frame_size": "Large",
    "size": "Large",
    "category": "Sunglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3069.jpg",
    "imageUrl": "/images/products/grey_jack_3069.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3069.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3069 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3070",
    "sku": "NOOR-GJ-3070",
    "name": "Grey Jack Retro Square (3070)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Square",
    "material": "Italian Bio-Acetate",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3070.jpg",
    "imageUrl": "/images/products/grey_jack_3070.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3070.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3070 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3071",
    "sku": "NOOR-GJ-3071",
    "name": "Grey Jack Titanium Minimalist (3071)",
    "brand": "Grey Jack",
    "gender": "Unisex",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Aviator",
    "material": "Surgical Stainless Steel",
    "fit": "Wide",
    "frame_size": "Large",
    "size": "Large",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3071.jpg",
    "imageUrl": "/images/products/grey_jack_3071.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3071.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3071 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 10,
    "total_stock": 10,
    "available_qty": 10,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3072",
    "sku": "NOOR-GJ-3072",
    "name": "Grey Jack Executive Browline (3072)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Square",
    "material": "Ultra-light TR90",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3072.jpg",
    "imageUrl": "/images/products/grey_jack_3072.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3072.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3072 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3073",
    "sku": "NOOR-GJ-3073",
    "name": "Grey Jack Modern Navigator (3073)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Geometric",
    "material": "Gold-Plated Alloy",
    "fit": "Wide",
    "frame_size": "Large",
    "size": "Large",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3073.jpg",
    "imageUrl": "/images/products/grey_jack_3073.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3073.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3073 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3074",
    "sku": "NOOR-GJ-3074",
    "name": "Grey Jack Sleek Rimless (3074)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Wayfarer",
    "material": "Japanese Titanium",
    "fit": "Narrow",
    "frame_size": "Small",
    "size": "Small",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3074.jpg",
    "imageUrl": "/images/products/grey_jack_3074.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3074.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3074 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3075",
    "sku": "NOOR-GJ-3075",
    "name": "Grey Jack Matte Carbon (3075)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Oval",
    "material": "Italian Bio-Acetate",
    "fit": "Narrow",
    "frame_size": "Small",
    "size": "Small",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3075.jpg",
    "imageUrl": "/images/products/grey_jack_3075.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3075.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3075 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3076",
    "sku": "NOOR-GJ-3076",
    "name": "Grey Jack Polarized Pilot (3076)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Aviator",
    "material": "Surgical Stainless Steel",
    "fit": "Wide",
    "frame_size": "Large",
    "size": "Large",
    "category": "Sunglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3076.jpg",
    "imageUrl": "/images/products/grey_jack_3076.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3076.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3076 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3077",
    "sku": "NOOR-GJ-3077",
    "name": "Grey Jack Urban Wayfarer (3077)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Wayfarer",
    "material": "Ultra-light TR90",
    "fit": "Narrow",
    "frame_size": "Small",
    "size": "Small",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3077.jpg",
    "imageUrl": "/images/products/grey_jack_3077.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3077.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3077 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3078",
    "sku": "NOOR-GJ-3078",
    "name": "Grey Jack Vintage Round (3078)",
    "brand": "Grey Jack",
    "gender": "Unisex",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Round",
    "material": "Gold-Plated Alloy",
    "fit": "Narrow",
    "frame_size": "Small",
    "size": "Small",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3078.jpg",
    "imageUrl": "/images/products/grey_jack_3078.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3078.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3078 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 10,
    "total_stock": 10,
    "available_qty": 10,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3079",
    "sku": "NOOR-GJ-3079",
    "name": "Grey Jack (3079)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Geometric",
    "material": "Japanese Titanium",
    "fit": "Narrow",
    "frame_size": "Small",
    "size": "Small",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3079.jpg",
    "imageUrl": "/images/products/grey_jack_3079.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3079.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3079 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3080",
    "sku": "NOOR-GJ-3080",
    "name": "Grey Jack Obsidian Metal (3080)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Square",
    "material": "Italian Bio-Acetate",
    "fit": "Narrow",
    "frame_size": "Small",
    "size": "Small",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3080.jpg",
    "imageUrl": "/images/products/grey_jack_3080.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3080.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3080 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
  },
  {
    "id": "prod-noor-gj-3081",
    "sku": "NOOR-GJ-3081",
    "name": "Grey Jack Stealth Sport (3081)",
    "brand": "Grey Jack",
    "gender": "Men",
    "collection": "Grey Jack",
    "price": 999,
    "originalPrice": 1799,
    "badge": "New Arrival",
    "shape": "Geometric",
    "material": "Surgical Stainless Steel",
    "fit": "Narrow",
    "frame_size": "Small",
    "size": "Small",
    "category": "Eyeglasses",
    "rating": 5,
    "reviewsCount": 1,
    "image": "images/products/grey_jack_3081.jpg",
    "imageUrl": "/images/products/grey_jack_3081.jpg",
    "colors": [
      {
        "name": "Standard",
        "hex": "#111111",
        "image": "/images/products/grey_jack_3081.jpg"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "145mm",
      "weight": "16g"
    },
    "description": "Brand: Grey Jack | Category: Grey Jack | Model Ref: 3081 | Handcrafted Quality & Authentic Case Included. Available stock: 1 frame.",
    "stock": 1,
    "total_stock": 1,
    "available_qty": 1,
    "inStock": true
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
