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

    // ── 7. Products & Variants (All 18 Handcrafted Optical Frames) ────────────
    const products = [
      { id: 'noor-01', sku: 'NOOR-STK-01', name: 'The Stockholm Noir', shape: 'Rectangular', material: 'Japanese Titanium', fit: 'Regular', price: 3499, originalPrice: 4299, cost: 1450, supplier: 'sup-1', image: 'images/stockholm_noir.jpg', colors: [{ name: 'Matte Black', hex: '#1A1A1A' }, { name: 'Gunmetal', hex: '#4A4D52' }, { name: 'Brushed Silver', hex: '#D1D5DB' }], desc: 'Architectural masterpiece engineered from aerospace-grade Japanese titanium.' },
      { id: 'noor-02', sku: 'NOOR-CPH-02', name: 'The Copenhagen Round', shape: 'Round', material: 'Italian Bio-Acetate', fit: 'Narrow', price: 3899, originalPrice: 4799, cost: 1600, supplier: 'sup-2', image: 'images/copenhagen_round.jpg', colors: [{ name: 'Dark Havana', hex: '#5C3A21' }, { name: 'Classic Tortoise', hex: '#8A5A36' }, { name: 'Onyx Black', hex: '#151515' }], desc: 'Timeless round silhouette featuring hand-beveled Italian bio-acetate.' },
      { id: 'noor-03', sku: 'NOOR-OSL-03', name: 'The Oslo Crystal', shape: 'Square', material: 'Handcrafted Bio-Acetate', fit: 'Regular', price: 3299, originalPrice: 3999, cost: 1350, supplier: 'sup-2', image: 'images/oslo_crystal.jpg', colors: [{ name: 'Crystal Clear', hex: '#F0F2F5' }, { name: 'Champagne Tint', hex: '#E8DEC8' }], desc: 'Luminous transparent bio-acetate celebrating light refraction.' },
      { id: 'noor-04', sku: 'NOOR-KYO-04', name: 'The Kyoto Havana', shape: 'Round', material: 'Japanese Acetate', fit: 'Regular', price: 4199, originalPrice: 4999, cost: 1800, supplier: 'sup-1', image: 'images/kyoto_havana.jpg', colors: [{ name: 'Amber Havana', hex: '#7A4A28' }, { name: 'Honey Amber', hex: '#B87333' }], desc: 'Warm organic tortoise tones cured for six months to ensure depth of luster.' },
      { id: 'noor-05', sku: 'NOOR-MIL-05', name: 'The Milan Aureum', shape: 'Geometric', material: 'Beta-Titanium & 18K Gold Finish', fit: 'Narrow', price: 4799, originalPrice: 5699, cost: 2100, supplier: 'sup-1', image: 'images/milan_aureum.jpg', colors: [{ name: '18K Gold Plated', hex: '#D4AF37' }, { name: 'Rose Gold', hex: '#C59B8B' }], desc: 'Ultra-slender beta-titanium wireframe sculpted with subtle octagonal facets.' },
      { id: 'noor-06', sku: 'NOOR-ZUR-06', name: 'The Zurich Titanium', shape: 'Rectangular', material: 'Pure Japanese Titanium', fit: 'Wide', price: 5299, originalPrice: 6299, cost: 2350, supplier: 'sup-1', image: 'images/zurich_titanium.jpg', colors: [{ name: 'Brushed Gunmetal', hex: '#3D4148' }, { name: 'Satin Platinum', hex: '#C8CBD0' }], desc: 'Weighing a mere 10 grams, the Zurich embodies Swiss optical minimalism.' },
      { id: 'noor-07', sku: 'NOOR-BER-07', name: 'The Berlin Hex', shape: 'Geometric', material: 'Surgical Stainless Steel', fit: 'Regular', price: 3699, originalPrice: 4499, cost: 1500, supplier: 'sup-1', image: 'images/berlin_hex.jpg', colors: [{ name: 'Matte Graphite', hex: '#2C2E33' }, { name: 'Raw Steel', hex: '#9AA0A6' }], desc: 'Geometric hexagonal frame cut from a single sheet of surgical stainless steel.' },
      { id: 'noor-08', sku: 'NOOR-HEL-08', name: 'The Helsinki Quad', shape: 'Square', material: 'Italian Bio-Acetate', fit: 'Wide', price: 3599, originalPrice: 4399, cost: 1480, supplier: 'sup-2', image: 'images/helsinki_quad.jpg', colors: [{ name: 'Deep Midnight Blue', hex: '#1B2838' }, { name: 'Jet Black', hex: '#111111' }], desc: 'Bold modern square frame featuring hand-sculpted bevels and German 5-barrel hinges.' },
      { id: 'noor-09', sku: 'NOOR-REY-09', name: 'The Reykjavik Pilot', shape: 'Aviator', material: 'Aerospace Titanium', fit: 'Wide', price: 4499, originalPrice: 5399, cost: 1900, supplier: 'sup-1', image: 'images/reykjavik_pilot.jpg', colors: [{ name: 'Antiqued Bronze', hex: '#5E4834' }, { name: 'Stealth Black', hex: '#212124' }], desc: 'Refined double-bridge architecture fabricated from aerospace titanium wire.' },
      { id: 'noor-10', sku: 'NOOR-VIE-10', name: 'The Vienna Silhouette', shape: 'Cat-Eye', material: 'Ultra-Light Bio-Acetate', fit: 'Narrow', price: 3999, originalPrice: 4799, cost: 1650, supplier: 'sup-2', image: 'images/vienna_silhouette.jpg', colors: [{ name: 'Tortoiseshell & Amber', hex: '#6E3E1C' }, { name: 'Gloss Noir', hex: '#191919' }], desc: 'Subtle feminine lift with soft cat-eye geometry and enamel shine.' },
      { id: 'noor-11', sku: 'NOOR-AMB-11', name: 'The Amber Arch', shape: 'Round', material: 'Italian Mazzucchelli Acetate', fit: 'Regular', price: 4299, originalPrice: 5199, cost: 1820, supplier: 'sup-2', image: 'images/amber_arch.jpg', colors: [{ name: 'Mazzucchelli Honey', hex: '#C68B45' }, { name: 'Whiskey Smoke', hex: '#5A3825' }], desc: 'Distinctive crown-panto rounded shape with an architectural flat top bridge.' },
      { id: 'noor-12', sku: 'NOOR-TKY-12', name: 'The Tokyo Steel', shape: 'Square', material: 'Brushed Stainless Steel', fit: 'Regular', price: 3799, originalPrice: 4599, cost: 1550, supplier: 'sup-1', image: 'images/tokyo_steel.jpg', colors: [{ name: 'Brushed Silver', hex: '#B8BCC2' }, { name: 'Anodized Black', hex: '#1C1C1E' }], desc: 'Precision-milled square frame featuring textured linear brushing across the brow.' },
      { id: 'noor-13', sku: 'NOOR-GOT-13', name: 'The Gothenburg Wire', shape: 'Oval', material: 'Japanese Titanium', fit: 'Narrow', price: 3699, originalPrice: 4499, cost: 1500, supplier: 'sup-1', image: 'images/stockholm_noir.jpg', colors: [{ name: 'Warm Copper', hex: '#9E5B32' }, { name: 'Brushed Silver', hex: '#C0C0C0' }], desc: 'Flexible memory titanium oval silhouette with ultra-thin profile.' },
      { id: 'noor-14', sku: 'NOOR-MAL-14', name: 'The Malmö Clear', shape: 'Geometric', material: 'Italian Bio-Acetate', fit: 'Regular', price: 3399, originalPrice: 4199, cost: 1380, supplier: 'sup-2', image: 'images/oslo_crystal.jpg', colors: [{ name: 'Smoked Quartz', hex: '#7E7672' }, { name: 'Crystal Clear', hex: '#F0F0F2' }], desc: 'Faceted geometric transparent bio-acetate with custom silver temple cores.' },
      { id: 'noor-15', sku: 'NOOR-ARC-15', name: 'The Arctic Sun-Optic', shape: 'Aviator', material: 'Surgical Stainless Steel', fit: 'Wide', price: 4599, originalPrice: 5499, cost: 1950, supplier: 'sup-1', image: 'images/reykjavik_pilot.jpg', colors: [{ name: 'Matte Olive', hex: '#4B5320' }, { name: 'Gunmetal', hex: '#3E424B' }], desc: 'Dual-purpose optical frame engineered for photochromic transition lenses.' },
      { id: 'noor-16', sku: 'NOOR-NRD-16', name: 'The Nord Fjord', shape: 'Rectangular', material: 'Handcrafted Bio-Acetate', fit: 'Regular', price: 3799, originalPrice: 4599, cost: 1550, supplier: 'sup-2', image: 'images/copenhagen_round.jpg', colors: [{ name: 'Frosted Smoke', hex: '#708090' }, { name: 'Pale Sage', hex: '#9CAF88' }], desc: 'Frosted semi-matte crystal acetate mimicking ice formations in the northern fjords.' },
      { id: 'noor-17', sku: 'NOOR-BER-17', name: 'The Bergen Dual', shape: 'Square', material: 'Japanese Titanium', fit: 'Wide', price: 4299, originalPrice: 5199, cost: 1850, supplier: 'sup-1', image: 'images/helsinki_quad.jpg', colors: [{ name: 'Matte Black & Gold', hex: '#222222' }, { name: 'Silver & Navy', hex: '#3A4D6B' }], desc: 'Combination frame fusing lightweight titanium rim inserts with bio-acetate brows.' },
      { id: 'noor-18', sku: 'NOOR-BOR-18', name: 'The Bordeaux Edge', shape: 'Cat-Eye', material: 'Italian Bio-Acetate', fit: 'Regular', price: 4099, originalPrice: 4899, cost: 1700, supplier: 'sup-2', image: 'images/vienna_silhouette.jpg', colors: [{ name: 'Bordeaux Merlot', hex: '#4A1521' }, { name: 'Espresso', hex: '#2B1B17' }], desc: 'Deep burgundy hues polished to a mirror gloss with sculpted cheekbone bevels.' }
    ];

    const insertProduct = activeDb.prepare(`
      INSERT OR IGNORE INTO products (
        id, sku, name, brand, shape, material, fit, category,
        selling_price_paise, original_price_paise, purchase_cost_paise,
        tax_rate_percent, supplier_id, reorder_threshold, image_url, description
      ) VALUES (
        @id, @sku, @name, 'Noor Optics', @shape, @material, @fit, 'Optical',
        @price_paise, @orig_price_paise, @cost_paise,
        18.0, @supplier_id, 5, @image, @desc
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
        @id, @variant_id, 'loc-main', @qty, @qty, 'PURCHASE_RECEIPT', 'INIT-STOCK', 'Initial store launch inventory receipt', 'usr-admin-1'
      )
    `);

    products.forEach((p, pIndex) => {
      insertProduct.run({
        id: p.id,
        sku: p.sku,
        name: p.name,
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

      // Create variants for colors
      p.colors.forEach((c, cIndex) => {
        const variantId = `var-${p.id}-${cIndex + 1}`;
        const varSku = `${p.sku}-${c.name.substring(0, 3).toUpperCase()}`;
        const barcode = `8901${String(pIndex + 1).padStart(3, '0')}${cIndex + 1}`;
        const initialQty = 15 + ((pIndex * 3 + cIndex) % 15); // Realistic stock: 15-28 units

        insertVariant.run({
          id: variantId,
          product_id: p.id,
          sku: varSku,
          barcode: barcode,
          color_name: c.name,
          color_hex: c.hex,
          dim_json: JSON.stringify({ lens: '52mm', bridge: '19mm', temple: '145mm', weight: '16g' })
        });

        insertInvBalance.run({
          id: `bal-${variantId}-main`,
          variant_id: variantId,
          qty: initialQty
        });

        insertMovement.run({
          id: `mov-init-${variantId}`,
          variant_id: variantId,
          qty: initialQty
        });
      });
    });

    // ── 8. Store Settings ────────────────────────────────────────────────────
    const defaultSettings = [
      { key: 'store_name', value: 'Noor Optics Flagship Boutique' },
      { key: 'store_tagline', value: 'Curated Scandinavian Eyewear & Vision Care' },
      { key: 'store_address', value: '104, 100ft Road, Indiranagar, Bengaluru, Karnataka - 560038' },
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
