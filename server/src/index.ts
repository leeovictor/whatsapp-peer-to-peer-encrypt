import express from 'express';
import cors from 'cors';
import http from 'http';
import { authRouter } from './auth/auth.router';
import { usersRouter } from './users/users.router';
import { keysRouter } from './keys/keys.router';
import { initWebSocketServer } from './ws/ws.server';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api', keysRouter);

const httpServer = http.createServer(app);
initWebSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
