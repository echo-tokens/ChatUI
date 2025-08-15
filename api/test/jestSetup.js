// See .env.test.example for an example of the '.env.test' file.
require('dotenv').config({ path: './test/.env.test' });

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/dummy-uri';
process.env.BAN_VIOLATIONS = 'true';
process.env.BAN_DURATION = '7200000';
process.env.BAN_INTERVAL = '20';
process.env.CI = 'true';
process.env.CHAT_UI_JWT_SECRET = 'test';
process.env.CHAT_UI_JWT_REFRESH_SECRET = 'test';
process.env.CREDS_KEY = 'test';
process.env.CREDS_IV = 'test';
