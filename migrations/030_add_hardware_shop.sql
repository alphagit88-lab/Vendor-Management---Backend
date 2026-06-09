-- Hardware shop products (public e-commerce catalog)
CREATE TABLE IF NOT EXISTS hardware_products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  long_description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  stock INTEGER NOT NULL DEFAULT 0,
  image VARCHAR(500),
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hardware_products_slug ON hardware_products(slug);
CREATE INDEX IF NOT EXISTS idx_hardware_products_active ON hardware_products(is_active);

-- Shop orders (separate from field distribution orders)
CREATE TABLE IF NOT EXISTS shop_orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  shipping_address TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  stripe_session_id VARCHAR(255),
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_session ON shop_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_email ON shop_orders(customer_email);

CREATE TABLE IF NOT EXISTS shop_order_items (
  id SERIAL PRIMARY KEY,
  shop_order_id INTEGER NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  hardware_product_id INTEGER NOT NULL REFERENCES hardware_products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  line_total NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(shop_order_id);

-- Seed initial catalog (matches previous static frontend data)
INSERT INTO hardware_products (name, slug, description, long_description, price, stock, image, images, sort_order)
VALUES
(
  'Zebra ZD420 Thermal Printer',
  'zebra-zd420-thermal-printer',
  'High-performance direct thermal printer for labels and receipts, perfect for delivery operations.',
  'The Zebra ZD420 is a compact, easy-to-use direct thermal printer designed for high-volume label printing in retail, logistics, and delivery environments.',
  299.99,
  25,
  '/hardware/zebra-zd420.webp',
  '["/hardware/zebra-zd420.webp","/landing/pos-planning.jpg","/landing/tablet-warehouse.jpg","/landing/warehouse-team.jpg"]'::jsonb,
  1
),
(
  'Honeywell Voyager 1470g Scanner',
  'honeywell-voyager-1470g-scanner',
  'Handheld barcode scanner with USB connectivity for fast, accurate scanning.',
  'The Honeywell Voyager 1470g is a versatile handheld area-imaging scanner built for demanding retail and warehouse environments.',
  149.99,
  40,
  '/hardware/honeywell-voyager1470g.webp',
  '["/hardware/honeywell-voyager1470g.webp","/landing/warehouse-worker.jpg","/landing/forklift-operations.jpg","/landing/warehouse-racks.jpg"]'::jsonb,
  2
),
(
  'Star Micronics TSP143III Printer',
  'star-micronics-tsp143iii-printer',
  'Receipt printer with Auto-Cutter and USB interface for professional printing.',
  'The Star Micronics TSP143III is a best-in-class thermal receipt printer trusted by restaurants, retail stores, and delivery hubs worldwide.',
  249.99,
  30,
  '/landing/pos-planning.jpg',
  '["/landing/pos-planning.jpg","/landing/analytics-laptop.jpg","/landing/mobile-credibility.jpg"]'::jsonb,
  3
),
(
  'Epson TM-T88VII Thermal Printer',
  'epson-tm-t88vii-thermal-printer',
  'Industry-standard high-speed receipt printer built for reliability.',
  'The Epson TM-T88VII is the industry benchmark for thermal receipt printing, offering exceptional speed, durability, and compatibility.',
  349.99,
  20,
  '/landing/analytics-laptop.jpg',
  '["/landing/analytics-laptop.jpg","/landing/pos-planning.jpg","/landing/financial-graphs.jpg"]'::jsonb,
  4
),
(
  'Socket Mobile DuraScan Scanner',
  'socket-mobile-durascan-scanner',
  'Wireless Bluetooth barcode scanner with excellent battery life.',
  'The Socket Mobile DuraScan is a rugged, wireless Bluetooth barcode scanner designed for mobile workers in the field.',
  199.99,
  35,
  '/landing/warehouse-team.jpg',
  '["/landing/warehouse-team.jpg","/landing/warehouse-racks.jpg","/landing/mobile-credibility.jpg"]'::jsonb,
  5
)
ON CONFLICT (slug) DO NOTHING;
