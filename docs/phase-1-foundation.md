# Fase 1 — Fundação: Login + WebSocket + Chat Texto Puro

## Objetivo

Estabelecer a base da aplicação: servidor com autenticação, WebSocket para comunicação em tempo real, e frontend com tela de login e chat básico em texto puro (sem criptografia ainda).

---

## Escopo

### Servidor

1. **Servidor HTTP + WebSocket na mesma porta (3001)**
   - Express servindo rotas REST.
   - `ws` library fazendo upgrade no mesmo `http.Server`.
   - CORS habilitado para `http://localhost:5173`.

2. **Registro e login com JWT**
   - `POST /api/auth/register` — recebe `{ username, password }`, valida username único, hash da senha com bcrypt, retorna `{ token, user }`.
   - `POST /api/auth/login` — recebe `{ username, password }`, verifica credenciais, retorna `{ token, user }`.
   - JWT payload: `{ sub: userId, username }`, expiração 24h.
   - JWT secret via variável de ambiente `JWT_SECRET` com fallback `"dev-secret"`.

3. **Middleware de autenticação**
   - Extrai token do header `Authorization: Bearer <token>`.
   - Verifica e decodifica JWT.
   - Injeta `req.user` com `{ id, username }`.
   - Retorna 401 se inválido.

4. **Listagem de usuários**
   - `GET /api/users` — retorna todos os usuários registrados (id, username).
   - Requer autenticação.

5. **WebSocket autenticado**
   - Cliente conecta em `ws://localhost:3001?token=<jwt>`.
   - Servidor valida token no handshake (antes de aceitar a conexão).
   - Conexões rejeitadas com código 4001 se token inválido.
   - Mantém `Map<userId, WebSocket>` para roteamento.

6. **Chat texto puro via WebSocket**
   - Cliente envia: `{ type: "message", to: "<userId>", text: "<plaintext>" }`.
   - Servidor adiciona `from` (extraído do socket autenticado) e `timestamp`.
   - Se destinatário online, encaminha a mensagem.
   - Se offline, retorna erro `{ type: "error", message: "User offline" }`.
   - Sem armazenamento em fila nesta fase.

7. **Tipos TypeScript**
   - `User`, `JwtPayload`, `WsMessage`, `WsError` nos módulos relevantes.

### Cliente

1. **Configuração do Vite + React + TypeScript**
   - `vite.config.ts` com proxy para `/api` → `http://localhost:3001`.
   - Alias `@/` → `src/`.
   - Estilos: CSS Modules ou styled-components (escolha do implementador).

2. **Módulo de API HTTP**
   - `client/src/api/http.ts`:
     - `apiClient` — wrapper de `fetch` que:
       - Adiciona `Authorization: Bearer <token>` se token existe.
       - Adiciona `Content-Type: application/json`.
       - Faz parse automático de JSON.
       - Lança erro em respostas não-ok.
     - Funções exportadas: `register(username, password)`, `login(username, password)`, `fetchUsers()`.

3. **Módulo de WebSocket**
   - `client/src/api/socket.ts`:
     - Singleton `socketService`.
     - `connect(token)` — conecta com token como query param.
     - `disconnect()` — fecha conexão.
     - `send(data)` — envia JSON.
     - `onMessage(callback)` — registra listener.
     - `onOpen(callback)`, `onClose(callback)` — eventos.
     - Callbacks tipados com as interfaces de mensagem.

4. **Hook de autenticação**
   - `client/src/hooks/useAuth.ts`:
     - `AuthProvider` — contexto React.
     - Armazena token no `localStorage`.
     - `login(username, password)` — chama API, salva token, conecta WebSocket.
     - `register(username, password)` — chama API, salva token, conecta WebSocket.
     - `logout()` — limpa token, desconecta WebSocket.
     - `isAuthenticated` — booleano derivado.
     - `currentUser` — `{ id, username } | null`.

5. **Hook de chat**
   - `client/src/hooks/useChat.ts`:
     - `ChatProvider` — contexto React.
     - Mantém estado de `messages: Message[]` (texto puro).
     - Mantém `users: User[]` (carregados do servidor).
     - `activeChatUserId: string | null`.
     - `sendMessage(text)` — envia via WebSocket.
     - `selectUser(userId)` — muda conversa ativa.
     - Escuta mensagens recebidas do WebSocket e adiciona ao state.

6. **Componentes React (mínimo viável, sem estilo elaborado)**
   - `App.tsx` — roteamento simples (sem react-router, estado local):
     - Se não autenticado → `<AuthPage />`.
     - Se autenticado → `<ChatPage />`.
   - `AuthPage.tsx` — alterna entre login e registro.
     - `LoginForm.tsx` — username + password + submit.
     - `RegisterForm.tsx` — username + password + confirm password + submit.
   - `ChatPage.tsx` — layout de duas colunas:
     - Esquerda: `<Sidebar />` com `<UserList />`.
     - Direita: `<ChatWindow />` se conversa ativa, senão mensagem "Selecione um contato".
   - `Sidebar.tsx` — container com header "Usuários".
   - `UserList.tsx` — lista de usuários (exceto o usuário logado).
     - Cada item: username + indicador online/offline (opcional nesta fase).
   - `ChatWindow.tsx` — header com nome do contato + lista de mensagens + input.
   - `ChatHeader.tsx` — nome do usuário selecionado.
   - `MessageList.tsx` — scroll para mensagens, auto-scroll para baixo ao receber.
   - `MessageBubble.tsx` — balão de mensagem (direita = enviada, esquerda = recebida).
   - `MessageInput.tsx` — input text + botão enviar (Enter envia).

7. **Tipos no cliente**
   - `client/src/types/index.ts`:
     - `User`, `Message`, `AuthResponse`, `WsMessage`, `WsError`.

---

## Estrutura de Arquivos Esperada ao Final da Fase

```
/
├── package.json              # Root workspace: { "workspaces": ["client", "server"] }
├── tsconfig.base.json        # Base TS config
│
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Cria http.Server, anexa Express + WS
│       ├── auth/
│       │   ├── auth.router.ts      # POST /register, POST /login
│       │   └── auth.service.ts     # Lógica: bcrypt hash, JWT sign/verify
│       ├── users/
│       │   ├── users.router.ts     # GET /api/users
│       │   └── users.store.ts      # Map<userId, User>
│       ├── ws/
│       │   ├── ws.server.ts        # Inicializa WebSocketServer
│       │   ├── ws.auth.ts          # Valida token no handshake
│       │   └── ws.handlers.ts      # Processa mensagens recebidas
│       ├── middleware/
│       │   └── auth.middleware.ts  # Middleware JWT para Express
│       └── types/
│           └── index.ts            # Interfaces: User, JwtPayload, WsMessage
│
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.css
│       ├── api/
│       │   ├── http.ts
│       │   └── socket.ts
│       ├── hooks/
│       │   ├── useAuth.tsx
│       │   └── useChat.tsx
│       ├── components/
│       │   ├── AuthPage.tsx
│       │   ├── LoginForm.tsx
│       │   ├── RegisterForm.tsx
│       │   ├── ChatPage.tsx
│       │   ├── Sidebar.tsx
│       │   ├── UserList.tsx
│       │   ├── ChatWindow.tsx
│       │   ├── ChatHeader.tsx
│       │   ├── MessageList.tsx
│       │   ├── MessageBubble.tsx
│       │   └── MessageInput.tsx
│       └── types/
│           └── index.ts
```

---

## Dependências

### Server (`server/package.json`)

```json
{
  "name": "server",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "ws": "^8.18.0",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "cors": "^2.8.5",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/ws": "^8.5.12",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/bcrypt": "^5.0.2",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

### Client (`client/package.json`)

```json
{
  "name": "client",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.6.0",
    "vite": "^5.4.0"
  }
}
```

---

## Configuração do Vite

```typescript
// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
```

**Nota:** O proxy do Vite para WebSocket pode ser problemático. Alternativa: o socket.ts conecta diretamente em `ws://localhost:3001` (sem proxy).

---

## Tipos Detalhados

### Server `types/index.ts`

```typescript
export interface User {
  id: string;
  username: string;
  passwordHash: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
}

export interface AuthenticatedRequest extends Express.Request {
  user?: JwtPayload;
}

export interface WsAuthRequest {
  token: string;
}

export interface WsMessage {
  type: 'message';
  to: string;
  text: string;
}

export interface WsOutgoingMessage {
  type: 'message';
  from: string;
  text: string;
  timestamp: number;
}

export interface WsError {
  type: 'error';
  message: string;
}
```

### Client `types/index.ts`

```typescript
export interface User {
  id: string;
  username: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  direction: 'sent' | 'received';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WsIncomingMessage {
  type: 'message';
  from: string;
  text: string;
  timestamp: number;
}

export interface WsOutgoingMessage {
  type: 'message';
  to: string;
  text: string;
}

export interface WsError {
  type: 'error';
  message: string;
}
```

---

## Lógica do Servidor (detalhamento)

### `server/src/index.ts`

```
1. Importa express, http, cors, ws.
2. Cria Express app.
3. Aplica cors({ origin: 'http://localhost:5173', credentials: true }).
4. Aplica express.json().
5. Monta rotas: /api/auth (authRouter), /api/users (usersRouter).
6. Cria http.Server a partir do app.
7. Inicializa WebSocketServer no http.Server.
8. Listen na porta 3001.
```

### `server/src/ws/ws.server.ts`

```
1. Exporta função initWebSocket(httpServer).
2. Cria new WebSocketServer({ server: httpServer }).
3. No evento 'connection':
   a. Extrai token da URL (new URL(req.url, 'http://localhost').searchParams.get('token')).
   b. Valida token (ws.auth.ts → verifyToken).
   c. Se inválido: ws.close(4001, 'Unauthorized').
   d. Se válido: registra ws no Map<userId, WebSocket>.
   e. Registra handlers: ws.on('message', ...).
   f. No ws.on('close'): remove do Map.
```

### `server/src/ws/ws.handlers.ts`

```
handleMessage(ws, data, userId, connections):
  1. Parse JSON.
  2. Se type === 'message':
     a. Busca ws do destinatário em connections.get(data.to).
     b. Se encontrado: envia { type: 'message', from: userId, text: data.text, timestamp: Date.now() }.
     c. Se não encontrado: envia { type: 'error', message: 'User offline' } para o remetente.
```

---

## Lógica do Cliente (detalhamento)

### `client/src/api/http.ts`

```typescript
const BASE_URL = '/api';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }

  return res.json();
}

export const register = (username: string, password: string) =>
  request<AuthResponse>('POST', '/auth/register', { username, password });

export const login = (username: string, password: string) =>
  request<AuthResponse>('POST', '/auth/login', { username, password });

export const fetchUsers = () =>
  request<{ users: User[] }>('GET', '/users');
```

### `client/src/api/socket.ts`

```typescript
type MessageHandler = (msg: WsIncomingMessage | WsError) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();

  connect(token: string) {
    this.ws = new WebSocket(`ws://localhost:3001?token=${token}`);
    this.ws.onopen = () => { /* log */ };
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageHandlers.forEach(h => h(data));
    };
    this.ws.onclose = () => { /* log */ };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  send(data: WsOutgoingMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }
}

export const socketService = new SocketService();
```

### `client/src/hooks/useAuth.tsx`

```typescript
// AuthProvider encapsula:
// - state: { token, user }
// - login(username, password): chama http.login, salva token, seta user, conecta socket
// - register(username, password): chama http.register, salva token, seta user, conecta socket
// - logout(): limpa token, user, desconecta socket
// - Ao montar: verifica se token existe no localStorage e é válido (pode tentar fetchUsers como ping)
```

### `client/src/hooks/useChat.tsx`

```typescript
// ChatProvider encapsula:
// - state: { messages: Message[], users: User[], activeUserId: string | null }
// - selectUser(userId): seta activeUserId
// - sendMessage(text): chama socket.send({ type: 'message', to: activeUserId, text }), adiciona à lista local
// - Escuta socket.onMessage: ao receber mensagem de outro usuário, adiciona à lista
// - Carrega users ao montar (fetchUsers)
```

---

## Critérios de Aceitação

1. **Registro:** Novo usuário consegue se registrar e recebe um JWT válido.
2. **Login:** Usuário registrado consegue fazer login e recebe JWT.
3. **WebSocket:** Após login, WebSocket conecta automaticamente e permanece aberto.
4. **Lista de usuários:** Usuário logado vê lista de outros usuários registrados.
5. **Chat texto puro:** Duas abas de navegador (usuários diferentes) conseguem trocar mensagens de texto em tempo real.
6. **Usuário offline:** Se destinatário não está conectado, remetente recebe mensagem de erro "User offline".
7. **Logout:** Ao fazer logout, WebSocket desconecta e token é removido.
8. **Persistência de sessão:** Ao recarregar a página, se token ainda é válido, usuário permanece autenticado.

---

## Teste Manual da Fase 1

```bash
# Terminal 1: Iniciar servidor
npm run dev:server

# Terminal 2: Iniciar cliente
npm run dev:client

# Abrir navegador 1 em http://localhost:5173
# Registrar "alice" / "senha123"
# Abrir navegador 2 em http://localhost:5173 (anônimo ou outro perfil)
# Registrar "bob" / "senha456"
# No navegador da Alice: clicar em "bob" na lista
# Digitar "Olá Bob" e enviar
# No navegador do Bob: ver mensagem "Olá Bob" aparecer
# Bob responde "Oi Alice"
# Alice vê a resposta
```

---

## O que NÃO faz parte desta fase

- Criptografia (qualquer tipo)
- Chaves ECDH
- Sessões criptográficas
- Armazenamento de mensagens offline
- Reconexão automática
- Indicador de digitação
- Estilização sofisticada (CSS básico funcional é suficiente)
- Testes automatizados
