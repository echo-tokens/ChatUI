const { logger } = require('@librechat/data-schemas');
const { SystemRoles } = require('librechat-data-provider');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { getUserById, updateUser, findUser } = require('~/models');

// JWT strategy
const jwtLogin = () =>
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.CHAT_UI_JWT_SECRET,
    },
    async (payload, done) => {
      if (payload?.exp < (Date.now() / 1000)) {
        logger.warn('[jwtLogin] JwtStrategy => access token expired: ' + payload?.id);
        done(null, false);
        return;
      }
      try {
        // Handle both ChatUI and account auth service JWT payloads
        // Account auth service sends: { id, email, name, role, account_status }
        // ChatUI sends: { id, username, provider, email }
        
        let user;
        
        // Try to find user by ID first (works for both string and ObjectId)
        if (payload?.id) {
          user = await getUserById(payload.id, '-password -__v -totpSecret');
        }
        
        // If not found by ID, try to find by email (for account auth service tokens)
        if (!user && payload?.email) {
          user = await findUser({ email: payload.email }, '-password -__v -totpSecret');
        }
        
        if (user) {
          logger.info(`[jwtLogin] JWT payload.id: ${payload.id}, DB user._id: ${user._id}, converted user.id: ${user._id.toString()}`);
          // Use JWT payload.id to maintain consistency between frontend and backend
          // This ensures the same user ID is used in both contexts
          user.id = payload.id;
          
          // Handle role from account auth service payload
          if (payload?.role && !user.role) {
            user.role = payload.role;
            await updateUser(user.id, { role: user.role });
          } else if (!user.role) {
            user.role = SystemRoles.USER;
            await updateUser(user.id, { role: user.role });
          }
          
          // Handle name from account auth service payload
          if (payload?.name && !user.name) {
            user.name = payload.name;
            await updateUser(user.id, { name: user.name });
          }
          
          // Handle account_status from account auth service payload
          if (payload?.account_status) {
            user.account_status = payload.account_status;
            // Note: We don't update the database with account_status as it's managed by account auth service
          }
          
          done(null, user);
        } else {
          logger.warn('[jwtLogin] JwtStrategy => no user found: ' + payload?.id);
          done(null, false);
        }
      } catch (err) {
        done(err, false);
      }
    },
  );

module.exports = jwtLogin;
