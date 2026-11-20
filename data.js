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
  "contactPhone": "+91 93918 93128",
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
    "id": "prod-noor-1001",
    "sku": "NOOR-1001",
    "name": "1001 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "Bestseller",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 39,
    "image": "images/frames/1001-front.jpg",
    "imageUrl": "/images/frames/1001-front.jpg",
    "images": [
      "/images/frames/1001-front.jpg",
      "/images/frames/1001-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1001 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1002",
    "sku": "NOOR-1002",
    "name": "1002 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "New Arrival",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 40,
    "image": "images/frames/1002-front.jpg",
    "imageUrl": "/images/frames/1002-front.jpg",
    "images": [
      "/images/frames/1002-front.jpg",
      "/images/frames/1002-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1002 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1003",
    "sku": "NOOR-1003",
    "name": "1003 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 41,
    "image": "images/frames/1003-front.jpg",
    "imageUrl": "/images/frames/1003-front.jpg",
    "images": [
      "/images/frames/1003-front.jpg",
      "/images/frames/1003-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1003 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1004",
    "sku": "NOOR-1004",
    "name": "1004 Tortoise / Brown Square Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Square",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 42,
    "image": "images/frames/1004-front.jpg",
    "imageUrl": "/images/frames/1004-front.jpg",
    "images": [
      "/images/frames/1004-front.jpg",
      "/images/frames/1004-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1004 Tortoise / Brown Square Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1005",
    "sku": "NOOR-1005",
    "name": "1005 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 43,
    "image": "images/frames/1005-front.jpg",
    "imageUrl": "/images/frames/1005-front.jpg",
    "images": [
      "/images/frames/1005-front.jpg",
      "/images/frames/1005-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1005 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1006",
    "sku": "NOOR-1006",
    "name": "1006 Tortoise / Brown Geometric/Hexagonal Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Geometric/Hexagonal",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 44,
    "image": "images/frames/1006-front.jpg",
    "imageUrl": "/images/frames/1006-front.jpg",
    "images": [
      "/images/frames/1006-front.jpg",
      "/images/frames/1006-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1006 Tortoise / Brown Geometric/Hexagonal Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1007",
    "sku": "NOOR-1007",
    "name": "1007 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 45,
    "image": "images/frames/1007-front.jpg",
    "imageUrl": "/images/frames/1007-front.jpg",
    "images": [
      "/images/frames/1007-front.jpg",
      "/images/frames/1007-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1007 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1008",
    "sku": "NOOR-1008",
    "name": "1008 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 46,
    "image": "images/frames/1008-front.jpg",
    "imageUrl": "/images/frames/1008-front.jpg",
    "images": [
      "/images/frames/1008-front.jpg",
      "/images/frames/1008-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1008 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1009",
    "sku": "NOOR-1009",
    "name": "1009 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 47,
    "image": "images/frames/1009-front.jpg",
    "imageUrl": "/images/frames/1009-front.jpg",
    "images": [
      "/images/frames/1009-front.jpg",
      "/images/frames/1009-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1009 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1010",
    "sku": "NOOR-1010",
    "name": "1010 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 48,
    "image": "images/frames/1010-front.jpg",
    "imageUrl": "/images/frames/1010-front.jpg",
    "images": [
      "/images/frames/1010-front.jpg",
      "/images/frames/1010-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1010 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1011",
    "sku": "NOOR-1011",
    "name": "1011 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 49,
    "image": "images/frames/1011-front.jpg",
    "imageUrl": "/images/frames/1011-front.jpg",
    "images": [
      "/images/frames/1011-front.jpg",
      "/images/frames/1011-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1011 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1012",
    "sku": "NOOR-1012",
    "name": "1012 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 50,
    "image": "images/frames/1012-front.jpg",
    "imageUrl": "/images/frames/1012-front.jpg",
    "images": [
      "/images/frames/1012-front.jpg",
      "/images/frames/1012-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1012 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1013",
    "sku": "NOOR-1013",
    "name": "1013 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 51,
    "image": "images/frames/1013-front.jpg",
    "imageUrl": "/images/frames/1013-front.jpg",
    "images": [
      "/images/frames/1013-front.jpg",
      "/images/frames/1013-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1013 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1014",
    "sku": "NOOR-1014",
    "name": "1014 Gold Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 52,
    "image": "images/frames/1014-front.jpg",
    "imageUrl": "/images/frames/1014-front.jpg",
    "images": [
      "/images/frames/1014-front.jpg",
      "/images/frames/1014-side.jpg"
    ],
    "colors": [
      {
        "name": "Gold",
        "hex": "#D4AF37"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1014 Gold Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1015",
    "sku": "NOOR-1015",
    "name": "1015 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 53,
    "image": "images/frames/1015-front.jpg",
    "imageUrl": "/images/frames/1015-front.jpg",
    "images": [
      "/images/frames/1015-front.jpg",
      "/images/frames/1015-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1015 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1016",
    "sku": "NOOR-1016",
    "name": "1016 Gold Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 54,
    "image": "images/frames/1016-front.jpg",
    "imageUrl": "/images/frames/1016-front.jpg",
    "images": [
      "/images/frames/1016-front.jpg",
      "/images/frames/1016-side.jpg"
    ],
    "colors": [
      {
        "name": "Gold",
        "hex": "#D4AF37"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1016 Gold Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1017",
    "sku": "NOOR-1017",
    "name": "1017 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 55,
    "image": "images/frames/1017-front.jpg",
    "imageUrl": "/images/frames/1017-front.jpg",
    "images": [
      "/images/frames/1017-front.jpg",
      "/images/frames/1017-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1017 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1018",
    "sku": "NOOR-1018",
    "name": "1018 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 56,
    "image": "images/frames/1018-front.jpg",
    "imageUrl": "/images/frames/1018-front.jpg",
    "images": [
      "/images/frames/1018-front.jpg",
      "/images/frames/1018-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1018 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1019",
    "sku": "NOOR-1019",
    "name": "1019 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 57,
    "image": "images/frames/1019-front.jpg",
    "imageUrl": "/images/frames/1019-front.jpg",
    "images": [
      "/images/frames/1019-front.jpg",
      "/images/frames/1019-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1019 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1020",
    "sku": "NOOR-1020",
    "name": "1020 Tortoise / Brown Geometric/Hexagonal Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Geometric/Hexagonal",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 58,
    "image": "images/frames/1020-front.jpg",
    "imageUrl": "/images/frames/1020-front.jpg",
    "images": [
      "/images/frames/1020-front.jpg",
      "/images/frames/1020-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1020 Tortoise / Brown Geometric/Hexagonal Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1021",
    "sku": "NOOR-1021",
    "name": "1021 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 59,
    "image": "images/frames/1021-front.jpg",
    "imageUrl": "/images/frames/1021-front.jpg",
    "images": [
      "/images/frames/1021-front.jpg",
      "/images/frames/1021-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1021 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1022",
    "sku": "NOOR-1022",
    "name": "1022 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 60,
    "image": "images/frames/1022-front.jpg",
    "imageUrl": "/images/frames/1022-front.jpg",
    "images": [
      "/images/frames/1022-front.jpg",
      "/images/frames/1022-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1022 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1023",
    "sku": "NOOR-1023",
    "name": "1023 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 61,
    "image": "images/frames/1023-front.jpg",
    "imageUrl": "/images/frames/1023-front.jpg",
    "images": [
      "/images/frames/1023-front.jpg",
      "/images/frames/1023-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1023 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1024",
    "sku": "NOOR-1024",
    "name": "1024 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 62,
    "image": "images/frames/1024-front.jpg",
    "imageUrl": "/images/frames/1024-front.jpg",
    "images": [
      "/images/frames/1024-front.jpg",
      "/images/frames/1024-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1024 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1025",
    "sku": "NOOR-1025",
    "name": "1025 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 63,
    "image": "images/frames/1025-front.jpg",
    "imageUrl": "/images/frames/1025-front.jpg",
    "images": [
      "/images/frames/1025-front.jpg",
      "/images/frames/1025-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1025 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1026",
    "sku": "NOOR-1026",
    "name": "1026 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 64,
    "image": "images/frames/1026-front.jpg",
    "imageUrl": "/images/frames/1026-front.jpg",
    "images": [
      "/images/frames/1026-front.jpg",
      "/images/frames/1026-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1026 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1027",
    "sku": "NOOR-1027",
    "name": "1027 Tortoise / Brown Round Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Round",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 65,
    "image": "images/frames/1027-front.jpg",
    "imageUrl": "/images/frames/1027-front.jpg",
    "images": [
      "/images/frames/1027-front.jpg",
      "/images/frames/1027-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1027 Tortoise / Brown Round Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1028",
    "sku": "NOOR-1028",
    "name": "1028 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 66,
    "image": "images/frames/1028-front.jpg",
    "imageUrl": "/images/frames/1028-front.jpg",
    "images": [
      "/images/frames/1028-front.jpg",
      "/images/frames/1028-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1028 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1029",
    "sku": "NOOR-1029",
    "name": "1029 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 67,
    "image": "images/frames/1029-front.jpg",
    "imageUrl": "/images/frames/1029-front.jpg",
    "images": [
      "/images/frames/1029-front.jpg",
      "/images/frames/1029-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1029 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1030",
    "sku": "NOOR-1030",
    "name": "1030 Silver Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 68,
    "image": "images/frames/1030-front.jpg",
    "imageUrl": "/images/frames/1030-front.jpg",
    "images": [
      "/images/frames/1030-front.jpg",
      "/images/frames/1030-side.jpg"
    ],
    "colors": [
      {
        "name": "Silver",
        "hex": "#C0C0C0"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1030 Silver Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1031",
    "sku": "NOOR-1031",
    "name": "1031 Gold Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 69,
    "image": "images/frames/1031-front.jpg",
    "imageUrl": "/images/frames/1031-front.jpg",
    "images": [
      "/images/frames/1031-front.jpg",
      "/images/frames/1031-side.jpg"
    ],
    "colors": [
      {
        "name": "Gold",
        "hex": "#D4AF37"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1031 Gold Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1032",
    "sku": "NOOR-1032",
    "name": "1032 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 70,
    "image": "images/frames/1032-front.jpg",
    "imageUrl": "/images/frames/1032-front.jpg",
    "images": [
      "/images/frames/1032-front.jpg",
      "/images/frames/1032-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1032 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1033",
    "sku": "NOOR-1033",
    "name": "1033 Tortoise / Brown Square Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Square",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 71,
    "image": "images/frames/1033-front.jpg",
    "imageUrl": "/images/frames/1033-front.jpg",
    "images": [
      "/images/frames/1033-front.jpg",
      "/images/frames/1033-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1033 Tortoise / Brown Square Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1034",
    "sku": "NOOR-1034",
    "name": "1034 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 72,
    "image": "images/frames/1034-front.jpg",
    "imageUrl": "/images/frames/1034-front.jpg",
    "images": [
      "/images/frames/1034-front.jpg",
      "/images/frames/1034-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1034 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1035",
    "sku": "NOOR-1035",
    "name": "1035 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 73,
    "image": "images/frames/1035-front.jpg",
    "imageUrl": "/images/frames/1035-front.jpg",
    "images": [
      "/images/frames/1035-front.jpg",
      "/images/frames/1035-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1035 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1036",
    "sku": "NOOR-1036",
    "name": "1036 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 74,
    "image": "images/frames/1036-front.jpg",
    "imageUrl": "/images/frames/1036-front.jpg",
    "images": [
      "/images/frames/1036-front.jpg",
      "/images/frames/1036-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1036 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1037",
    "sku": "NOOR-1037",
    "name": "1037 Gold Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 75,
    "image": "images/frames/1037-front.jpg",
    "imageUrl": "/images/frames/1037-front.jpg",
    "images": [
      "/images/frames/1037-front.jpg",
      "/images/frames/1037-side.jpg"
    ],
    "colors": [
      {
        "name": "Gold",
        "hex": "#D4AF37"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1037 Gold Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1038",
    "sku": "NOOR-1038",
    "name": "1038 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 76,
    "image": "images/frames/1038-front.jpg",
    "imageUrl": "/images/frames/1038-front.jpg",
    "images": [
      "/images/frames/1038-front.jpg",
      "/images/frames/1038-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1038 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1039",
    "sku": "NOOR-1039",
    "name": "1039 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 77,
    "image": "images/frames/1039-front.jpg",
    "imageUrl": "/images/frames/1039-front.jpg",
    "images": [
      "/images/frames/1039-front.jpg",
      "/images/frames/1039-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1039 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1040",
    "sku": "NOOR-1040",
    "name": "1040 Tortoise / Brown Rectangle Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Rectangle",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 38,
    "image": "images/frames/1040-front.jpg",
    "imageUrl": "/images/frames/1040-front.jpg",
    "images": [
      "/images/frames/1040-front.jpg",
      "/images/frames/1040-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1040 Tortoise / Brown Rectangle Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1041",
    "sku": "NOOR-1041",
    "name": "1041 Tortoise / Brown Geometric/Hexagonal Metal Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Metal Heritage Collection",
    "price": 999,
    "originalPrice": 1499,
    "badge": "",
    "shape": "Geometric/Hexagonal",
    "material": "Metal",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 39,
    "image": "images/frames/1041-front.jpg",
    "imageUrl": "/images/frames/1041-front.jpg",
    "images": [
      "/images/frames/1041-front.jpg",
      "/images/frames/1041-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "18g"
    },
    "description": "1041 Tortoise / Brown Geometric/Hexagonal Metal Frame. Genuine lightweight metal construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1042",
    "sku": "NOOR-1042",
    "name": "1042 Classic Black Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 40,
    "image": "images/frames/1042-front.jpg",
    "imageUrl": "/images/frames/1042-front.jpg",
    "images": [
      "/images/frames/1042-front.jpg",
      "/images/frames/1042-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1042 Classic Black Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1043",
    "sku": "NOOR-1043",
    "name": "1043 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 41,
    "image": "images/frames/1043-front.jpg",
    "imageUrl": "/images/frames/1043-front.jpg",
    "images": [
      "/images/frames/1043-front.jpg",
      "/images/frames/1043-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1043 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1044",
    "sku": "NOOR-1044",
    "name": "1044 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 42,
    "image": "images/frames/1044-front.jpg",
    "imageUrl": "/images/frames/1044-front.jpg",
    "images": [
      "/images/frames/1044-front.jpg",
      "/images/frames/1044-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1044 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1045",
    "sku": "NOOR-1045",
    "name": "1045 Classic Black Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 43,
    "image": "images/frames/1045-front.jpg",
    "imageUrl": "/images/frames/1045-front.jpg",
    "images": [
      "/images/frames/1045-front.jpg",
      "/images/frames/1045-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1045 Classic Black Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1046",
    "sku": "NOOR-1046",
    "name": "1046 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 44,
    "image": "images/frames/1046-front.jpg",
    "imageUrl": "/images/frames/1046-front.jpg",
    "images": [
      "/images/frames/1046-front.jpg",
      "/images/frames/1046-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1046 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1047",
    "sku": "NOOR-1047",
    "name": "1047 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 45,
    "image": "images/frames/1047-front.jpg",
    "imageUrl": "/images/frames/1047-front.jpg",
    "images": [
      "/images/frames/1047-front.jpg",
      "/images/frames/1047-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1047 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1048",
    "sku": "NOOR-1048",
    "name": "1048 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 46,
    "image": "images/frames/1048-front.jpg",
    "imageUrl": "/images/frames/1048-front.jpg",
    "images": [
      "/images/frames/1048-front.jpg",
      "/images/frames/1048-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1048 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1049",
    "sku": "NOOR-1049",
    "name": "1049 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 47,
    "image": "images/frames/1049-front.jpg",
    "imageUrl": "/images/frames/1049-front.jpg",
    "images": [
      "/images/frames/1049-front.jpg",
      "/images/frames/1049-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1049 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1050",
    "sku": "NOOR-1050",
    "name": "1050 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 48,
    "image": "images/frames/1050-front.jpg",
    "imageUrl": "/images/frames/1050-front.jpg",
    "images": [
      "/images/frames/1050-front.jpg",
      "/images/frames/1050-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1050 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1051",
    "sku": "NOOR-1051",
    "name": "1051 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 49,
    "image": "images/frames/1051-front.jpg",
    "imageUrl": "/images/frames/1051-front.jpg",
    "images": [
      "/images/frames/1051-front.jpg",
      "/images/frames/1051-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1051 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1052",
    "sku": "NOOR-1052",
    "name": "1052 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 50,
    "image": "images/frames/1052-front.jpg",
    "imageUrl": "/images/frames/1052-front.jpg",
    "images": [
      "/images/frames/1052-front.jpg",
      "/images/frames/1052-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1052 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1053",
    "sku": "NOOR-1053",
    "name": "1053 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 51,
    "image": "images/frames/1053-front.jpg",
    "imageUrl": "/images/frames/1053-front.jpg",
    "images": [
      "/images/frames/1053-front.jpg",
      "/images/frames/1053-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1053 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1054",
    "sku": "NOOR-1054",
    "name": "1054 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 52,
    "image": "images/frames/1054-front.jpg",
    "imageUrl": "/images/frames/1054-front.jpg",
    "images": [
      "/images/frames/1054-front.jpg",
      "/images/frames/1054-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1054 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1055",
    "sku": "NOOR-1055",
    "name": "1055 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 53,
    "image": "images/frames/1055-front.jpg",
    "imageUrl": "/images/frames/1055-front.jpg",
    "images": [
      "/images/frames/1055-front.jpg",
      "/images/frames/1055-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1055 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1056",
    "sku": "NOOR-1056",
    "name": "1056 Classic Black Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 54,
    "image": "images/frames/1056-front.jpg",
    "imageUrl": "/images/frames/1056-front.jpg",
    "images": [
      "/images/frames/1056-front.jpg",
      "/images/frames/1056-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1056 Classic Black Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1057",
    "sku": "NOOR-1057",
    "name": "1057 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 55,
    "image": "images/frames/1057-front.jpg",
    "imageUrl": "/images/frames/1057-front.jpg",
    "images": [
      "/images/frames/1057-front.jpg",
      "/images/frames/1057-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1057 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1058",
    "sku": "NOOR-1058",
    "name": "1058 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 56,
    "image": "images/frames/1058-front.jpg",
    "imageUrl": "/images/frames/1058-front.jpg",
    "images": [
      "/images/frames/1058-front.jpg",
      "/images/frames/1058-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1058 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1059",
    "sku": "NOOR-1059",
    "name": "1059 Tortoise / Brown Round Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Round",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 57,
    "image": "images/frames/1059-front.jpg",
    "imageUrl": "/images/frames/1059-front.jpg",
    "images": [
      "/images/frames/1059-front.jpg",
      "/images/frames/1059-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1059 Tortoise / Brown Round Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1060",
    "sku": "NOOR-1060",
    "name": "1060 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 58,
    "image": "images/frames/1060-front.jpg",
    "imageUrl": "/images/frames/1060-front.jpg",
    "images": [
      "/images/frames/1060-front.jpg",
      "/images/frames/1060-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1060 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1061",
    "sku": "NOOR-1061",
    "name": "1061 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 59,
    "image": "images/frames/1061-front.jpg",
    "imageUrl": "/images/frames/1061-front.jpg",
    "images": [
      "/images/frames/1061-front.jpg",
      "/images/frames/1061-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1061 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1062",
    "sku": "NOOR-1062",
    "name": "1062 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 60,
    "image": "images/frames/1062-front.jpg",
    "imageUrl": "/images/frames/1062-front.jpg",
    "images": [
      "/images/frames/1062-front.jpg",
      "/images/frames/1062-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1062 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1063",
    "sku": "NOOR-1063",
    "name": "1063 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 61,
    "image": "images/frames/1063-front.jpg",
    "imageUrl": "/images/frames/1063-front.jpg",
    "images": [
      "/images/frames/1063-front.jpg",
      "/images/frames/1063-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1063 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1064",
    "sku": "NOOR-1064",
    "name": "1064 Tortoise / Brown Geometric/Hexagonal Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Geometric/Hexagonal",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 62,
    "image": "images/frames/1064-front.jpg",
    "imageUrl": "/images/frames/1064-front.jpg",
    "images": [
      "/images/frames/1064-front.jpg",
      "/images/frames/1064-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1064 Tortoise / Brown Geometric/Hexagonal Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1065",
    "sku": "NOOR-1065",
    "name": "1065 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 63,
    "image": "images/frames/1065-front.jpg",
    "imageUrl": "/images/frames/1065-front.jpg",
    "images": [
      "/images/frames/1065-front.jpg",
      "/images/frames/1065-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1065 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1066",
    "sku": "NOOR-1066",
    "name": "1066 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 64,
    "image": "images/frames/1066-front.jpg",
    "imageUrl": "/images/frames/1066-front.jpg",
    "images": [
      "/images/frames/1066-front.jpg",
      "/images/frames/1066-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1066 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1067",
    "sku": "NOOR-1067",
    "name": "1067 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 65,
    "image": "images/frames/1067-front.jpg",
    "imageUrl": "/images/frames/1067-front.jpg",
    "images": [
      "/images/frames/1067-front.jpg",
      "/images/frames/1067-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1067 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1068",
    "sku": "NOOR-1068",
    "name": "1068 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 66,
    "image": "images/frames/1068-front.jpg",
    "imageUrl": "/images/frames/1068-front.jpg",
    "images": [
      "/images/frames/1068-front.jpg",
      "/images/frames/1068-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1068 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1069",
    "sku": "NOOR-1069",
    "name": "1069 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 67,
    "image": "images/frames/1069-front.jpg",
    "imageUrl": "/images/frames/1069-front.jpg",
    "images": [
      "/images/frames/1069-front.jpg",
      "/images/frames/1069-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1069 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1070",
    "sku": "NOOR-1070",
    "name": "1070 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 68,
    "image": "images/frames/1070-front.jpg",
    "imageUrl": "/images/frames/1070-front.jpg",
    "images": [
      "/images/frames/1070-front.jpg",
      "/images/frames/1070-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1070 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1071",
    "sku": "NOOR-1071",
    "name": "1071 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 69,
    "image": "images/frames/1071-front.jpg",
    "imageUrl": "/images/frames/1071-front.jpg",
    "images": [
      "/images/frames/1071-front.jpg",
      "/images/frames/1071-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1071 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1072",
    "sku": "NOOR-1072",
    "name": "1072 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 70,
    "image": "images/frames/1072-front.jpg",
    "imageUrl": "/images/frames/1072-front.jpg",
    "images": [
      "/images/frames/1072-front.jpg",
      "/images/frames/1072-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1072 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1073",
    "sku": "NOOR-1073",
    "name": "1073 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 71,
    "image": "images/frames/1073-front.jpg",
    "imageUrl": "/images/frames/1073-front.jpg",
    "images": [
      "/images/frames/1073-front.jpg",
      "/images/frames/1073-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1073 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1074",
    "sku": "NOOR-1074",
    "name": "1074 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 72,
    "image": "images/frames/1074-front.jpg",
    "imageUrl": "/images/frames/1074-front.jpg",
    "images": [
      "/images/frames/1074-front.jpg",
      "/images/frames/1074-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1074 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1075",
    "sku": "NOOR-1075",
    "name": "1075 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 73,
    "image": "images/frames/1075-front.jpg",
    "imageUrl": "/images/frames/1075-front.jpg",
    "images": [
      "/images/frames/1075-front.jpg",
      "/images/frames/1075-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1075 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1076",
    "sku": "NOOR-1076",
    "name": "1076 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 74,
    "image": "images/frames/1076-front.jpg",
    "imageUrl": "/images/frames/1076-front.jpg",
    "images": [
      "/images/frames/1076-front.jpg",
      "/images/frames/1076-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1076 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1077",
    "sku": "NOOR-1077",
    "name": "1077 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 75,
    "image": "images/frames/1077-front.jpg",
    "imageUrl": "/images/frames/1077-front.jpg",
    "images": [
      "/images/frames/1077-front.jpg",
      "/images/frames/1077-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1077 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1078",
    "sku": "NOOR-1078",
    "name": "1078 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 76,
    "image": "images/frames/1078-front.jpg",
    "imageUrl": "/images/frames/1078-front.jpg",
    "images": [
      "/images/frames/1078-front.jpg",
      "/images/frames/1078-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1078 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1079",
    "sku": "NOOR-1079",
    "name": "1079 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 77,
    "image": "images/frames/1079-front.jpg",
    "imageUrl": "/images/frames/1079-front.jpg",
    "images": [
      "/images/frames/1079-front.jpg",
      "/images/frames/1079-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1079 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1080",
    "sku": "NOOR-1080",
    "name": "1080 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 38,
    "image": "images/frames/1080-front.jpg",
    "imageUrl": "/images/frames/1080-front.jpg",
    "images": [
      "/images/frames/1080-front.jpg",
      "/images/frames/1080-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1080 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1081",
    "sku": "NOOR-1081",
    "name": "1081 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 39,
    "image": "images/frames/1081-front.jpg",
    "imageUrl": "/images/frames/1081-front.jpg",
    "images": [
      "/images/frames/1081-front.jpg",
      "/images/frames/1081-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1081 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1082",
    "sku": "NOOR-1082",
    "name": "1082 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 40,
    "image": "images/frames/1082-front.jpg",
    "imageUrl": "/images/frames/1082-front.jpg",
    "images": [
      "/images/frames/1082-front.jpg",
      "/images/frames/1082-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1082 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1083",
    "sku": "NOOR-1083",
    "name": "1083 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 41,
    "image": "images/frames/1083-front.jpg",
    "imageUrl": "/images/frames/1083-front.jpg",
    "images": [
      "/images/frames/1083-front.jpg",
      "/images/frames/1083-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1083 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1084",
    "sku": "NOOR-1084",
    "name": "1084 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 42,
    "image": "images/frames/1084-front.jpg",
    "imageUrl": "/images/frames/1084-front.jpg",
    "images": [
      "/images/frames/1084-front.jpg",
      "/images/frames/1084-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1084 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1085",
    "sku": "NOOR-1085",
    "name": "1085 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 43,
    "image": "images/frames/1085-front.jpg",
    "imageUrl": "/images/frames/1085-front.jpg",
    "images": [
      "/images/frames/1085-front.jpg",
      "/images/frames/1085-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1085 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1086",
    "sku": "NOOR-1086",
    "name": "1086 Tortoise / Brown Geometric/Hexagonal Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Geometric/Hexagonal",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 44,
    "image": "images/frames/1086-front.jpg",
    "imageUrl": "/images/frames/1086-front.jpg",
    "images": [
      "/images/frames/1086-front.jpg",
      "/images/frames/1086-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1086 Tortoise / Brown Geometric/Hexagonal Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1087",
    "sku": "NOOR-1087",
    "name": "1087 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 45,
    "image": "images/frames/1087-front.jpg",
    "imageUrl": "/images/frames/1087-front.jpg",
    "images": [
      "/images/frames/1087-front.jpg",
      "/images/frames/1087-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1087 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1088",
    "sku": "NOOR-1088",
    "name": "1088 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 46,
    "image": "images/frames/1088-front.jpg",
    "imageUrl": "/images/frames/1088-front.jpg",
    "images": [
      "/images/frames/1088-front.jpg",
      "/images/frames/1088-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1088 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1089",
    "sku": "NOOR-1089",
    "name": "1089 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 47,
    "image": "images/frames/1089-front.jpg",
    "imageUrl": "/images/frames/1089-front.jpg",
    "images": [
      "/images/frames/1089-front.jpg",
      "/images/frames/1089-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1089 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1090",
    "sku": "NOOR-1090",
    "name": "1090 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 48,
    "image": "images/frames/1090-front.jpg",
    "imageUrl": "/images/frames/1090-front.jpg",
    "images": [
      "/images/frames/1090-front.jpg",
      "/images/frames/1090-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1090 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1091",
    "sku": "NOOR-1091",
    "name": "1091 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 49,
    "image": "images/frames/1091-front.jpg",
    "imageUrl": "/images/frames/1091-front.jpg",
    "images": [
      "/images/frames/1091-front.jpg",
      "/images/frames/1091-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1091 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1092",
    "sku": "NOOR-1092",
    "name": "1092 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 50,
    "image": "images/frames/1092-front.jpg",
    "imageUrl": "/images/frames/1092-front.jpg",
    "images": [
      "/images/frames/1092-front.jpg",
      "/images/frames/1092-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1092 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1093",
    "sku": "NOOR-1093",
    "name": "1093 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 51,
    "image": "images/frames/1093-front.jpg",
    "imageUrl": "/images/frames/1093-front.jpg",
    "images": [
      "/images/frames/1093-front.jpg",
      "/images/frames/1093-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1093 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1094",
    "sku": "NOOR-1094",
    "name": "1094 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 52,
    "image": "images/frames/1094-front.jpg",
    "imageUrl": "/images/frames/1094-front.jpg",
    "images": [
      "/images/frames/1094-front.jpg",
      "/images/frames/1094-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1094 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1095",
    "sku": "NOOR-1095",
    "name": "1095 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 53,
    "image": "images/frames/1095-front.jpg",
    "imageUrl": "/images/frames/1095-front.jpg",
    "images": [
      "/images/frames/1095-front.jpg",
      "/images/frames/1095-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1095 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1096",
    "sku": "NOOR-1096",
    "name": "1096 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 54,
    "image": "images/frames/1096-front.jpg",
    "imageUrl": "/images/frames/1096-front.jpg",
    "images": [
      "/images/frames/1096-front.jpg",
      "/images/frames/1096-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1096 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1097",
    "sku": "NOOR-1097",
    "name": "1097 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 55,
    "image": "images/frames/1097-front.jpg",
    "imageUrl": "/images/frames/1097-front.jpg",
    "images": [
      "/images/frames/1097-front.jpg",
      "/images/frames/1097-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1097 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1098",
    "sku": "NOOR-1098",
    "name": "1098 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 56,
    "image": "images/frames/1098-front.jpg",
    "imageUrl": "/images/frames/1098-front.jpg",
    "images": [
      "/images/frames/1098-front.jpg",
      "/images/frames/1098-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1098 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1099",
    "sku": "NOOR-1099",
    "name": "1099 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 57,
    "image": "images/frames/1099-front.jpg",
    "imageUrl": "/images/frames/1099-front.jpg",
    "images": [
      "/images/frames/1099-front.jpg",
      "/images/frames/1099-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1099 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1100",
    "sku": "NOOR-1100",
    "name": "1100 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 58,
    "image": "images/frames/1100-front.jpg",
    "imageUrl": "/images/frames/1100-front.jpg",
    "images": [
      "/images/frames/1100-front.jpg",
      "/images/frames/1100-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1100 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1101",
    "sku": "NOOR-1101",
    "name": "1101 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 59,
    "image": "images/frames/1101-front.jpg",
    "imageUrl": "/images/frames/1101-front.jpg",
    "images": [
      "/images/frames/1101-front.jpg",
      "/images/frames/1101-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1101 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1102",
    "sku": "NOOR-1102",
    "name": "1102 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 60,
    "image": "images/frames/1102-front.jpg",
    "imageUrl": "/images/frames/1102-front.jpg",
    "images": [
      "/images/frames/1102-front.jpg",
      "/images/frames/1102-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1102 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1103",
    "sku": "NOOR-1103",
    "name": "1103 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 61,
    "image": "images/frames/1103-front.jpg",
    "imageUrl": "/images/frames/1103-front.jpg",
    "images": [
      "/images/frames/1103-front.jpg",
      "/images/frames/1103-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1103 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1104",
    "sku": "NOOR-1104",
    "name": "1104 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 62,
    "image": "images/frames/1104-front.jpg",
    "imageUrl": "/images/frames/1104-front.jpg",
    "images": [
      "/images/frames/1104-front.jpg",
      "/images/frames/1104-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1104 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1105",
    "sku": "NOOR-1105",
    "name": "1105 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 63,
    "image": "images/frames/1105-front.jpg",
    "imageUrl": "/images/frames/1105-front.jpg",
    "images": [
      "/images/frames/1105-front.jpg",
      "/images/frames/1105-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1105 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1106",
    "sku": "NOOR-1106",
    "name": "1106 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 64,
    "image": "images/frames/1106-front.jpg",
    "imageUrl": "/images/frames/1106-front.jpg",
    "images": [
      "/images/frames/1106-front.jpg",
      "/images/frames/1106-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1106 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1107",
    "sku": "NOOR-1107",
    "name": "1107 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 65,
    "image": "images/frames/1107-front.jpg",
    "imageUrl": "/images/frames/1107-front.jpg",
    "images": [
      "/images/frames/1107-front.jpg",
      "/images/frames/1107-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1107 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1108",
    "sku": "NOOR-1108",
    "name": "1108 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 66,
    "image": "images/frames/1108-front.jpg",
    "imageUrl": "/images/frames/1108-front.jpg",
    "images": [
      "/images/frames/1108-front.jpg",
      "/images/frames/1108-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1108 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1109",
    "sku": "NOOR-1109",
    "name": "1109 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 67,
    "image": "images/frames/1109-front.jpg",
    "imageUrl": "/images/frames/1109-front.jpg",
    "images": [
      "/images/frames/1109-front.jpg",
      "/images/frames/1109-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1109 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1110",
    "sku": "NOOR-1110",
    "name": "1110 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 68,
    "image": "images/frames/1110-front.jpg",
    "imageUrl": "/images/frames/1110-front.jpg",
    "images": [
      "/images/frames/1110-front.jpg",
      "/images/frames/1110-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1110 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1111",
    "sku": "NOOR-1111",
    "name": "1111 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 69,
    "image": "images/frames/1111-front.jpg",
    "imageUrl": "/images/frames/1111-front.jpg",
    "images": [
      "/images/frames/1111-front.jpg",
      "/images/frames/1111-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1111 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1112",
    "sku": "NOOR-1112",
    "name": "1112 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 70,
    "image": "images/frames/1112-front.jpg",
    "imageUrl": "/images/frames/1112-front.jpg",
    "images": [
      "/images/frames/1112-front.jpg",
      "/images/frames/1112-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1112 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1113",
    "sku": "NOOR-1113",
    "name": "1113 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 71,
    "image": "images/frames/1113-front.jpg",
    "imageUrl": "/images/frames/1113-front.jpg",
    "images": [
      "/images/frames/1113-front.jpg",
      "/images/frames/1113-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1113 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1114",
    "sku": "NOOR-1114",
    "name": "1114 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 72,
    "image": "images/frames/1114-front.jpg",
    "imageUrl": "/images/frames/1114-front.jpg",
    "images": [
      "/images/frames/1114-front.jpg",
      "/images/frames/1114-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1114 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1115",
    "sku": "NOOR-1115",
    "name": "1115 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 73,
    "image": "images/frames/1115-front.jpg",
    "imageUrl": "/images/frames/1115-front.jpg",
    "images": [
      "/images/frames/1115-front.jpg",
      "/images/frames/1115-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1115 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1116",
    "sku": "NOOR-1116",
    "name": "1116 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 74,
    "image": "images/frames/1116-front.jpg",
    "imageUrl": "/images/frames/1116-front.jpg",
    "images": [
      "/images/frames/1116-front.jpg",
      "/images/frames/1116-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1116 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1117",
    "sku": "NOOR-1117",
    "name": "1117 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 75,
    "image": "images/frames/1117-front.jpg",
    "imageUrl": "/images/frames/1117-front.jpg",
    "images": [
      "/images/frames/1117-front.jpg",
      "/images/frames/1117-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1117 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1118",
    "sku": "NOOR-1118",
    "name": "1118 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 76,
    "image": "images/frames/1118-front.jpg",
    "imageUrl": "/images/frames/1118-front.jpg",
    "images": [
      "/images/frames/1118-front.jpg",
      "/images/frames/1118-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1118 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1119",
    "sku": "NOOR-1119",
    "name": "1119 Tortoise / Brown Geometric/Hexagonal Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Geometric/Hexagonal",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 77,
    "image": "images/frames/1119-front.jpg",
    "imageUrl": "/images/frames/1119-front.jpg",
    "images": [
      "/images/frames/1119-front.jpg",
      "/images/frames/1119-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1119 Tortoise / Brown Geometric/Hexagonal Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1120",
    "sku": "NOOR-1120",
    "name": "1120 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 38,
    "image": "images/frames/1120-front.jpg",
    "imageUrl": "/images/frames/1120-front.jpg",
    "images": [
      "/images/frames/1120-front.jpg",
      "/images/frames/1120-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1120 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1121",
    "sku": "NOOR-1121",
    "name": "1121 Tortoise / Brown Geometric/Hexagonal Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Geometric/Hexagonal",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 39,
    "image": "images/frames/1121-front.jpg",
    "imageUrl": "/images/frames/1121-front.jpg",
    "images": [
      "/images/frames/1121-front.jpg",
      "/images/frames/1121-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1121 Tortoise / Brown Geometric/Hexagonal Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1122",
    "sku": "NOOR-1122",
    "name": "1122 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 40,
    "image": "images/frames/1122-front.jpg",
    "imageUrl": "/images/frames/1122-front.jpg",
    "images": [
      "/images/frames/1122-front.jpg",
      "/images/frames/1122-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1122 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1123",
    "sku": "NOOR-1123",
    "name": "1123 Tortoise / Brown Geometric/Hexagonal Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Geometric/Hexagonal",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 41,
    "image": "images/frames/1123-front.jpg",
    "imageUrl": "/images/frames/1123-front.jpg",
    "images": [
      "/images/frames/1123-front.jpg",
      "/images/frames/1123-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1123 Tortoise / Brown Geometric/Hexagonal Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1124",
    "sku": "NOOR-1124",
    "name": "1124 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 42,
    "image": "images/frames/1124-front.jpg",
    "imageUrl": "/images/frames/1124-front.jpg",
    "images": [
      "/images/frames/1124-front.jpg",
      "/images/frames/1124-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1124 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1125",
    "sku": "NOOR-1125",
    "name": "1125 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 43,
    "image": "images/frames/1125-front.jpg",
    "imageUrl": "/images/frames/1125-front.jpg",
    "images": [
      "/images/frames/1125-front.jpg",
      "/images/frames/1125-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1125 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1126",
    "sku": "NOOR-1126",
    "name": "1126 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 44,
    "image": "images/frames/1126-front.jpg",
    "imageUrl": "/images/frames/1126-front.jpg",
    "images": [
      "/images/frames/1126-front.jpg",
      "/images/frames/1126-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1126 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1127",
    "sku": "NOOR-1127",
    "name": "1127 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 45,
    "image": "images/frames/1127-front.jpg",
    "imageUrl": "/images/frames/1127-front.jpg",
    "images": [
      "/images/frames/1127-front.jpg",
      "/images/frames/1127-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1127 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1128",
    "sku": "NOOR-1128",
    "name": "1128 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 46,
    "image": "images/frames/1128-front.jpg",
    "imageUrl": "/images/frames/1128-front.jpg",
    "images": [
      "/images/frames/1128-front.jpg",
      "/images/frames/1128-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1128 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1129",
    "sku": "NOOR-1129",
    "name": "1129 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 47,
    "image": "images/frames/1129-front.jpg",
    "imageUrl": "/images/frames/1129-front.jpg",
    "images": [
      "/images/frames/1129-front.jpg",
      "/images/frames/1129-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1129 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1130",
    "sku": "NOOR-1130",
    "name": "1130 Tortoise / Brown Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 48,
    "image": "images/frames/1130-front.jpg",
    "imageUrl": "/images/frames/1130-front.jpg",
    "images": [
      "/images/frames/1130-front.jpg",
      "/images/frames/1130-side.jpg"
    ],
    "colors": [
      {
        "name": "Tortoise / Brown",
        "hex": "#654321"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1130 Tortoise / Brown Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1131",
    "sku": "NOOR-1131",
    "name": "1131 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 49,
    "image": "images/frames/1131-front.jpg",
    "imageUrl": "/images/frames/1131-front.jpg",
    "images": [
      "/images/frames/1131-front.jpg",
      "/images/frames/1131-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1131 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1132",
    "sku": "NOOR-1132",
    "name": "1132 Classic Black Rectangle Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Rectangle",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 50,
    "image": "images/frames/1132-front.jpg",
    "imageUrl": "/images/frames/1132-front.jpg",
    "images": [
      "/images/frames/1132-front.jpg",
      "/images/frames/1132-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1132 Classic Black Rectangle Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
    "inStock": true
  },
  {
    "id": "prod-noor-1133",
    "sku": "NOOR-1133",
    "name": "1133 Classic Black Square Fiber Frame",
    "brand": "Noor Optics",
    "gender": "Unisex",
    "collection": "Fiber Heritage Collection",
    "price": 599,
    "originalPrice": 999,
    "badge": "",
    "shape": "Square",
    "material": "Fiber",
    "fit": "Regular",
    "frame_size": "Medium",
    "size": "Medium",
    "rimStyle": "Full-rim",
    "category": "Eyeglasses",
    "rating": "4.9",
    "reviewsCount": 51,
    "image": "images/frames/1133-front.jpg",
    "imageUrl": "/images/frames/1133-front.jpg",
    "images": [
      "/images/frames/1133-front.jpg",
      "/images/frames/1133-side.jpg"
    ],
    "colors": [
      {
        "name": "Classic Black",
        "hex": "#1A1A1A"
      }
    ],
    "dimensions": {
      "lens": "52mm",
      "bridge": "18mm",
      "temple": "142mm",
      "weight": "15g"
    },
    "description": "1133 Classic Black Square Fiber Frame. Genuine lightweight fiber construction with high-durability hinge mechanism. Available at Noor Optics Boutique.",
    "stock": 5,
    "total_stock": 5,
    "available_qty": 5,
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
