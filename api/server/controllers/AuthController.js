const cookies = require('cookie');
const jwt = require('jsonwebtoken');
const openIdClient = require('openid-client');
const { isEnabled } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const {
  requestPasswordReset,
  setOpenIDAuthTokens,
  resetPassword,
  setAuthTokens,
  registerUser,
} = require('~/server/services/AuthService');
const { findUser, getUserById, deleteAllUserSessions, findSession } = require('~/models');
const { getOpenIdConfig } = require('~/strategies');

const registrationController = async (req, res) => {
  try {
    const response = await registerUser(req.body);
    const { status, message } = response;
    res.status(status).send({ message });
  } catch (err) {
    logger.error('[registrationController]', err);
    return res.status(500).json({ message: err.message });
  }
};

const resetPasswordRequestController = async (req, res) => {
  try {
    const resetService = await requestPasswordReset(req);
    if (resetService instanceof Error) {
      return res.status(400).json(resetService);
    } else {
      return res.status(200).json(resetService);
    }
  } catch (e) {
    logger.error('[resetPasswordRequestController]', e);
    return res.status(400).json({ message: e.message });
  }
};

const resetPasswordController = async (req, res) => {
  try {
    const resetPasswordService = await resetPassword(
      req.body.userId,
      req.body.token,
      req.body.password,
    );
    if (resetPasswordService instanceof Error) {
      return res.status(400).json(resetPasswordService);
    } else {
      await deleteAllUserSessions({ userId: req.body.userId });
      return res.status(200).json(resetPasswordService);
    }
  } catch (e) {
    logger.error('[resetPasswordController]', e);
    return res.status(400).json({ message: e.message });
  }
};

const refreshController = async (req, res) => {
  const refreshToken = req.headers.cookie ? cookies.parse(req.headers.cookie).chatRefreshToken : null;
  if (!refreshToken) {
    return res.status(200).send('Refresh token not provided');
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.CHAT_UI_JWT_REFRESH_SECRET);
    console.log('AuthController: Refresh token payload', payload);
    const user = await getUserById(payload.id, '-password -__v -totpSecret');
    if (!user) {
      console.log('AuthController: User not found by ID');
      return res.status(200).send({ message: 'User not found' });
    }

    const userId = payload.id;

    if (process.env.NODE_ENV === 'CI') {
      const token = await setAuthTokens(userId, res);
      return res.status(200).send({ token, user });
    }

    if (payload.exp < Date.now() / 1000) {
      console.log('AuthController: Refresh token expired');
      res.status(200).send({ message: 'Refresh token expired' });
    } else {
      const token = await setAuthTokens(userId, res);
      res.status(200).send({ token, user });
    }
  } catch (err) {
    console.log('AuthController: Invalid refresh token');
    return res.status(200).send({ message: 'Invalid refresh token' });
  }
};

module.exports = {
  refreshController,
  registrationController,
  resetPasswordController,
  resetPasswordRequestController,
};
