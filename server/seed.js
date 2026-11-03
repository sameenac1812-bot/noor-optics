/**
 * server/seed.js – Initial Data Seeder for Noor Optics Platform
 * Seeds roles, permissions, admin users, inventory locations, suppliers,
 * all 18 optical catalog products with stock balances, expense categories, and store settings.
 */

'use strict';

const bcrypt = require('bcryptjs');

function seedDatabase(customDb) {
  const activeDb = customDb || require('./db').db;
  const insertMany = activeDb.transaction(() => {
    // ── 1. Roles ─────────────────────────────────────────────────────────────
    const roles = [
      { id: 'role-owner', name: 'Owner / Super Admin', description: 'Full access to POS, financials, staff, settings, and stock' },
      { id: 'role-manager', name: 'Store Manager', description: 'Can operate POS, manage inventory, verify payments, and view reports' },
      { id: 'role-cashier', name: 'Cashier', description: 'Can operate POS register, view orders, and print tokens' },
      { id: 'role-inventory', name: 'Inventory Staff', description: 'Can receive purchase orders, adjust stock, and edit catalog' },
      { id: 'role-accountant', name: 'Accountant', description: 'Access to financial statements, profit & loss, expenses, and invoices' }
    ];

    const insertRole = activeDb.prepare('INSERT OR IGNORE INTO roles (id, name, description) VALUES (@id, @name, @description)');
    roles.forEach(r => insertRole.run(r));

    // ── 2. Permissions ───────────────────────────────────────────────────────
    const permissionsMap = {
      'role-owner': [
        'pos:checkout', 'pos:discount', 'pos:refund', 'orders:view', 'orders:manage',
        'payments:verify', 'products:manage', 'inventory:view', 'inventory:adjust',
        'purchases:manage', 'expenses:manage', 'finance:view', 'settings:manage',
        'users:manage', 'printer:manage', 'audit:view'
      ],
      'role-manager': [
        'pos:checkout', 'pos:discount', 'orders:view', 'orders:manage',
        'payments:verify', 'products:manage', 'inventory:view', 'inventory:adjust',
        'purchases:manage', 'expenses:manage', 'finance:view', 'printer:manage'
      ],
      'role-cashier': [
        'pos:checkout', 'orders:view', 'payments:verify', 'printer:manage'
      ],
      'role-inventory': [
        'products:manage', 'inventory:view', 'inventory:adjust', 'purchases:manage'
      ],
      'role-accountant': [
        'orders:view', 'finance:view', 'expenses:manage', 'invoices:view'
      ]
    };

    const insertPerm = activeDb.prepare('INSERT OR IGNORE INTO permissions (id, role_id, code) VALUES (?, ?, ?)');
    for (const [roleId, codes] of Object.entries(permissionsMap)) {
      codes.forEach(code => {
        insertPerm.run(`${roleId}-${code}`, roleId, code);
      });
    }

    // ── 3. Initial Users (Hashed with bcrypt) ───────────────────────────────
    const insertUser = activeDb.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, role_id, phone, is_active)
      VALUES (@id, @name, @email, @password_hash, @role_id, @phone, 1)
    `);

    // Owner: admin@nooroptics.com / AdminPassword@123
    const adminHash = bcrypt.hashSync('AdminPassword@123', 10);
    insertUser.run({
      id: 'usr-admin-1',
      name: 'Sameena (Owner)',
      email: 'admin@nooroptics.com',
      password_hash: adminHash,
      role_id: 'role-owner',
      phone: '+91 98765 43210'
    });

    // Cashier: cashier@nooroptics.com / Cashier@123
    const cashierHash = bcrypt.hashSync('Cashier@123', 10);
    insertUser.run({
      id: 'usr-cashier-1',
      name: 'Boutique Cashier',
      email: 'cashier@nooroptics.com',
      password_hash: cashierHash,
      role_id: 'role-cashier',
      phone: '+91 98765 43211'
    });

    // ── 4. Inventory Location ────────────────────────────────────────────────
    activeDb.prepare(`
      INSERT OR IGNORE INTO inventory_locations (id, code, name, address, is_active)
      VALUES ('loc-main', 'MAIN_BOUTIQUE', 'Noor Flagship Boutique, Indiranagar', '104, 100ft Road, Bengaluru - 560038', 1)
    `).run();

    // ── 5. Suppliers ─────────────────────────────────────────────────────────
    const suppliers = [
      { id: 'sup-1', name: 'Tokyo Titanium Precision Ltd', contact_person: 'Kenji Sato', phone: '+81 3 5555 0142', email: 'orders@tokyotitanium.jp', address: 'Chiyoda-ku, Tokyo, Japan', gst_number: 'N/A (Import)' },
      { id: 'sup-2', name: 'Mazzucchelli 1849 Bio-Acetate S.p.A.', contact_person: 'Matteo Rossi', phone: '+39 0332 827111', email: 'sales@mazzucchelli1849.it', address: 'Castiglione Olona, Italy', gst_number: 'N/A (Import)' },
      { id: 'sup-3', name: 'Zeiss Vision Care India Pvt Ltd', contact_person: 'Pooja Nair', phone: '+91 80 4343 8888', email: 'bengaluru.lab@zeiss.com', address: 'Plot 3, Bommasandra Industrial Area, Bengaluru', gst_number: '29AAACZ1234F1Z8' }
    ];
    const insertSupplier = activeDb.prepare('INSERT OR IGNORE INTO suppliers (id, name, contact_person, phone, email, address, gst_number) VALUES (@id, @name, @contact_person, @phone, @email, @address, @gst_number)');
    suppliers.forEach(s => insertSupplier.run(s));

    // ── 6. Expense Categories ────────────────────────────────────────────────
    const categories = [
      { id: 'exp-cat-1', name: 'Boutique Lease & Maintenance', description: 'Store rent, building common area charges, and cleaning' },
      { id: 'exp-cat-2', name: 'Packaging & Hardcases', description: 'Luxury magnetic leatherette cases and microfiber cloths' },
      { id: 'exp-cat-3', name: 'Staff Salaries & Allowances', description: 'Optometrist, retail staff, and dispensing opticians' },
      { id: 'exp-cat-4', name: 'Marketing & Digital Ads', description: 'Editorial photography, local promotions, and social campaigns' },
      { id: 'exp-cat-5', name: 'Optometry Diagnostic Tools', description: 'Autorefractor servicing, trial lens set calibration, and sanitization' },
      { id: 'exp-cat-6', name: 'Utilities & High-Speed Internet', description: 'BESCOM electric power, water, and dedicated fiber Wi-Fi' }
    ];
    const insertExpCat = activeDb.prepare('INSERT OR IGNORE INTO expense_categories (id, name, description) VALUES (@id, @name, @description)');
    categories.forEach(c => insertExpCat.run(c));

    // ── 7. Products & Variants (Authoritative Store Inventory) ────────────
    const products = [
    {
        "id": "prod-noor-01",
        "sku": "NOOR-CRT-01",
        "name": "Cartier Panther Gold",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1461,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_01.jpg",
        "colors": [
            {
                "name": "Gold",
                "hex": "#D4AF37"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Panther Gold | Color: Gold | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-02",
        "sku": "NOOR-CRT-02",
        "name": "Cartier Sunset Rimless",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1448,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_02.jpg",
        "colors": [
            {
                "name": "Brown Gradient",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Sunset Rimless | Color: Brown Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-03",
        "sku": "NOOR-CRT-03",
        "name": "Cartier Blue Horizon",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1456,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_03.jpg",
        "colors": [
            {
                "name": "Blue Gradient",
                "hex": "#2B4C7E"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Blue Horizon | Color: Blue Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-04",
        "sku": "NOOR-CRT-04",
        "name": "Cartier Hexagon Facet",
        "brand": "Cartier",
        "shape": "Hex / Geometric",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1455,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_04.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Hexagon Facet | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-05",
        "sku": "NOOR-CRT-05",
        "name": "Cartier Crystal Rimless",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1425,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_05.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Crystal Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-06",
        "sku": "NOOR-CRT-06",
        "name": "Cartier Gold Aviator",
        "brand": "Cartier",
        "shape": "Aviator",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1433,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_06.jpg",
        "colors": [
            {
                "name": "Gold",
                "hex": "#D4AF37"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Gold Aviator | Color: Gold | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-07",
        "sku": "NOOR-CRT-07",
        "name": "Cartier Black Panther",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1456,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_07.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Black Panther | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-08",
        "sku": "NOOR-CRT-08",
        "name": "Cartier Brown Silhouette",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1432,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_08.jpg",
        "colors": [
            {
                "name": "Brown Gradient",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Brown Silhouette | Color: Brown Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-09",
        "sku": "NOOR-CRT-09",
        "name": "Cartier Mirage Shield",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1450,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_09.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Mirage Shield | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-10",
        "sku": "NOOR-CRT-10",
        "name": "Cartier Double Bridge",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1468,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_10.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Double Bridge | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-11",
        "sku": "NOOR-CRT-11",
        "name": "Cartier Amber Luxe",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1443,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_11.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Amber Luxe | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-12",
        "sku": "NOOR-CRT-12",
        "name": "Cartier Silver Facet",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1499,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_12.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Silver Facet | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-13",
        "sku": "NOOR-CRT-13",
        "name": "Cartier Diamond Cut",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1486,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_13.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Diamond Cut | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-14",
        "sku": "NOOR-VRC-14",
        "name": "Versace Medusa Havana",
        "brand": "Versace",
        "shape": "Square",
        "material": "Hand-Polished Bio-Acetate",
        "fit": "Regular",
        "price": 1485,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_14.jpg",
        "colors": [
            {
                "name": "Tortoise Havana",
                "hex": "#6E3E1C"
            }
        ],
        "desc": "Brand: Versace | Style: Versace Medusa Havana | Color: Tortoise Havana | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-15",
        "sku": "NOOR-VRC-15",
        "name": "Versace Crystal Grey",
        "brand": "Versace",
        "shape": "Square",
        "material": "Hand-Polished Bio-Acetate",
        "fit": "Regular",
        "price": 1415,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_15.jpg",
        "colors": [
            {
                "name": "Smoked Grey",
                "hex": "#52525B"
            }
        ],
        "desc": "Brand: Versace | Style: Versace Crystal Grey | Color: Smoked Grey | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-16",
        "sku": "NOOR-VRC-16",
        "name": "Versace Bold Square",
        "brand": "Versace",
        "shape": "Square",
        "material": "Hand-Polished Bio-Acetate",
        "fit": "Regular",
        "price": 1475,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_16.jpg",
        "colors": [
            {
                "name": "Onyx Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Versace | Style: Versace Bold Square | Color: Onyx Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-17",
        "sku": "NOOR-DNG-17",
        "name": "D&G Shield Rimless",
        "brand": "Dolce & Gabbana",
        "shape": "Hex / Geometric",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1479,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_17.jpg",
        "colors": [
            {
                "name": "Dark Gradient",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Shield Rimless | Color: Dark Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-18",
        "sku": "NOOR-DNG-18",
        "name": "D&G Gold Baroque",
        "brand": "Dolce & Gabbana",
        "shape": "Rectangular",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1443,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_18.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#D4AF37"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Gold Baroque | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-19",
        "sku": "NOOR-DNG-19",
        "name": "D&G Black Gradient",
        "brand": "Dolce & Gabbana",
        "shape": "Rectangular",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1407,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_19.jpg",
        "colors": [
            {
                "name": "Dark Gradient",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Black Gradient | Color: Dark Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-20",
        "sku": "NOOR-DNG-20",
        "name": "D&G Sunset Pilot",
        "brand": "Dolce & Gabbana",
        "shape": "Rectangular",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1438,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_20.jpg",
        "colors": [
            {
                "name": "Dark Gradient",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Sunset Pilot | Color: Dark Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-21",
        "sku": "NOOR-DNG-21",
        "name": "D&G Crystal Smoke",
        "brand": "Dolce & Gabbana",
        "shape": "Rectangular",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1484,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_21.jpg",
        "colors": [
            {
                "name": "Dark Gradient",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Crystal Smoke | Color: Dark Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-22",
        "sku": "NOOR-DNG-22",
        "name": "D&G Milan Square",
        "brand": "Dolce & Gabbana",
        "shape": "Square",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1493,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_22.jpg",
        "colors": [
            {
                "name": "Dark Gradient",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Milan Square | Color: Dark Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-23",
        "sku": "NOOR-BRB-23",
        "name": "Burberry Check Square",
        "brand": "Burberry",
        "shape": "Square",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1438,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_23.jpg",
        "colors": [
            {
                "name": "Black Check",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry Check Square | Color: Black Check | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-24",
        "sku": "NOOR-BRB-24",
        "name": "Burberry Classic Noir",
        "brand": "Burberry",
        "shape": "Rectangular",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1499,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_24.jpg",
        "colors": [
            {
                "name": "Black Check",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry Classic Noir | Color: Black Check | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-25",
        "sku": "NOOR-BRB-25",
        "name": "Burberry Burgundy Chic",
        "brand": "Burberry",
        "shape": "Rectangular",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1429,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_25.jpg",
        "colors": [
            {
                "name": "Burgundy",
                "hex": "#4A1521"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry Burgundy Chic | Color: Burgundy | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-26",
        "sku": "NOOR-BRB-26",
        "name": "Burberry Urban Grey",
        "brand": "Burberry",
        "shape": "Rectangular",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1448,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_26.jpg",
        "colors": [
            {
                "name": "Translucent Grey",
                "hex": "#71717A"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry Urban Grey | Color: Translucent Grey | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-27",
        "sku": "NOOR-CRT-27",
        "name": "Cartier Royal Shield",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1422,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_27.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Royal Shield | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-28",
        "sku": "NOOR-CRT-28",
        "name": "Cartier Octagon Gold",
        "brand": "Cartier",
        "shape": "Hex / Geometric",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1480,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_28.jpg",
        "colors": [
            {
                "name": "Gold",
                "hex": "#D4AF37"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Octagon Gold | Color: Gold | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-29",
        "sku": "NOOR-CRT-29",
        "name": "Cartier Champagne Tint",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1498,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_29.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Champagne Tint | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-30",
        "sku": "NOOR-BRB-30",
        "name": "Burberry Havana Tartan",
        "brand": "Burberry",
        "shape": "Rectangular",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1419,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_30.jpg",
        "colors": [
            {
                "name": "Tartan Havana",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry Havana Tartan | Color: Tartan Havana | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-31",
        "sku": "NOOR-CRT-31",
        "name": "Cartier Emerald Rimless",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1461,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_31.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Emerald Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-32",
        "sku": "NOOR-CRT-32",
        "name": "Cartier Jaguar Noir",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1461,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_32.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Jaguar Noir | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-33",
        "sku": "NOOR-DNG-33",
        "name": "D&G Olive Gradient",
        "brand": "Dolce & Gabbana",
        "shape": "Rectangular",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1482,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_33.jpg",
        "colors": [
            {
                "name": "Olive Gradient",
                "hex": "#556B2F"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Olive Gradient | Color: Olive Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-34",
        "sku": "NOOR-DNG-34",
        "name": "D&G Logo Cutout",
        "brand": "Dolce & Gabbana",
        "shape": "Rectangular",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1459,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_34.jpg",
        "colors": [
            {
                "name": "Dark Gradient",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Logo Cutout | Color: Dark Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-35",
        "sku": "NOOR-DNG-35",
        "name": "D&G Blue Marine",
        "brand": "Dolce & Gabbana",
        "shape": "Rectangular",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1439,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_35.jpg",
        "colors": [
            {
                "name": "Ocean Blue",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Blue Marine | Color: Ocean Blue | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-36",
        "sku": "NOOR-CRT-36",
        "name": "Cartier Gold Studded",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1408,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_36.jpg",
        "colors": [
            {
                "name": "Gold",
                "hex": "#D4AF37"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Gold Studded | Color: Gold | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-37",
        "sku": "NOOR-CRT-37",
        "name": "Cartier Horizon Gradient",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1484,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_37.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Horizon Gradient | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-38",
        "sku": "NOOR-DNG-38",
        "name": "D&G Havana Modern",
        "brand": "Dolce & Gabbana",
        "shape": "Rectangular",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1437,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_38.jpg",
        "colors": [
            {
                "name": "Dark Gradient",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Havana Modern | Color: Dark Gradient | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-39",
        "sku": "NOOR-DNG-39",
        "name": "D&G Gold Filigree",
        "brand": "Dolce & Gabbana",
        "shape": "Rectangular",
        "material": "Beta-Titanium & Acetate",
        "fit": "Regular",
        "price": 1425,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_39.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#D4AF37"
            }
        ],
        "desc": "Brand: Dolce & Gabbana | Style: D&G Gold Filigree | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-40",
        "sku": "NOOR-CRT-40",
        "name": "Cartier Titanium Pilot",
        "brand": "Cartier",
        "shape": "Aviator",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1424,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_40.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Titanium Pilot | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-41",
        "sku": "NOOR-CRT-41",
        "name": "Cartier Faceted Smoke",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1403,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_41.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Faceted Smoke | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-42",
        "sku": "NOOR-CRT-42",
        "name": "Cartier Rose Gold",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1456,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_42.jpg",
        "colors": [
            {
                "name": "Gold",
                "hex": "#D4AF37"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Rose Gold | Color: Gold | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-43",
        "sku": "NOOR-CRT-43",
        "name": "Cartier Classic Rimless",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1416,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_43.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Classic Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-44",
        "sku": "NOOR-CRT-44",
        "name": "Cartier Bronze Shield",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1441,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_44.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Bronze Shield | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-45",
        "sku": "NOOR-CRT-45",
        "name": "Cartier Platinum Pilot",
        "brand": "Cartier",
        "shape": "Aviator",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1486,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_45.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Platinum Pilot | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-46",
        "sku": "NOOR-CRT-46",
        "name": "Cartier Sleek Rimless",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1414,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_46.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Sleek Rimless | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-47",
        "sku": "NOOR-CRT-47",
        "name": "Cartier Midnight Panther",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1455,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_47.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Midnight Panther | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-48",
        "sku": "NOOR-CRT-48",
        "name": "Cartier Gold Silhouette",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1458,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_48.jpg",
        "colors": [
            {
                "name": "Gold",
                "hex": "#D4AF37"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Gold Silhouette | Color: Gold | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-49",
        "sku": "NOOR-CRT-49",
        "name": "Cartier Havana Edge",
        "brand": "Cartier",
        "shape": "Rectangular",
        "material": "Gold-Plated Titanium",
        "fit": "Regular",
        "price": 1403,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_49.jpg",
        "colors": [
            {
                "name": "Gold & Black",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Cartier | Style: Cartier Havana Edge | Color: Gold & Black | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-50",
        "sku": "NOOR-BRB-50",
        "name": "Burberry Optical Square",
        "brand": "Burberry",
        "shape": "Square",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1495,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_50.jpg",
        "colors": [
            {
                "name": "Black Check",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry Optical Square | Color: Black Check | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-51",
        "sku": "NOOR-BRB-51",
        "name": "Burberry London Rectangle",
        "brand": "Burberry",
        "shape": "Rectangular",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1478,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_51.jpg",
        "colors": [
            {
                "name": "Black Check",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry London Rectangle | Color: Black Check | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-52",
        "sku": "NOOR-BRB-52",
        "name": "Burberry Vintage Check",
        "brand": "Burberry",
        "shape": "Rectangular",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1474,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_52.jpg",
        "colors": [
            {
                "name": "Black Check",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry Vintage Check | Color: Black Check | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-53",
        "sku": "NOOR-BRB-53",
        "name": "Burberry Crystal Clear",
        "brand": "Burberry",
        "shape": "Rectangular",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1466,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_53.jpg",
        "colors": [
            {
                "name": "Black Check",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry Crystal Clear | Color: Black Check | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-54",
        "sku": "NOOR-BRB-54",
        "name": "Burberry Amber Tartan",
        "brand": "Burberry",
        "shape": "Rectangular",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1428,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_54.jpg",
        "colors": [
            {
                "name": "Tartan Havana",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry Amber Tartan | Color: Tartan Havana | Authenticity Card & Premium Case Included",
        "initialQty": 1
    },
    {
        "id": "prod-noor-55",
        "sku": "NOOR-BRB-55",
        "name": "Burberry British Modern",
        "brand": "Burberry",
        "shape": "Rectangular",
        "material": "Italian Bio-Acetate",
        "fit": "Regular",
        "price": 1425,
        "originalPrice": null,
        "cost": 650,
        "supplier": null,
        "image": "/images/frames/frame_55.jpg",
        "colors": [
            {
                "name": "Black Check",
                "hex": "#111111"
            }
        ],
        "desc": "Brand: Burberry | Style: Burberry British Modern | Color: Black Check | Authenticity Card & Premium Case Included",
        "initialQty": 1
    }
];

    const insertProduct = activeDb.prepare(`
      INSERT OR IGNORE INTO products (
        id, sku, name, brand, shape, material, fit, category,
        selling_price_paise, original_price_paise, purchase_cost_paise,
        tax_rate_percent, supplier_id, reorder_threshold, image_url, description
      ) VALUES (
        @id, @sku, @name, @brand, @shape, @material, @fit, 'Frames',
        @price_paise, @orig_price_paise, @cost_paise,
        18.0, @supplier_id, 0, @image, @desc
      )
    `);

    const insertVariant = activeDb.prepare(`
      INSERT OR IGNORE INTO product_variants (
        id, product_id, sku, barcode, color_name, color_hex, lens_type, dimensions_json, additional_price_paise
      ) VALUES (
        @id, @product_id, @sku, @barcode, @color_name, @color_hex, 'Standard Demo Lens', @dim_json, 0
      )
    `);

    const insertInvBalance = activeDb.prepare(`
      INSERT OR IGNORE INTO inventory_balances (
        id, variant_id, location_id, available_qty, reserved_qty
      ) VALUES (
        @id, @variant_id, 'loc-main', @qty, 0
      )
    `);

    const insertMovement = activeDb.prepare(`
      INSERT OR IGNORE INTO stock_movements (
        id, variant_id, location_id, change_qty, balance_after, movement_type, reference_id, reason, created_by_user_id
      ) VALUES (
        @id, @variant_id, 'loc-main', @qty, @qty, 'PURCHASE_RECEIPT', 'INIT-STOCK', 'Store launch inventory receipt', 'usr-admin-1'
      )
    `);

    products.forEach((p, pIndex) => {
      insertProduct.run({
        id: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        shape: p.shape,
        material: p.material,
        fit: p.fit,
        price_paise: p.price * 100,
        orig_price_paise: p.originalPrice ? p.originalPrice * 100 : null,
        cost_paise: p.cost * 100,
        supplier_id: p.supplier,
        image: p.image,
        desc: p.desc
      });

      p.colors.forEach((c, cIndex) => {
        const variantId = 'var-' + p.id + '-' + (cIndex + 1);
        const varSku = p.sku + '-' + c.name.substring(0, 3).toUpperCase() + '-2729';
        const barcode = '89025000' + String(pIndex + 1).padStart(2, '0');
        const initialQty = p.initialQty || 1;

        insertVariant.run({
          id: variantId,
          product_id: p.id,
          sku: varSku,
          barcode: barcode,
          color_name: c.name,
          color_hex: c.hex,
          dim_json: JSON.stringify({ lens: '54mm', bridge: '18mm', temple: '145mm', weight: '18g' })
        });

        insertInvBalance.run({
          id: 'bal-' + variantId + '-main',
          variant_id: variantId,
          qty: initialQty
        });

        insertMovement.run({
          id: 'mov-init-' + variantId,
          variant_id: variantId,
          qty: initialQty
        });
      });
    });

    // Permanent tombstone records so template demo frames and test items can never be resurrected
    const insertTombstone = activeDb.prepare(`
      INSERT OR IGNORE INTO deleted_products (product_id, sku, name) VALUES (?, ?, ?)
    `);
    for (let i = 1; i <= 18; i++) {
      const num = String(i).padStart(2, '0');
      insertTombstone.run('noor-' + num, 'NOOR-DEMO-' + num, 'Demo Frame ' + num);
    }
    insertTombstone.run('prod-1793549272721', 'RAY BAN', 'meta glasses meta');
    insertTombstone.run('prod-1793549836985', 'NOOR-ONKOSUNF-571', 'onko onko sun flaere');

    // ── 8. Store Settings ────────────────────────────────────────────────────
    const defaultSettings = [
      { key: 'store_name', value: 'Noor Optic' },
      { key: 'store_tagline', value: '' },
      { key: 'store_address', value: 'Pillar No: 45, Beside HP Petrol Pump, Opposite Subhan Bakery, Rethibowli, Gudimalkapur, Hyderabad, Telangana 500028' },
      { key: 'store_phone', value: '+91 98765 43210' },
      { key: 'store_email', value: 'concierge@nooroptics.com' },
      { key: 'store_gstin', value: '29AAAAA0000A1Z5' },
      { key: 'store_upi_id', value: 'nooroptics@okhdfcbank' },
      { key: 'store_upi_merchant_name', value: 'NOOR OPTICS RETAIL' },
      { key: 'printer_nominal_width_mm', value: '58' },
      { key: 'printer_windows_name', value: 'POS-80' },
      { key: 'printer_use_browser_fallback', value: '1' },
      { key: 'invoice_prefix', value: 'NOOR-INV' },
      { key: 'tax_default_rate', value: '18.0' },
      { key: 'gpay_qr_image_url', value: 'images/merchant_gpay_qr_sample.png' }
    ];

    const insertSetting = activeDb.prepare('INSERT OR IGNORE INTO store_settings (key, value) VALUES (@key, @value)');
    defaultSettings.forEach(s => insertSetting.run(s));

    // ── 9. Initial Audit Log Entry ───────────────────────────────────────────
    activeDb.prepare(`
      INSERT OR IGNORE INTO audit_logs (id, user_id, user_email, action, entity_type, entity_id, details_json)
      VALUES ('aud-init-1', 'usr-admin-1', 'admin@nooroptics.com', 'SYSTEM_INITIALIZED', 'SYSTEM', 'DB_INIT', '{"message": "Complete platform initialized with 27 tables, 18 frames, and initial inventory."}')
    `).run();
  });

  insertMany();
  console.log('✓ Noor Optics Platform Database Seeded Successfully!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
