const pool = require('../config/database');

function mapProduct(row) {
  if (!row) return null;
  const images = Array.isArray(row.images) ? row.images : JSON.parse(row.images || '[]');
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    longDescription: row.long_description,
    price: parseFloat(row.price),
    stock: row.stock,
    image: row.image || images[0] || null,
    images,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

class HardwareProduct {
  static async findAllPublic() {
    const result = await pool.query(`
      SELECT * FROM hardware_products
      WHERE is_active = true
      ORDER BY sort_order ASC, created_at DESC
    `);
    return result.rows.map(mapProduct);
  }

  static async findAllAdmin() {
    const result = await pool.query(`
      SELECT * FROM hardware_products
      ORDER BY sort_order ASC, created_at DESC
    `);
    return result.rows.map(mapProduct);
  }

  static async findById(id, { activeOnly = false } = {}) {
    const query = activeOnly
      ? 'SELECT * FROM hardware_products WHERE id = $1 AND is_active = true'
      : 'SELECT * FROM hardware_products WHERE id = $1';
    const result = await pool.query(query, [id]);
    return mapProduct(result.rows[0]);
  }

  static async findBySlug(slug) {
    const result = await pool.query(
      'SELECT * FROM hardware_products WHERE slug = $1 AND is_active = true',
      [slug]
    );
    return mapProduct(result.rows[0]);
  }

  static async findByIdsForCheckout(ids, client = pool) {
    const result = await client.query(
      `SELECT * FROM hardware_products
       WHERE id = ANY($1::int[]) AND is_active = true
       FOR UPDATE`,
      [ids]
    );
    return result.rows.map((row) => mapProduct(row));
  }

  static async create(data) {
    const images = data.images?.length ? data.images : (data.image ? [data.image] : []);
    const slug = data.slug || slugify(data.name);
    const result = await pool.query(
      `INSERT INTO hardware_products
        (name, slug, description, long_description, price, stock, image, images, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        data.name,
        slug,
        data.description || null,
        data.longDescription || null,
        data.price ?? 0,
        data.stock ?? 0,
        data.image || images[0] || null,
        JSON.stringify(images),
        data.isActive !== false,
        data.sortOrder ?? 0,
      ]
    );
    return mapProduct(result.rows[0]);
  }

  static async update(id, data) {
    const existing = await pool.query('SELECT * FROM hardware_products WHERE id = $1', [id]);
    if (!existing.rows[0]) return null;

    const current = existing.rows[0];
    const images = data.images !== undefined
      ? data.images
      : (Array.isArray(current.images) ? current.images : JSON.parse(current.images || '[]'));

    const result = await pool.query(
      `UPDATE hardware_products SET
        name = COALESCE($2, name),
        slug = COALESCE($3, slug),
        description = COALESCE($4, description),
        long_description = COALESCE($5, long_description),
        price = COALESCE($6, price),
        stock = COALESCE($7, stock),
        image = COALESCE($8, image),
        images = COALESCE($9::jsonb, images),
        is_active = COALESCE($10, is_active),
        sort_order = COALESCE($11, sort_order),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.name ?? null,
        data.slug ?? null,
        data.description ?? null,
        data.longDescription ?? null,
        data.price ?? null,
        data.stock ?? null,
        data.image ?? (images[0] || null),
        data.images !== undefined ? JSON.stringify(images) : null,
        data.isActive ?? null,
        data.sortOrder ?? null,
      ]
    );
    return mapProduct(result.rows[0]);
  }

  static async delete(id) {
    const result = await pool.query(
      'DELETE FROM hardware_products WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }

  static async decrementStock(client, productId, quantity) {
    const result = await client.query(
      `UPDATE hardware_products
       SET stock = stock - $2, updated_at = NOW()
       WHERE id = $1 AND stock >= $2
       RETURNING id, stock`,
      [productId, quantity]
    );
    return result.rows[0];
  }
}

module.exports = HardwareProduct;
