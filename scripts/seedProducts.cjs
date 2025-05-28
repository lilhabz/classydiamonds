// 📄 scripts/seedProducts.cjs – JS wrapper to seed static jewelry items with env setup and TS support 🛠️

const path = require("path");
// Load environment variables from .env.local
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

// Register ts-node to transpile TS seed script at runtime
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    module: "CommonJS",
    moduleResolution: "node",
  },
});

// Execute the TypeScript seed script
require(path.resolve(__dirname, "./seedProducts.ts"));
