const pool = require('../config/database');

class Inventory {
  /**
   * Returns overall inventory status by merging warehouse and salespeople quantities.
   */
  static async findAll(customerId = null, adminId = null) {
    const query = `
      SELECT 
        i.id,
        i.description_name as item_name,
        i.item_number,
        i.price as default_price,
        COALESCE(cip_cust.price, cip_group.price, i.price) as price,
        CASE WHEN cip_cust.price IS NOT NULL OR cip_group.price IS NOT NULL THEN true ELSE false END as is_custom_price,
        c.name as category_name,
        COALESCE(inv.quantity, 0) as warehouse_quantity,
        (SELECT COALESCE(SUM(si.quantity), 0) FROM salesperson_inventory si JOIN users u ON si.user_id = u.id WHERE si.item_id = i.id AND ($2::integer IS NULL OR u.admin_id = $2::integer)) as salesperson_quantity,
        (COALESCE(inv.quantity, 0) + (SELECT COALESCE(SUM(si.quantity), 0) FROM salesperson_inventory si JOIN users u ON si.user_id = u.id WHERE si.item_id = i.id AND ($2::integer IS NULL OR u.admin_id = $2::integer))) as total_quantity,
        COALESCE(inv.reorder_level, 10) as reorder_level,
        COALESCE((
          SELECT json_agg(json_build_object(
            'user_id', si.user_id,
            'user_name', u.name,
            'location', u.inventory_location,
            'quantity', si.quantity
          ))
          FROM salesperson_inventory si
          JOIN users u ON si.user_id = u.id
          WHERE si.item_id = i.id AND ($2::integer IS NULL OR u.admin_id = $2::integer)
        ), '[]'::json) as sub_inventories
      FROM items i
      LEFT JOIN inventory inv ON i.id = inv.item_id
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN customers cust ON cust.id = $1
      LEFT JOIN customer_item_prices cip_cust ON i.id = cip_cust.item_id AND cip_cust.customer_id = $1
      LEFT JOIN customer_item_prices cip_group ON i.id = cip_group.item_id AND cip_group.group_id = cust.group_id
      WHERE ($2::integer IS NULL OR i.admin_id = $2::integer)
      ORDER BY i.description_name ASC
    `;
    const result = await pool.query(query, [customerId, adminId]);
    return result.rows;
  }

  /**
   * Core logic for moving stock:
   * - RESTOCK: Standard addition to warehouse.
   * - ADJUSTMENT: Manual warehouse inventory correction (can be negative).
   * - ASSIGNMENT: Move from warehouse to salesperson.
   * - SALE: Sale by salesperson (decrements salesperson stock).
   */
  static async updateStock({ item_id, quantity, type, notes, user_actor_id, unit_cost, salesperson_id, source_salesperson_id }, client = null) {
    const isSharedClient = !!client;
    if (!client) client = await pool.connect();
    
    try {
      if (!isSharedClient) await client.query('BEGIN');

      // 1. Transactional Update
      if (type === 'RESTOCK' || type === 'ADJUSTMENT') {
        // Warehouse change
        await client.query(`
          INSERT INTO inventory (item_id, quantity, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT ON CONSTRAINT inventory_item_id_unique 
          DO UPDATE SET 
            quantity = inventory.quantity + EXCLUDED.quantity,
            updated_at = NOW()
        `, [item_id, quantity]);
      } 
      else if (type === 'ASSIGNMENT') {
        if (!salesperson_id) throw new Error('Salesperson ID required for assignment');
        
        // Deduction from Warehouse
        const res = await client.query(`
            UPDATE inventory 
            SET quantity = quantity - $1 
            WHERE item_id = $2 
            RETURNING quantity
        `, [Math.abs(quantity), item_id]);
        
        if (res.rowCount === 0 || res.rows[0].quantity < 0) {
            throw new Error('Insufficient stock in warehouse for assignment');
        }

        // Addition to Salesperson Inventory
        await client.query(`
            INSERT INTO salesperson_inventory (item_id, user_id, quantity, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT ON CONSTRAINT salesperson_item_user_unique
            DO UPDATE SET 
                quantity = salesperson_inventory.quantity + EXCLUDED.quantity,
                updated_at = NOW()
        `, [item_id, salesperson_id, Math.abs(quantity)]);
      }
      else if (type === 'SALE') {
          if (!salesperson_id) throw new Error('Salesperson ID required for sales tracking');
          
          // Deduction from Salesperson Stock
          const res = await client.query(`
              UPDATE salesperson_inventory 
              SET quantity = quantity - $1 
              WHERE item_id = $2 AND user_id = $3
              RETURNING quantity
          `, [Math.abs(quantity), item_id, salesperson_id]);

          if (res.rowCount === 0 || res.rows[0].quantity < 0) {
              throw new Error('Insufficient stock with salesperson for this sale');
          }
      }
      else if (type === 'TRANSFER') {
        if (!salesperson_id || !source_salesperson_id) {
          throw new Error('Both source and recipient staff IDs required for transfer');
        }
        
        // Deduction from Source Salesperson Stock
        const res = await client.query(`
            UPDATE salesperson_inventory 
            SET quantity = quantity - $1 
            WHERE item_id = $2 AND user_id = $3
            RETURNING quantity
        `, [Math.abs(quantity), item_id, source_salesperson_id]);

        if (res.rowCount === 0 || res.rows[0].quantity < 0) {
            throw new Error('Insufficient stock with source staff for this transfer');
        }

        // Addition to Target Salesperson Inventory
        await client.query(`
            INSERT INTO salesperson_inventory (item_id, user_id, quantity, updated_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT ON CONSTRAINT salesperson_item_user_unique
            DO UPDATE SET 
                quantity = salesperson_inventory.quantity + EXCLUDED.quantity,
                updated_at = NOW()
        `, [item_id, salesperson_id, Math.abs(quantity)]);
      }
      else if (type === 'RETURN') {
          if (!salesperson_id) throw new Error('Salesperson ID required for return');
          
          // Deduction from Salesperson Stock
          const res = await client.query(`
              UPDATE salesperson_inventory 
              SET quantity = quantity - $1 
              WHERE item_id = $2 AND user_id = $3
              RETURNING quantity
          `, [Math.abs(quantity), item_id, salesperson_id]);

          if (res.rowCount === 0 || res.rows[0].quantity < 0) {
              throw new Error('Insufficient stock with salesperson for this return');
          }

          // Addition back to Warehouse
          await client.query(`
            INSERT INTO inventory (item_id, quantity, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT ON CONSTRAINT inventory_item_id_unique 
            DO UPDATE SET 
              quantity = inventory.quantity + EXCLUDED.quantity,
              updated_at = NOW()
          `, [item_id, Math.abs(quantity)]);
      }

      // 2. Log Entry - CRITICAL: FIXED to include actor and staff IDs
      await client.query(`
        INSERT INTO inventory_logs (item_id, user_id, salesperson_id, quantity_changed, type, notes, unit_cost, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [item_id, user_actor_id || null, salesperson_id || null, quantity, type, notes, unit_cost]);

      if (!isSharedClient) await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      if (!isSharedClient) await client.query('ROLLBACK');
      console.error('Inventory Update Error:', error.message);
      throw error;
    } finally {
      if (!isSharedClient) client.release();
    }
  }

  static async getLogs(item_id = null, salesperson_id = null, adminId = null) {
    let query = `
      SELECT 
        l.*, 
        i.description_name as item_name,
        i.item_number
      FROM inventory_logs l
      LEFT JOIN items i ON l.item_id = i.id
    `;
    const params = [];
    const conditions = [];

    if (item_id) {
      params.push(item_id);
      conditions.push(`l.item_id = $${params.length}`);
    }

    if (salesperson_id) {
      params.push(salesperson_id);
      conditions.push(`(l.salesperson_id = $${params.length} OR l.user_id = $${params.length})`);
    }

    if (adminId) {
      params.push(adminId);
      conditions.push(`(i.admin_id = $${params.length} OR l.salesperson_id IN (SELECT id FROM users WHERE admin_id = $${params.length}) OR l.user_id IN (SELECT id FROM users WHERE admin_id = $${params.length}))`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY l.created_at DESC LIMIT 100`;
    const result = await pool.query(query, params);
    return result.rows;
  }
}

module.exports = Inventory;
