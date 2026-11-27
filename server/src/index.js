import './config/loadEnv.js';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { resolveMongoUri } from './config/mongoUri.js';

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  try {
    await connectDatabase(resolveMongoUri());
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();