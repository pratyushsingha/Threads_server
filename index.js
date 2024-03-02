import dotenv from "dotenv";
import connectDB from "./src/db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server is running at port: ${PORT}`);
    });
  } catch (error) {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  }
};

connectDB()
  .then(() => {
    startServer();
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
    process.exit(1);  
  });
