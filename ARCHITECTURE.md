# ARCHITECTURE.md — Web Chat E2EE

## Visão Geral

Sistema de chat web com criptografia de ponta a ponta (E2EE) onde o servidor atua apenas como intermediário de transporte. Toda criptografia ocorre exclusivamente nos navegadores dos clientes.

```
Browser A                          Browser B
    │                                  │
    ├── Criptografia ──┐    ┌── Criptografia
    │                   │    │
    ▼                   ▼    ▼
┌─────────────────────────────────────┐
│            Servidor                 │
│     (apenas transporte/roteamento)  │
│                                     │
│  - Autenticação (JWT)               │
│  - Armazenamento de chaves públicas │
│  - Roteamento de mensagens via WS   │
│  - Fila de mensagens offline        │
│                                     │
│  NUNCA conhece:                     │
│  - Chaves privadas                  │
│  - Chaves de sessão (AES)           │
│  - Conteúdo das mensagens           │
└─────────────────────────────────────┘
```

## Princípios Arquiteturais

1. **Servidor é dumb pipe** — transporta dados opacos, nunca interpreta payloads criptografados.
2. **Criptografia isolada** — camada independente no cliente, sem vazamento de detalhes para a UI.
3. **Modularidade** — cada conceito (auth, keys, sessions, encryption, ws) é um módulo separado.
4. **Substituibilidade** — a camada de criptografia pode ser trocada (ex: ECDH → Signal Protocol) sem impacto no resto do sistema.
5. **Zero confiança no servidor** — o cliente nunca envia plaintext ou chaves privadas.

---

## Stack Tecnológica

| Camada       | Tecnologia                  |
|-------------|----------------------------|
| Frontend     | React 18 + Vite + TypeScript |
| Backend      | Node.js + Express + ws + TypeScript |
| Criptografia | Web Crypto API (SubtleCrypto) |
| Auth         | JWT (jsonwebtoken)         |
| Hash senhas  | bcrypt                     |
| Persistência | Memória (Map) no servidor; localStorage no cliente |
| Monorepo     | npm workspaces             |

---

## Estrutura de Diretórios

```
/
├── package.json              # Root workspace config
├── tsconfig.base.json        # Shared TS config
├── ARCHITECTURE.md           # Este arquivo
├── docs/                     # Planos de implementação por fase
│   ├── phase-1-foundation.md
│   ├── phase-2-keypair.md
│   ├── phase-3-sessions.md
│   ├── phase-4-encryption.md
│   ├── phase-5-persistence.md
│   └── phase-6-rotation.md
│
├── client/                   # Frontend React + Vite
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/              # HTTP client + WebSocket wrapper
│       │   ├── http.ts       # fetch wrapper with JWT
│       │   └── socket.ts     # WebSocket singleton
│       ├── auth/             # Auth state & helpers
│       │   └── auth.ts
│       ├── crypto/           # CAMADA ISOLADA DE CRIPTOGRAFIA
│       │   ├── keypair.ts    # ECDH key generation, export, import
│       │   ├── session.ts    # Session derivation & cache
│       │   └── encryption.ts # AES-GCM encrypt/decrypt
│       ├── store/            # localStorage abstraction
│       │   └── storage.ts
│       ├── hooks/            # React hooks
│       │   ├── useAuth.ts
│       │   └── useChat.ts
│       ├── components/       # UI components
│       │   ├── AuthPage.tsx
│       │   ├── LoginForm.tsx
│       │   ├── RegisterForm.tsx
│       │   ├── ChatPage.tsx
│       │   ├── Sidebar.tsx
│       │   ├── UserList.tsx
│       │   ├── ConversationList.tsx
│       │   ├── ChatWindow.tsx
│       │   ├── ChatHeader.tsx
│       │   ├── MessageList.tsx
│       │   ├── MessageBubble.tsx
│       │   └── MessageInput.tsx
│       └── types/
│           └── index.ts
│
├── server/                   # Backend Node.js + Express
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Entry point (Express + WS)
│       ├── auth/             # Authentication module
│       │   ├── auth.router.ts
│       │   └── auth.service.ts
│       ├── users/            # User management
│       │   ├── users.router.ts
│       │   └── users.store.ts
│       ├── keys/             # Public key storage & routing
│       │   ├── keys.router.ts
│       │   └── keys.store.ts
│       ├── messages/         # Message routing & offline queue
│       │   ├── messages.router.ts
│       │   ├── messages.store.ts
│       │   └── messages.ws.ts
│       ├── ws/               # WebSocket server
│       │   ├── ws.server.ts
│       │   ├── ws.auth.ts
│       │   └── ws.handlers.ts
│       ├── middleware/
│       │   └── auth.middleware.ts
│       └── types/
│           └── index.ts
```

---

## Módulo de Criptografia (Cliente)

A camada de criptografia é completamente isolada do resto da aplicação. Nenhum componente React importa diretamente a Web Crypto API.

### API Pública da Camada Crypto

```typescript
// ─── crypto/keypair.ts ───
// Gera par ECDH P-256. Chave privada nunca sai do navegador.
generateKeyPair(): Promise<CryptoKeyPair>
// Exporta chave pública para base64 (formato "raw").
exportPublicKey(key: CryptoKey): Promise<string>
// Importa chave pública de base64.
importPublicKey(base64: string): Promise<CryptoKey>
// Salva chave privada como JWK no localStorage.
storePrivateKey(key: CryptoKey): Promise<void>
// Carrega chave privada do localStorage.
loadPrivateKey(): Promise<CryptoKey | null>

// ─── crypto/session.ts ───
// Deriva chave AES-GCM 256-bit via ECDH a partir da chave privada local + chave pública do peer.
deriveSessionKey(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey>
// Armazena sessão em Map<peerId, CryptoKey> em memória.
setSession(peerId: string, key: CryptoKey): void
getSession(peerId: string): CryptoKey | undefined
hasSession(peerId: string): boolean
clearSessions(): void

// ─── crypto/encryption.ts ───
// Criptografa string → { iv: base64, ciphertext: base64 }
encrypt(key: CryptoKey, plaintext: string): Promise<{ iv: string; ciphertext: string }>
// Descriptografa → string
decrypt(key: CryptoKey, iv: string, ciphertext: string): Promise<string>
```

### Regra de Ouro

Nenhum arquivo fora de `client/src/crypto/` pode importar `crypto.subtle` ou tipos como `CryptoKey`, `CryptoKeyPair`. A UI só conhece strings (base64) e funções de alto nível.

---

## Comunicação com o Servidor

### REST Endpoints

Todos os endpoints exceto `/api/auth/*` exigem header `Authorization: Bearer <jwt>`.

| Método | Rota                     | Body / Params                          | Response                       |
|--------|--------------------------|----------------------------------------|--------------------------------|
| POST   | /api/auth/register       | `{ username, password }`              | `{ token, user }`             |
| POST   | /api/auth/login          | `{ username, password }`              | `{ token, user }`             |
| GET    | /api/users               | —                                      | `{ users: User[] }`           |
| GET    | /api/users/:id/key       | —                                      | `{ publicKey: string }`       |
| PUT    | /api/keys                | `{ publicKey: string }`               | `{ success: true }`           |
| GET    | /api/messages            | —                                      | `{ messages: EncMessage[] }`  |

### WebSocket

Conexão autenticada: `ws://localhost:3001?token=<jwt>`

**Mensagens Client → Server:**
```json
{ "type": "message", "to": "<userId>", "iv": "<base64>", "ciphertext": "<base64>" }
```

**Mensagens Server → Client:**
```json
{ "type": "message", "from": "<userId>", "iv": "<base64>", "ciphertext": "<base64>", "timestamp": 1234567890 }
{ "type": "delivery_ack", "messageId": "<uuid>" }
{ "type": "error", "message": "<error description>" }
{ "type": "offline_messages", "messages": [...] }
```

---

## Modelos de Dados

### Servidor (em memória)

```typescript
interface User {
  id: string;           // UUID
  username: string;
  passwordHash: string;
}

interface PublicKeyEntry {
  userId: string;
  publicKey: string;    // base64 (raw ECDH P-256 public key)
}

interface EncryptedMessage {
  id: string;
  from: string;
  to: string;
  iv: string;           // base64
  ciphertext: string;   // base64
  timestamp: number;
}
```

### Cliente

```typescript
interface AuthState {
  token: string | null;
  user: { id: string; username: string } | null;
}

// Em memória apenas (CryptoKey não é serializável)
type SessionStore = Map<string, CryptoKey>; // peerId → AES session key

interface DecryptedMessage {
  id: string;
  from: string;
  to: string;
  plaintext: string;
  timestamp: number;
  direction: 'sent' | 'received';
}
```

---

## Fluxo de Dados Completo

### 1. Registro/Login

```
Client                          Server
  │                                │
  ├─ POST /api/auth/register ────►│
  │   { username, password }      │─ Salva user (bcrypt hash)
  │                                │─ Gera JWT
  │◄──── { token, user } ────────┤
  │                                │
  │─ Conecta WebSocket ──────────►│
  │   ws://host?token=<jwt>       │─ Valida JWT
  │                                │─ Registra conexão
```

### 2. Publicação de Chave Pública

```
Client                          Server
  │                                │
  │─ Gera KeyPair ECDH P-256      │
  │─ Salva privateKey (local)     │
  │─ Exporta publicKey → base64   │
  │                                │
  │─ PUT /api/keys ──────────────►│
  │   { publicKey: "..." }        │─ Armazena publicKey
  │◄──── { success: true } ──────┤
```

### 3. Início de Conversa (Key Exchange)

```
Alice                           Server                          Bob
  │                                │                              │
  │─ GET /api/users/bobId/key ───►│                              │
  │◄─── { publicKey: "..." } ────┤                              │
  │                                │                              │
  │─ importPublicKey(bobKey)      │                              │
  │─ deriveSessionKey(            │                              │
  │     alicePriv, bobPub)         │                              │
  │─ setSession("bobId", aesKey)  │                              │
  │                                │                              │
  │─── mensagem criptografada ───►│─── encaminha ──────────────►│
  │                                │                              │
  │                                │      (Bob repete o mesmo     │
  │                                │       processo ao responder) │
```

### 4. Envio de Mensagem Criptografada

```
Alice Client                                          Bob Client
  │                                                      │
  │─ getSession("bobId") → aesKey                       │
  │─ encrypt(aesKey, "Olá Bob") → { iv, ciphertext }    │
  │                                                      │
  │─ WS: { type:"message", to:"bobId", iv, ciphertext }─►│
  │                                                      │
  │                              Recebe via WS ◄─────────│
  │                                                      │
  │                              ─ getSession("aliceId") │
  │                              ─ decrypt(aesKey, iv,   │
  │                                  ciphertext)         │
  │                              ─ "Olá Bob"             │
```

---

## Decisões Arquiteturais Registradas (ADR)

### ADR-001: CryptoKey em memória

**Contexto:** `CryptoKey` objects da Web Crypto API não são serializáveis (não podem ser convertidos a JSON/String e armazenados em localStorage).

**Decisão:** Sessões (`CryptoKey` AES) vivem apenas em memória (`Map<string, CryptoKey>`). Ao recarregar a página, as sessões são re-derivadas automaticamente a partir da chave privada (localStorage) + chaves públicas dos peers (buscadas do servidor ou cacheadas no localStorage).

**Consequência:** O primeiro carregamento após reload exige uma requisição ao servidor por chave pública de cada peer, seguida de derivação ECDH. Isso é transparente para o usuário e leva milissegundos.

### ADR-002: Um WebSocket por cliente

**Decisão:** Cada cliente mantém uma única conexão WebSocket com o servidor. Todas as conversas são multiplexadas nessa conexão, diferenciadas pelo campo `to`/`from`.

**Alternativa rejeitada:** Um WebSocket por conversa. Rejeitada por complexidade desnecessária para este escopo.

### ADR-003: Sem banco de dados

**Decisão:** Todos os dados do servidor são armazenados em memória (Maps). O servidor é stateless em termos de persistência — ao reiniciar, todos os dados são perdidos.

**Justificativa:** Consistente com o propósito educacional. Adicionar persistência (SQLite) é trivial no futuro (trocar `Map` por queries).

### ADR-004: Tipos compartilhados sem pacote shared/

**Decisão:** Tipos TypeScript comuns (interfaces de mensagem, usuário) serão duplicados entre client e server, mantidos manualmente sincronizados.

**Alternativa rejeitada:** Pacote `shared/` no monorepo. Rejeitada para evitar complexidade de build adicional. Se necessário no futuro, extrair é simples.

### ADR-005: bcrypt para hash de senhas

**Decisão:** Usar bcrypt com salt rounds = 10 para hash de senhas no servidor.

### ADR-006: JWT sem refresh token

**Decisão:** JWT simples com expiração longa (24h). Sem refresh token.

**Justificativa:** Projeto educacional. Adicionar refresh token seria complexidade desnecessária.

---

## Convenções de Código

- TypeScript strict mode em ambos client e server.
- Nomes de arquivo: `kebab-case.ts` para módulos, `PascalCase.tsx` para componentes React.
- Imports: sem `../` relativos profundos; usar aliases (`@/` no client via Vite, `@/` no server via tsconfig paths).
- Todas as funções exportadas têm tipagem explícita de retorno.
- Nada de `any` — usar `unknown` quando necessário.
- Sem comentários desnecessários. Código deve ser autoexplicativo.
- Logs no servidor usam `console.log` com prefixo `[MODULE]`.

## Como Executar

```bash
# Instalar dependências (raiz do monorepo)
npm install

# Iniciar servidor (porta 3001)
npm run dev:server

# Iniciar cliente (porta 5173)
npm run dev:client
```
