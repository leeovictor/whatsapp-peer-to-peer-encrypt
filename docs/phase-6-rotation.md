# Fase 6 — Rotação de Chaves, Renovação de Sessões e Múltiplas Conversas

## Pré-requisito

Fase 5 completa (mensagens offline, reconexão, persistência local).

---

## Objetivo

Adicionar funcionalidades avançadas de gerenciamento criptográfico e usabilidade:
1. Rotação de chaves: usuário pode regenerar seu KeyPair e atualizar a chave pública.
2. Renovação de sessões: após rotação, sessões existentes são re-derivadas.
3. Múltiplas conversas simultâneas na UI: sidebar mostra conversas ativas com indicador de sessão.
4. Histórico de chaves públicas no servidor (versionamento simples).
5. Interface para gerenciar sessões (ver status, renovar, remover).

---

## Escopo

### Servidor

1. **Versionamento de chaves públicas — `server/src/keys/keys.store.ts`**

   Modificar o storage de chave única para suportar múltiplas versões:

   ```typescript
   export interface PublicKeyVersion {
     version: number;
     publicKey: string;
     createdAt: number;
   }

   // userId → array de versões (mais recente primeiro)
   const publicKeys = new Map<string, PublicKeyVersion[]>();

   /**
    * Adiciona uma nova versão da chave pública.
    */
   export function addPublicKey(userId: string, publicKey: string): PublicKeyVersion {
     const versions = publicKeys.get(userId) || [];
     const newVersion: PublicKeyVersion = {
       version: versions.length + 1,
       publicKey,
       createdAt: Date.now(),
     };
     versions.unshift(newVersion); // mais recente primeiro
     publicKeys.set(userId, versions);
     console.log(`[Keys] User ${userId} public key updated to version ${newVersion.version}`);
     return newVersion;
   }

   /**
    * Retorna a chave pública mais recente de um usuário.
    */
   export function getLatestPublicKey(userId: string): string | undefined {
     const versions = publicKeys.get(userId);
     return versions?.[0]?.publicKey;
   }

   /**
    * Retorna uma versão específica da chave pública.
    */
   export function getPublicKeyVersion(userId: string, version: number): string | undefined {
     const versions = publicKeys.get(userId);
     return versions?.find(v => v.version === version)?.publicKey;
   }

   /**
    * Retorna todas as versões de chave pública (metadados, sem as chaves).
    */
   export function getPublicKeyVersions(userId: string): Omit<PublicKeyVersion, 'publicKey'>[] {
     const versions = publicKeys.get(userId) || [];
     return versions.map(({ version, createdAt }) => ({ version, createdAt }));
   }

   /**
    * Remove todas as chaves de um usuário.
    */
   export function removeAllKeys(userId: string): void {
     publicKeys.delete(userId);
   }
   ```

2. **Novos endpoints de chave pública — `server/src/keys/keys.router.ts`**

   Modificar o router existente:

   ```typescript
   // PUT /api/keys — agora ADICIONA uma nova versão em vez de sobrescrever
   router.put('/', authMiddleware, (req, res) => {
     const userId = req.user!.sub;
     const { publicKey } = req.body;
     
     if (!publicKey || typeof publicKey !== 'string') {
       return res.status(400).json({ error: 'publicKey is required' });
     }

     const version = addPublicKey(userId, publicKey);
     res.json({ success: true, version: version.version });
   });

   // GET /api/users/:id/key — retorna a mais recente (compatível com fases anteriores)
   // GET /api/users/:id/key?version=1 — retorna versão específica
   router.get('/users/:id/key', authMiddleware, (req, res) => {
     const { id } = req.params;
     const version = req.query.version ? parseInt(req.query.version as string) : undefined;

     let publicKey: string | undefined;
     if (version) {
       publicKey = getPublicKeyVersion(id, version);
     } else {
       publicKey = getLatestPublicKey(id);
     }

     if (!publicKey) {
       return res.status(404).json({ error: 'No public key found for this user' });
     }

     res.json({ publicKey, version: version || 'latest' });
   });

   // GET /api/users/:id/key/versions — lista versões disponíveis
   router.get('/users/:id/key/versions', authMiddleware, (req, res) => {
     const { id } = req.params;
     const versions = getPublicKeyVersions(id);
     res.json({ versions });
   });
   ```

3. **Armazenamento de mensagens offline com versão da chave**

   Em `server/src/messages/messages.store.ts`, adicionar campo `keyVersion`:

   ```typescript
   export interface StoredMessage {
     id: string;
     from: string;
     to: string;
     iv: string;
     ciphertext: string;
     timestamp: number;
     delivered: boolean;
     keyVersion?: number; // versão da chave pública do remetente usada para esta mensagem
   }
   ```

### Cliente

1. **Rotação de chaves — `client/src/crypto/keypair.ts` (adicionar)**

   ```typescript
   /**
    * Gera um novo KeyPair e atualiza o localStorage e o servidor.
    * Retorna a nova chave pública em base64.
    */
   export async function rotateKeyPair(currentUserId: string): Promise<string> {
     console.log('[Crypto] Rotating key pair...');
     
     // 1. Gerar novo par
     const newKeyPair = await generateKeyPair();
     
     // 2. Salvar nova chave privada
     await storePrivateKey(currentUserId, newKeyPair.privateKey);
     
     // 3. Exportar e salvar nova chave pública localmente
     const publicKeyBase64 = await exportPublicKey(newKeyPair.publicKey);
     storePublicKeyBase64(currentUserId, publicKeyBase64);
     
     // 4. Publicar no servidor
     await publishPublicKey(publicKeyBase64);
     
     console.log('[Crypto] Key pair rotated successfully');
     return publicKeyBase64;
   }
   ```

2. **Renovação de sessões — `client/src/crypto/session.ts` (adicionar)**

   ```typescript
   /**
    * Re-deriva a sessão com um peer específico.
    * Útil após rotação de chaves.
    */
   export async function renewSession(
     currentUserId: string,
     peerId: string
   ): Promise<CryptoKey> {
     console.log(`[Crypto] Renewing session with ${peerId}...`);
     
     // Remove sessão antiga
     removeSession(peerId);
     
     // Re-deriva do zero
     const privateKey = await loadPrivateKey(currentUserId);
     if (!privateKey) throw new Error('No private key found');
     
     const { publicKey: peerPublicKeyBase64 } = await fetchPublicKey(peerId);
     const peerPublicKey = await importPublicKey(peerPublicKeyBase64);
     
     const sessionKey = await deriveSessionKey(privateKey, peerPublicKey);
     setSession(peerId, sessionKey);
     
     console.log(`[Crypto] Session renewed with ${peerId}`);
     return sessionKey;
   }

   /**
    * Renova todas as sessões ativas.
    * Chamado após rotação de chaves.
    */
   export async function renewAllSessions(currentUserId: string): Promise<void> {
     const activePeers = getActiveSessions();
     console.log(`[Crypto] Renewing ${activePeers.length} sessions...`);
     
     for (const peerId of activePeers) {
       try {
         await renewSession(currentUserId, peerId);
       } catch (err) {
         console.error(`[Crypto] Failed to renew session with ${peerId}:`, err);
       }
     }
     
     console.log('[Crypto] All sessions renewed');
   }
   ```

3. **Múltiplas conversas — modificar `useChat.tsx`**

   O hook precisa gerenciar múltiplas conversas simultâneas:

   ```typescript
   interface ChatState {
     // Mensagens agrupadas por peerId
     messagesByPeer: Map<string, Message[]>;
     // Peer atualmente selecionado
     activePeerId: string | null;
     // Lista de peers com conversa ativa
     activePeers: string[];
   }

   // Em vez de um array único de mensagens, mantemos um mapa:
   const [messagesByPeer, setMessagesByPeer] = useState<Map<string, Message[]>>(new Map());

   // Mensagens da conversa ativa (derivado):
   const messages = activePeerId ? messagesByPeer.get(activePeerId) || [] : [];

   // Ao selecionar peer:
   const selectPeer = useCallback(async (peerId: string) => {
     setActivePeerId(peerId);
     
     // Se ainda não tem entrada no mapa, carregar do localStorage
     if (!messagesByPeer.has(peerId)) {
       const saved = loadMessages(currentUser!.id, peerId);
       setMessagesByPeer(prev => new Map(prev).set(peerId, saved));
     }
     
     // Garantir sessão
     try {
       await ensureSession(currentUser!.id, peerId);
     } catch (err) {
       console.error('[Chat] Session error:', err);
     }
   }, [currentUser, messagesByPeer]);

   // Ao receber mensagem:
   // Adicionar ao mapa pela chave data.from
   const addMessage = useCallback((peerId: string, message: Message) => {
     setMessagesByPeer(prev => {
       const next = new Map(prev);
       const existing = next.get(peerId) || [];
       next.set(peerId, [...existing, message]);
       return next;
     });
   }, []);
   ```

4. **Sidebar de conversas ativas — `ConversationList.tsx`**

   ```typescript
   // Exibe peers com quem o usuário já trocou mensagens (ou tem sessão ativa)
   // Para cada peer: username, última mensagem (preview), indicador de sessão (cadeado)
   
   import { hasSession } from '@/crypto/session';
   import { getActiveSessions } from '@/crypto/session';
   ```

5. **Página de configurações de segurança — `SecuritySettings.tsx` (novo componente)**

   ```typescript
   // Permite ao usuário:
   // - Ver quando a chave foi gerada (do localStorage)
   // - Botão "Rotacionar chaves" → rotateKeyPair + renewAllSessions
   // - Ver sessões ativas e seus status
   // - Botão "Renovar sessão" por peer
   // - Botão "Renovar todas as sessões"
   ```

6. **Hook useCrypto — gerenciamento centralizado**

   Extrair lógica criptográfica dos hooks de UI:

   ```typescript
   // client/src/hooks/useCrypto.ts
   export function useCrypto() {
     const { currentUser } = useAuth();
     
     const rotateKeys = useCallback(async () => {
       if (!currentUser) return;
       await rotateKeyPair(currentUser.id);
       await renewAllSessions(currentUser.id);
     }, [currentUser]);
     
     const renewSession = useCallback(async (peerId: string) => {
       if (!currentUser) return;
       await renewSession(currentUser.id, peerId);
     }, [currentUser]);
     
     const sessionStatus = useCallback((peerId: string) => {
       return hasSession(peerId);
     }, []);
     
     const activeSessions = useCallback(() => {
       return getActiveSessions();
     }, []);
     
     return { rotateKeys, renewSession, sessionStatus, activeSessions };
   }
   ```

---

## Estrutura de Arquivos ao Final da Fase

```
(adicionais/modificações sobre a Fase 5)

server/src/
├── keys/
│   ├── keys.store.ts          # MODIFICADO: versionamento de chaves
│   └── keys.router.ts         # MODIFICADO: novos endpoints versionados
├── messages/
│   └── messages.store.ts      # MODIFICADO: keyVersion opcional
└── types/
    └── index.ts               # MODIFICADO: PublicKeyVersion

client/src/
├── crypto/
│   ├── keypair.ts             # MODIFICADO: rotateKeyPair
│   ├── session.ts             # MODIFICADO: renewSession, renewAllSessions
│   └── session-init.ts        # Existente
├── hooks/
│   ├── useAuth.tsx            # Existente
│   ├── useChat.tsx            # MODIFICADO: múltiplas conversas
│   └── useCrypto.ts           # NOVO: hook de gerenciamento cripto
├── components/
│   ├── ConversationList.tsx   # NOVO: lista de conversas ativas
│   ├── SecuritySettings.tsx   # NOVO: página de config de segurança
│   ├── Sidebar.tsx            # MODIFICADO: incluir ConversationList
│   └── ChatHeader.tsx         # MODIFICADO: botão de contexto (renovar sessão)
└── types/
    └── index.ts               # MODIFICADO: novos tipos
```

---

## Fluxo de Rotação de Chaves

```
1. Usuário acessa Configurações de Segurança
2. Clica em "Rotacionar Chaves"
3. Sistema:
   a. Gera novo KeyPair ECDH P-256
   b. Salva nova chave privada no localStorage (sobrescreve anterior?)
      → NÃO sobrescrever: manter histórico local?
      → Simplicidade: sobrescrever. A chave antiga não será mais usada.
   c. Publica nova chave pública no servidor (PUT /api/keys → versão 2)
   d. Para cada sessão ativa:
      - Busca chave pública mais recente do peer
      - Re-deriva chave de sessão com NOVA chave privada
      - Substitui sessão antiga
   e. Servidor notifica peers conectados? Não nesta fase.
      → Peers vão notar ao receber mensagem que não conseguem descriptografar.
      → Solução: peers periodicamente verificam versão da chave (polling).
      → Simplificação: peers re-derivam ao receber primeira mensagem pós-rotação.
```

## Edge Cases da Rotação

### Peer tenta descriptografar com sessão antiga

```
Após Alice rotacionar chaves:
1. Alice envia mensagem criptografada com NOVA sessionKey.
2. Bob recebe, tenta decrypt com sessionKey ANTIGA.
3. Decrypt FALHA → erro.
4. Bob detecta falha → tenta re-derivar sessão:
   a. Busca chave pública mais recente da Alice.
   b. Re-deriva sessionKey.
   c. Tenta decrypt novamente → SUCESSO.
```

Implementar essa detecção no handler de recebimento do useChat:

```typescript
try {
  plaintext = await decrypt(sessionKey, data.iv, data.ciphertext);
} catch (err) {
  console.warn('[Chat] Decrypt failed, attempting session renewal...');
  try {
    await renewSession(currentUser!.id, data.from);
    const newSessionKey = getSession(data.from)!;
    plaintext = await decrypt(newSessionKey, data.iv, data.ciphertext);
  } catch (retryErr) {
    console.error('[Chat] Decryption failed after renewal:', retryErr);
    plaintext = '[Mensagem não pôde ser descriptografada]';
  }
}
```

---

## Critérios de Aceitação

### Rotação de Chaves
1. Usuário pode rotacionar seu KeyPair via UI (SecuritySettings).
2. Após rotação, nova chave pública é publicada no servidor (versão incrementada).
3. Chave privada antiga é substituída no localStorage.
4. Todas as sessões ativas são renovadas automaticamente.

### Renovação de Sessão
5. Mensagem enviada com chave rotacionada → peer consegue descriptografar (re-deriva automaticamente).
6. Botão "Renovar Sessão" por peer renova manualmente.
7. Indicador visual de sessão ativa/inativa na lista de conversas.

### Múltiplas Conversas
8. Sidebar mostra lista de conversas ativas (peers com quem já trocou mensagens).
9. Clicar em diferentes conversas alterna o histórico exibido.
10. Cada conversa tem seu próprio sessionKey independente.
11. Mensagens recebidas de um peer enquanto visualiza conversa com outro são armazenadas corretamente.

### Versionamento de Chaves
12. `GET /api/users/:id/key/versions` retorna lista de versões.
13. `GET /api/users/:id/key?version=N` retorna chave específica.
14. Mensagens offline armazenam versão da chave usada (keyVersion).

---

## Teste Manual da Fase 6

```bash
# TESTE 1: Rotação de chaves
# 1. Alice logada, sessão com Bob ativa
# 2. Alice vai em Configurações > Rotacionar Chaves
# 3. Verificar: nova chave pública no servidor (versão 2)
# 4. Alice envia mensagem para Bob
# 5. Bob recebe e descriptografa CORRETAMENTE (re-derivação automática)
# 6. Verificar console do Bob: "Decrypt failed, attempting session renewal..."

# TESTE 2: Renovação manual de sessão
# 1. Alice clica com botão direito no chat do Bob > "Renovar Sessão"
# 2. Sessão é re-derivada
# 3. Chat continua funcionando

# TESTE 3: Múltiplas conversas
# 1. Adicionar usuário Charlie
# 2. Alice conversa com Bob (várias mensagens)
# 3. Alice clica em Charlie → novo chat em branco
# 4. Alice conversa com Charlie
# 5. Alice volta para Bob → vê histórico completo do Bob
# 6. Durante chat com Charlie, Bob envia mensagem → Alice vê notificação/contador

# TESTE 4: Versionamento de chaves
# 1. Alice rotaciona chaves 3 vezes
# 2. GET /api/users/aliceId/key/versions → retorna [v3, v2, v1]
# 3. GET /api/users/aliceId/key?version=1 → retorna chave da v1
```

---

## O que NÃO faz parte desta fase

- Double Ratchet (rotação automática por mensagem)
- X3DH (key agreement com múltiplos estágios)
- Sincronização de rotação entre dispositivos
- Notificação em tempo real de rotação para peers
- Revogação de chaves antigas
- Assinatura digital de chaves (identity key)
- QR Code de verificação de chave
- Grupos
- Chamadas de voz/vídeo
