import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { authRouter } from './auth/auth.router';
import { usersRouter } from './users/users.router';
import { keysRouter } from './keys/keys.router';
import { messagesRouter } from './messages/messages.router';
import { initWebSocketServer } from './ws/ws.server';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api', keysRouter);
app.use('/api/messages', messagesRouter);

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

const httpServer = http.createServer(app);
initWebSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});
