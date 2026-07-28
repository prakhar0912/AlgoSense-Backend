
import dotenv from 'dotenv';
import fs from 'fs'
import https from 'https'
import path from 'path'
import { fileURLToPath } from 'url';

// Recreate __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
// const APP_DIR = process.env.NODE_ENV === 'production' ? 'dist' : 'src'
// import { api } from '../dist/index.js'
// // const { api } = require(`../${APP_DIR}`)
// const port = 3000

// api.listen(port, () => console.log(`API is listening on port ${port}`))

async function loadModuleAtRuntime(moduleName) {
  // 1. Define your runtime variable path
  const modulePath = `../${moduleName}/index.js`;
  // console.log(modulePath)
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
  };
  const port = 3000

  try {
    // 2. Pass the variable into the dynamic import()
    const { api } = await import(modulePath);
    // 3. Access exports from the resolved module
    https.createServer(sslOptions, api).listen(port, () => {
      console.log(`Server running securely at https://localhost:${port}`);
    });
    // api.listen(port, () => console.log(`API is listening on port ${port}`))
  } catch (error) {
    console.error("Failed to load module dynamically:", error);
  }
}

const APP_DIR = process.env.NODE_ENV === 'production' ? 'dist' : 'src'
loadModuleAtRuntime('dist');
