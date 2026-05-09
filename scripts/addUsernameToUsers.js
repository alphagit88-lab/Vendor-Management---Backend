const pool = require('../config/database');

const addUsernameToUsers = async () => {
  try {
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'username'
    `;
    const checkResult = await pool.query(checkQuery);

    if (checkResult.rows.length === 0) {
      console.log('Adding "username" column to "users" table...');
      await pool.query('ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE');
      console.log('"username" column added successfully.');
    } else {
      console.log('"username" column already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error adding "username" column:', err);
    process.exit(1);
  }
};

addUsernameToUsers();
