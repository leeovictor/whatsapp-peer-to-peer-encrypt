# Fase 5 — Persistência, Mensagens Offline e Reconexão

## Pré-requisito

Fase 4 completa (mensagens criptografadas com AES-GCM, servidor tratando payloads como opacos).

---

## Objetivo

Adicionar resiliência ao sistema:
1. Servidor armazena mensagens criptografadas quando o destinatário está offline e as entrega quando ele conectar.
2. Cliente persiste mensagens descriptografadas no localStorage.
3. Cliente implementa reconexão automática do WebSocket com backoff exponencial.

---

## Escopo

### Servidor

1. **Armazenamento de mensagens offline — `server/src/messages/messages.store.ts`**

   ```typescript
   export interface StoredMessage {
     id: string;
     from: string;
     to: string;
     iv: string;
     ciphertext: string;
     timestamp: number;
     delivered: boolean;
   }

   // Fila de mensagens por usuário destinatário
   const messageQueue = new Map<string, StoredMessage[]>();

   /**
    * Adiciona uma mensagem à fila de um usuário offline.
    */
   export function enqueueMessage(msg: StoredMessage): void {
     const queue = messageQueue.get(msg.to) || [];
     queue.push(msg);
     messageQueue.set(msg.to, queue);
     console.log(`[Messages] Enqueued message ${msg.id} for ${msg.to}`);
   }

   /**
    * Recupera e REMOVE todas as mensagens pendentes de um usuário.
    */
   export function dequeueMessages(userId: string): StoredMessage[] {
     const queue = messageQueue.get(userId) || [];
     messageQueue.delete(userId);
     console.log(`[Messages] Dequeued ${queue.length} messages for ${userId}`);
     return queue;
   }

   /**
    * Verifica se há mensagens pendentes.
    */
   export function hasPendingMessages(userId: string): boolean {
     const queue = messageQueue.get(userId);
     return queue !== undefined && queue.length > 0;
   }

   /**
    * Conta mensagens pendentes.
    */
   export function pendingCount(userId: string): number {
     return messageQueue.get(userId)?.length || 0;
   }
   ```

2. **Modificação no handler WebSocket — `server/src/ws/ws.handlers.ts`**

   Modificar o handler de mensagem para enfileirar quando destinatário offline:

   ```typescript
   if (data.type === 'message') {
     const message: StoredMessage = {
       id: uuidv4(),  // ou crypto.randomUUID()
       from: userId,
       to: data.to,
       iv: data.iv,
       ciphertext: data.ciphertext,
       timestamp: Date.now(),
       delivered: false,
     };

     const targetWs = connections.get(data.to);
     if (targetWs && targetWs.readyState === WebSocket.OPEN) {
       // Online → entrega imediata
       message.delivered = true;
       targetWs.send(JSON.stringify({
         type: 'message',
         from: message.from,
         iv: message.iv,
         ciphertext: message.ciphertext,
         timestamp: message.timestamp,
       }));
     } else {
       // Offline → enfileirar
       enqueueMessage(message);
       // Notificar remetente que mensagem foi enfileirada
       ws.send(JSON.stringify({
         type: 'queued',
         messageId: message.id,
         to: data.to,
       }));
     }
   }
   ```

3. **Entrega de mensagens pendentes ao conectar — `server/src/ws/ws.server.ts`**

   Após autenticar o WebSocket e registrar a conexão:

   ```typescript
   // Após registrar a conexão no Map:
   connections.set(userId, ws);

   // Entregar mensagens pendentes
   const pending = dequeueMessages(userId);
   if (pending.length > 0) {
     ws.send(JSON.stringify({
       type: 'offline_messages',
       messages: pending.map(msg => ({
         from: msg.from,
         iv: msg.iv,
         ciphertext: msg.ciphertext,
         timestamp: msg.timestamp,
       })),
     }));
   }
   ```

4. **Novo endpoint REST para polling (opcional, fallback) — `server/src/messages/messages.router.ts`**

   ```typescript
   import { Router } from 'express';
   import { authMiddleware } from '../middleware/auth.middleware';
   import { dequeueMessages } from './messages.store';

   const router = Router();

   // GET /api/messages — retorna mensagens offline pendentes
   router.get('/', authMiddleware, (req, res) => {
     const userId = req.user!.sub;
     const messages = dequeueMessages(userId);
     res.json({ messages });
   });

   export { router as messagesRouter };
   ```

   Registrar em `server/src/index.ts`: `app.use('/api/messages', messagesRouter)`.

5. **Atualização dos tipos do servidor**

   ```typescript
   // Em server/src/types/index.ts

   export interface StoredMessage {
     id: string;
     from: string;
     to: string;
     iv: string;
     ciphertext: string;
     timestamp: number;
     delivered: boolean;
   }

   // Adicionar aos tipos WebSocket:
   export interface WsQueuedNotification {
     type: 'queued';
     messageId: string;
     to: string;
   }

   export interface WsOfflineMessages {
     type: 'offline_messages';
     messages: Array<{
       from: string;
       iv: string;
       ciphertext: string;
       timestamp: number;
     }>;
   }
   ```

### Cliente

1. **Persistência de mensagens — `client/src/store/storage.ts`**

   ```typescript
   const MESSAGES_PREFIX = 'messages:';
   const USERS_CACHE_KEY = 'users_cache';

   /**
    * Salva mensagens descriptografadas de uma conversa.
    * Key: messages:{currentUserId}:{peerId}
    */
   export function saveMessages(
     currentUserId: string,
     peerId: string,
     messages: Message[]
   ): void {
     const key = `${MESSAGES_PREFIX}${currentUserId}:${peerId}`;
     localStorage.setItem(key, JSON.stringify(messages));
   }

   /**
    * Carrega mensagens descriptografadas de uma conversa.
    */
   export function loadMessages(
     currentUserId: string,
     peerId: string
   ): Message[] {
     const key = `${MESSAGES_PREFIX}${currentUserId}:${peerId}`;
     const stored = localStorage.getItem(key);
     return stored ? JSON.parse(stored) : [];
   }

   /**
    * Remove mensagens de uma conversa.
    */
   export function clearMessages(currentUserId: string, peerId: string): void {
     const key = `${MESSAGES_PREFIX}${currentUserId}:${peerId}`;
     localStorage.removeItem(key);
   }

   /**
    * Cache de chaves públicas de peers (para re-derivação de sessão offline).
    */
   export function cachePublicKey(userId: string, publicKey: string): void {
     localStorage.setItem(`pubkey_cache:${userId}`, publicKey);
   }

   export function getCachedPublicKey(userId: string): string | null {
     return localStorage.getItem(`pubkey_cache:${userId}`);
   }
   ```

2. **Modificação no hook useChat — persistência**

   Adicionar salvamento/carregamento de mensagens:

   ```typescript
   import { saveMessages, loadMessages } from '@/store/storage';

   // Ao selecionar um usuário:
   const selectUser = useCallback(async (userId: string) => {
     setActiveUserId(userId);
     
     // Carregar mensagens persistidas desta conversa
     const saved = loadMessages(currentUser!.id, userId);
     setMessages(saved);
     
     // Garantir sessão
     try {
       await ensureSession(currentUser!.id, userId);
     } catch (err) {
       console.error('[Chat] Failed to establish session:', err);
     }
   }, [currentUser]);

   // Efeito para persistir mensagens sempre que mudarem:
   useEffect(() => {
     if (activeUserId && currentUser) {
       saveMessages(currentUser.id, activeUserId, messages);
     }
   }, [messages, activeUserId, currentUser]);
   ```

3. **Reconexão automática — modificar `client/src/api/socket.ts`**

   ```typescript
   class SocketService {
     private ws: WebSocket | null = null;
     private messageHandlers: Set<MessageHandler> = new Set();
     private openHandlers: Set<() => void> = new Set();
     private closeHandlers: Set<() => void> = new Set();
     
     private token: string = '';
     private reconnectAttempts = 0;
     private maxReconnectAttempts = 10;
     private reconnectDelay = 1000; // 1 segundo inicial
     private maxReconnectDelay = 30000; // 30 segundos máximo
     private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
     private intentionalClose = false;

     connect(token: string) {
       this.token = token;
       this.intentionalClose = false;
       this.createConnection();
     }

     private createConnection() {
       this.ws = new WebSocket(`ws://localhost:3001?token=${this.token}`);

       this.ws.onopen = () => {
         console.log('[WS] Connected');
         this.reconnectAttempts = 0;
         this.openHandlers.forEach(h => h());
       };

       this.ws.onmessage = (event) => {
         const data = JSON.parse(event.data);
         
         // Tratar mensagens offline em lote
         if (data.type === 'offline_messages') {
           data.messages.forEach((msg: WsIncomingMessage) => {
             this.messageHandlers.forEach(h => h(msg));
           });
           return;
         }
         
         this.messageHandlers.forEach(h => h(data));
       };

       this.ws.onclose = (event) => {
         console.log(`[WS] Disconnected (code: ${event.code})`);
         this.closeHandlers.forEach(h => h());
         
         if (!this.intentionalClose) {
           this.scheduleReconnect();
         }
       };

       this.ws.onerror = (err) => {
         console.error('[WS] Error:', err);
       };
     }

     private scheduleReconnect() {
       if (this.reconnectAttempts >= this.maxReconnectAttempts) {
         console.error('[WS] Max reconnect attempts reached');
         return;
       }

       // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
       const delay = Math.min(
         this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
         this.maxReconnectDelay
       );

       console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
       
       this.reconnectTimer = setTimeout(() => {
         this.reconnectAttempts++;
         this.createConnection();
       }, delay);
     }

     disconnect() {
       this.intentionalClose = true;
       if (this.reconnectTimer) {
         clearTimeout(this.reconnectTimer);
         this.reconnectTimer = null;
       }
       this.ws?.close();
       this.ws = null;
       this.reconnectAttempts = 0;
     }

     onOpen(handler: () => void) {
       this.openHandlers.add(handler);
       return () => this.openHandlers.delete(handler);
     }

     onClose(handler: () => void) {
       this.closeHandlers.add(handler);
       return () => this.closeHandlers.delete(handler);
     }

     // ... restante dos métodos (send, onMessage) permanece igual
   }
   ```

4. **Listener para mensagens offline no useChat**

   No hook useChat, o listener já trata `offline_messages`? Não — o socket.service agora despacha cada mensagem individualmente para os handlers. Mas precisamos garantir que o tipo `WsIncomingMessage` inclua `offline_messages` ou que o socket dispatche individualmente.

   A abordagem acima (socket emite cada mensagem do batch individualmente) é mais limpa — o useChat não precisa saber sobre batches.

5. **Cache de chaves públicas para re-derivação offline**

   Em `session-init.ts`, ao buscar chave pública do servidor, também salvar no cache local:

   ```typescript
   import { cachePublicKey } from '@/store/storage';

   export async function ensureSession(currentUserId: string, peerId: string): Promise<CryptoKey> {
     const existing = getSession(peerId);
     if (existing) return existing;

     const privateKey = await loadPrivateKey(currentUserId);
     if (!privateKey) throw new Error('No private key found');

     // Tentar cache local primeiro (evita requisição HTTP)
     let publicKeyBase64 = getCachedPublicKey(peerId);
     
     if (!publicKeyBase64) {
       // Buscar do servidor
       const response = await fetchPublicKey(peerId);
       publicKeyBase64 = response.publicKey;
       // Cache para uso futuro
       cachePublicKey(peerId, publicKeyBase64);
     }

     const peerPublicKey = await importPublicKey(publicKeyBase64);
     const sessionKey = await deriveSessionKey(privateKey, peerPublicKey);
     setSession(peerId, sessionKey);

     return sessionKey;
   }
   ```

6. **Atualização dos tipos do cliente**

   ```typescript
   // Em client/src/types/index.ts

   export interface WsQueuedNotification {
     type: 'queued';
     messageId: string;
     to: string;
   }

   // Message já existe, garantir que tem os campos corretos
   export interface Message {
     id: string;
     from: string;
     to: string;
     plaintext: string;
     timestamp: number;
     direction: 'sent' | 'received';
   }
   ```

---

## Estrutura de Arquivos ao Final da Fase

```
(adicionais/modificações sobre a Fase 4)

server/src/
├── messages/
│   ├── messages.store.ts      # NOVO: fila de mensagens offline
│   └── messages.router.ts     # NOVO: GET /api/messages
├── ws/
│   ├── ws.server.ts           # MODIFICADO: entrega offline_messages ao conectar
│   └── ws.handlers.ts         # MODIFICADO: enfileirar se offline, notificar 'queued'
├── types/
│   └── index.ts               # MODIFICADO: StoredMessage, WsQueuedNotification, etc.
└── index.ts                   # MODIFICADO: registrar messagesRouter

client/src/
├── store/
│   └── storage.ts             # NOVO: persistência localStorage + cache de pubkeys
├── api/
│   └── socket.ts              # MODIFICADO: reconexão com backoff exponencial
├── crypto/
│   └── session-init.ts        # MODIFICADO: cache de chaves públicas
├── hooks/
│   └── useChat.tsx            # MODIFICADO: persistência de mensagens, offline batch
└── types/
    └── index.ts               # MODIFICADO: WsQueuedNotification
```

---

## Fluxo: Mensagem Offline

```
Alice                            Servidor                         Bob (offline)
─────                            ────────                         ─────────────
1. Envia mensagem
   criptografada ─────────────► 2. Recebe { iv, ciphertext }
                                3. Bob não está no Map de conexões
                                4. enqueueMessage(msg) — armazena
                                5. Responde: { type: "queued",
                                   messageId: "...", to: "bobId" }
   ◄── { type: "queued" } ────
   Alice vê indicador "pendente"
   
   ... tempo passa ...
   
                                                       6. Bob conecta WebSocket
                                                          (login ou reconexão)
                                                       7. Servidor autentica
                                                       8. dequeueMessages("bobId")
                                                          → [msg1, msg2, msg3]
                                                       9. Envia batch:
                                                          { type: "offline_messages",
                                                            messages: [...] }
                                                                   │
                                                       10. Recebe batch
                                                       11. Para cada msg:
                                                           ensureSession
                                                           decrypt
                                                           exibe na UI
                                                       12. Salva no localStorage
```

---

## Critérios de Aceitação

### Mensagens Offline
1. Alice envia mensagem para Bob offline → servidor enfileira.
2. Alice recebe notificação `{ type: "queued" }` (pode mostrar "enviado" ou "pendente").
3. Bob faz login → recebe `{ type: "offline_messages" }` com todas as mensagens pendentes.
4. Bob vê todas as mensagens descriptografadas corretamente.
5. Após entrega, a fila do Bob no servidor está vazia.
6. Múltiplos remetentes: Alice e Charlie enviam mensagens para Bob offline → Bob recebe todas ao conectar.

### Reconexão Automática
7. Servidor cai e volta → cliente reconecta automaticamente.
8. Backoff exponencial: intervalos dobram a cada tentativa (1s, 2s, 4s, 8s...).
9. Máximo de 10 tentativas, depois para de tentar.
10. `disconnect()` intencional (logout) NÃO dispara reconexão.

### Persistência Local
11. Ao enviar/receber mensagem, mensagens são salvas no localStorage.
12. Ao selecionar um contato, mensagens anteriores são carregadas do localStorage.
13. Ao recarregar a página, o histórico da conversa atual permanece visível.
14. Mensagens de diferentes conversas são isoladas (keys diferentes).
15. Ao fazer logout, mensagens persistidas permanecem (para quando fizer login novamente).

### Cache de Chaves Públicas
16. Após buscar uma chave pública do servidor, ela é cachead no localStorage.
17. Ao reconectar offline, a re-derivação de sessão usa o cache local, sem precisar do servidor.

---

## Teste Manual da Fase 5

```bash
# Setup: Servidor rodando, Alice e Bob registrados

# TESTE 1: Mensagens offline
# 1. Alice e Bob fazem login
# 2. Alice seleciona Bob → sessão criada
# 3. Bob fecha o navegador (desconecta WebSocket)
# 4. Alice envia "Mensagem 1", "Mensagem 2", "Mensagem 3"
#    → Alice vê "enviado" (ou indicador de pendente)
# 5. Bob abre o navegador e faz login
#    → Bob vê as 3 mensagens descriptografadas
#    → Verificar: fila do servidor vazia

# TESTE 2: Reconexão automática
# 1. Alice logada, WebSocket conectado
# 2. Derrubar o servidor (Ctrl+C) e subir de novo
# 3. Verificar console do cliente: tentativas de reconexão com backoff
# 4. Quando servidor volta, WebSocket reconecta
# 5. Alice envia mensagem → entregue normalmente

# TESTE 3: Persistência de histórico
# 1. Alice tem conversa com Bob (várias mensagens)
# 2. Alice recarrega a página (F5)
# 3. Alice faz login novamente
# 4. Clica em Bob → vê todo o histórico da conversa

# TESTE 4: Desconexão intencional (logout)
# 1. Alice faz logout
# 2. Verificar: NÃO há tentativas de reconexão no console
```

---

## O que NÃO faz parte desta fase

- Confirmação de entrega (delivery ack com status "entregue"/"lido")
- Sincronização de mensagens entre múltiplas abas
- Limpeza automática de mensagens antigas
- Indicador de digitação (typing indicator)
- Rotação de chaves
- Múltiplas conversas simultâneas na UI (foco em uma conversa por vez)
