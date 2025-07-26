require("dotenv").config();

module.exports = {
  apps: [
    {
      name: "xtwit-backend",
      script: "./index.js", 
      watch: false,
      env: {
        PORT: process.env.PORT,
        MONGODB_URI: process.env.MONGODB_URI,
        CORS_ORIGIN: process.env.CORS_ORIGIN,

        ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
        ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,
        REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
        REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,

        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

        PUSHER_APP_ID: process.env.PUSHER_APP_ID,
        PUSHER_KEY: process.env.PUSHER_KEY,
        PUSHER_SECRET: process.env.PUSHER_SECRET,
        PUSHER_CLUSTER: process.env.PUSHER_CLUSTER,

        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_SIGNIN_CALLBACK_URL: process.env.GOOGLE_SIGNIN_CALLBACK_URL,
        FRONTEND_URL:process.env.FRONTEND_URL,
        SESSION_SECRET: process.env.SESSION_SECRET,
      },
    },
  ],
};


