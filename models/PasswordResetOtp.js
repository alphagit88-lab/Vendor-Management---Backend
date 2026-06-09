const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);
const MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

class PasswordResetOtp {
  static get expiryMinutes() {
    return OTP_EXPIRY_MINUTES;
  }

  static get resendCooldownSeconds() {
    return RESEND_COOLDOWN_SECONDS;
  }

  static get maxAttempts() {
    return MAX_ATTEMPTS;
  }

  static async invalidateForUser(userId) {
    await pool.query(
      `UPDATE password_reset_otps
       SET verified_at = COALESCE(verified_at, NOW())
       WHERE user_id = $1 AND verified_at IS NULL`,
      [userId]
    );
  }

  static async create(userId, phone, otp) {
    await this.invalidateForUser(userId);

    const otpHash = await bcrypt.hash(String(otp), 10);
    const query = `
      INSERT INTO password_reset_otps (user_id, phone, otp_hash, expires_at)
      VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)
      RETURNING id, user_id, phone, expires_at, attempts, created_at
    `;
    const result = await pool.query(query, [userId, phone, otpHash, OTP_EXPIRY_MINUTES]);
    return result.rows[0];
  }

  static async findLatestActive(phone) {
    const query = `
      SELECT *
      FROM password_reset_otps
      WHERE phone = $1
        AND verified_at IS NULL
        AND expires_at > NOW()
        AND attempts < $2
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [phone, MAX_ATTEMPTS]);
    return result.rows[0];
  }

  static async findLatestForPhone(phone) {
    const query = `
      SELECT *
      FROM password_reset_otps
      WHERE phone = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [phone]);
    return result.rows[0];
  }

  static async incrementAttempts(id) {
    await pool.query(
      'UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1',
      [id]
    );
  }

  static async markVerified(id) {
    const result = await pool.query(
      `UPDATE password_reset_otps
       SET verified_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }

  static async verifyOtp(record, otp) {
    return bcrypt.compare(String(otp), record.otp_hash);
  }

  static getResendWaitSeconds(latestRecord) {
    if (!latestRecord) return 0;
    const elapsed = Math.floor((Date.now() - new Date(latestRecord.created_at).getTime()) / 1000);
    return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);
  }
}

module.exports = PasswordResetOtp;
