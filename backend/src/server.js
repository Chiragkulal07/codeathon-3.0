import 'dotenv/config'; // keep this first so env vars load before anything else
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initSockets } from './sockets/index.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSockets(server);

connectDB()
  .then(() =>
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  )
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });