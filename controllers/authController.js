const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const { sendPasswordResetOtp } = require('../utils/smsService');
const { maskPhone } = require('../utils/phoneUtils');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const crypto = require('crypto');

const ALLOWED_RESET_ROLES = ['admin', 'staff', 'super_admin'];
const RESET_TOKEN_EXPIRES_IN = process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '15m';

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function resolveUserForPasswordReset({ phone, email, username }) {
  if (phone) return User.findByPhoneDigits(phone);
  if (email) return User.findByEmail(email);
  if (username) return User.findByUsername(username);
  return null;
}

function isEligibleForReset(user) {
  return user && ALLOWED_RESET_ROLES.includes(user.role);
}

exports.login = async (req, res) => {
  try {
    const { email, username, phone, password } = req.body;
    const identifier = email || username || phone;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide credentials' });
    }

    let user;
    if (email) user = await User.findByEmail(email);
    if (!user && username) user = await User.findByUsername(username);
    if (!user && phone) user = await User.findByPhone(phone);
    if (!user && !email && !username && !phone) return res.status(400).json({ success: false, message: 'Missing login credentials' });

    if (!user || (user.role !== 'admin' && user.role !== 'staff' && user.role !== 'super_admin')) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.is_active === false) {
      return res.status(403).json({ success: false, message: 'Your account is not activated yet' });
    }

    const isMatch = await User.verifyPassword(user, password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name, admin_id: user.admin_id, enable_par_levels: user.enable_par_levels },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        enable_par_levels: user.enable_par_levels
      }
    });

  } catch (error) {
    console.error('🔴 LOGIN ERROR:', error.message, error.code, error.detail);
    res.status(500).json({ success: false, message: 'Server Error', detail: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, subscription_plan_id } = req.body;

    if (!name || !email || !phone || !password || !subscription_plan_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, phone, password, and subscription plan are required' 
      });
    }

    // Check if phone already exists
    const existingPhone = await User.findByPhone(phone);
    if (existingPhone) {
      return res.status(400).json({ success: false, message: 'Phone number already registered' });
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already registered' });
      }
    }

    // Check if subscription plan exists
    const plan = await SubscriptionPlan.findById(subscription_plan_id);
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Invalid subscription plan' });
    }

    // Create new admin user (inactive by default)
    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: 'admin',
      enable_par_levels: true,
      subscription_plan_id,
      is_active: false
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account will be activated soon'
    });

  } catch (error) {
    console.error('🔴 REGISTER ERROR:', error.message, error.code, error.detail);
    res.status(500).json({ success: false, message: 'Server Error', detail: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { phone, email, username } = req.body;
    const identifier = phone || email || username;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Phone, email, or username is required' });
    }

    const user = await resolveUserForPasswordReset({ phone, email, username });

    if (!user) {
      const message = phone
        ? 'No account found with this phone number.'
        : email
          ? 'No account found with this email address.'
          : 'No account found with this username.';
      return res.status(404).json({ success: false, message });
    }

    if (!isEligibleForReset(user)) {
      return res.status(403).json({
        success: false,
        message: 'This account is not eligible for password reset.',
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not activated yet. Please contact support.',
      });
    }

    const latest = await PasswordResetOtp.findLatestForPhone(user.phone);
    const waitSeconds = PasswordResetOtp.getResendWaitSeconds(latest);
    if (waitSeconds > 0) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        resendAfter: waitSeconds,
        maskedPhone: maskPhone(user.phone),
      });
    }

    const otp = generateOtp();
    await PasswordResetOtp.create(user.id, user.phone, otp);

    try {
      await sendPasswordResetOtp(user.phone, otp);
    } catch (smsError) {
      console.error('🔴 SMS ERROR:', smsError.message);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Password reset OTP for ${user.phone}`);
      } else {
        return res.status(502).json({
          success: false,
          message: 'Unable to send verification code. Please try again later.',
        });
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Password reset OTP for ${user.phone}`);
    }

    res.json({
      success: true,
      message: 'A verification code has been sent to your registered phone number.',
      maskedPhone: maskPhone(user.phone),
      resendAfter: PasswordResetOtp.resendCooldownSeconds,
      expiresInMinutes: PasswordResetOtp.expiryMinutes,
    });
  } catch (error) {
    console.error('🔴 FORGOT PASSWORD ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.verifyResetOtp = async (req, res) => {
  try {
    const { phone, email, username, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Verification code is required' });
    }

    const user = await resolveUserForPasswordReset({ phone, email, username });
    if (!isEligibleForReset(user)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    const record = await PasswordResetOtp.findLatestActive(user.phone);
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification code' });
    }

    const isValid = await PasswordResetOtp.verifyOtp(record, otp);
    if (!isValid) {
      await PasswordResetOtp.incrementAttempts(record.id);
      const remaining = PasswordResetOtp.maxAttempts - (record.attempts + 1);
      return res.status(400).json({
        success: false,
        message: remaining > 0
          ? `Invalid verification code. ${remaining} attempt(s) remaining.`
          : 'Too many failed attempts. Please request a new code.',
        attemptsRemaining: Math.max(0, remaining),
      });
    }

    await PasswordResetOtp.markVerified(record.id);

    const resetToken = jwt.sign(
      { id: user.id, phone: user.phone, purpose: 'password_reset' },
      jwtConfig.secret,
      { expiresIn: RESET_TOKEN_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Verification successful. You can now set a new password.',
      resetToken,
    });
  } catch (error) {
    console.error('🔴 VERIFY OTP ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, jwtConfig.secret);
    } catch {
      return res.status(400).json({ success: false, message: 'Reset session expired. Please start again.' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    const user = await User.findById(decoded.id);
    if (!isEligibleForReset(user) || user.phone !== decoded.phone) {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    const hashedPassword = await User.hashPassword(newPassword);
    await User.updatePassword(user.id, hashedPassword);
    await PasswordResetOtp.invalidateForUser(user.id);

    res.json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('🔴 RESET PASSWORD ERROR:', error.message);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
