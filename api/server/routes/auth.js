const express = require('express');
const {
  refreshController,
  registrationController,
  resetPasswordController,
  resetPasswordRequestController,
} = require('~/server/controllers/AuthController');
const { loginController } = require('~/server/controllers/auth/LoginController');
const { logoutController } = require('~/server/controllers/auth/LogoutController');
const { verify2FAWithTempToken } = require('~/server/controllers/auth/TwoFactorAuthController');
const {
  enable2FA,
  verify2FA,
  disable2FA,
  regenerateBackupCodes,
  confirm2FA,
} = require('~/server/controllers/TwoFactorController');
const {
  checkBan,
  logHeaders,
  loginLimiter,
  requireJwtAuth,
  checkInviteUser,
  registerLimiter,
  requireLdapAuth,
  setBalanceConfig,
  requireLocalAuth,
  resetPasswordLimiter,
  validateRegistration,
  validatePasswordReset,
} = require('~/server/middleware');
const { jwtVerify } = require('jose');

const router = express.Router();

const ldapAuth = !!process.env.LDAP_URL && !!process.env.LDAP_USER_SEARCH_BASE;

// Token validation endpoint
router.post('/validate-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token is required' 
      });
    }

    // Check if JWT secret is configured
    if (!process.env.CHAT_UI_JWT_SECRET) {
      console.error('CHAT_UI_JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        valid: false,
        error: 'JWT secret not configured'
      });
    }
    
    // Convert the secret to Uint8Array for jose
    const secret = new TextEncoder().encode(process.env.CHAT_UI_JWT_SECRET);
    
    // Verify the JWT token with signature validation
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'], // Only allow HS256 algorithm
      issuer: undefined, // No issuer validation for now
      audience: undefined, // No audience validation for now
    });
    
    // If we get here, the token is valid and signature is verified
    return res.status(200).json({
      success: true,
      valid: true,
      user: {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        account_status: payload.account_status
      }
    });
  } catch (error) {
    console.error('Token validation error:', error.message);
    
    if (error.code === 'ERR_JWT_INVALID') {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Invalid token format or signature'
      });
    } else if (error.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Token has expired'
      });
    } else if (error.code === 'ERR_JWT_ALGORITHM_MISMATCH') {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Invalid token algorithm'
      });
    } else {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Token validation failed: ' + error.message
      });
    }
  }
});

//Local
router.post('/logout', requireJwtAuth, logoutController);
router.post(
  '/login',
  logHeaders,
  loginLimiter,
  checkBan,
  ldapAuth ? requireLdapAuth : requireLocalAuth,
  setBalanceConfig,
  loginController,
);
router.post('/refresh', refreshController);
router.post(
  '/register',
  registerLimiter,
  checkBan,
  checkInviteUser,
  validateRegistration,
  registrationController,
);
router.post(
  '/requestPasswordReset',
  resetPasswordLimiter,
  checkBan,
  validatePasswordReset,
  resetPasswordRequestController,
);
router.post('/resetPassword', checkBan, validatePasswordReset, resetPasswordController);

router.get('/2fa/enable', requireJwtAuth, enable2FA);
router.post('/2fa/verify', requireJwtAuth, verify2FA);
router.post('/2fa/verify-temp', checkBan, verify2FAWithTempToken);
router.post('/2fa/confirm', requireJwtAuth, confirm2FA);
router.post('/2fa/disable', requireJwtAuth, disable2FA);
router.post('/2fa/backup/regenerate', requireJwtAuth, regenerateBackupCodes);

module.exports = router;
