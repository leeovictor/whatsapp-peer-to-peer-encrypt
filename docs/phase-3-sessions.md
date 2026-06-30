# Fase 3 — Troca de Chaves + Criação de Sessões Criptográficas

## Pré-requisito

Fase 2 completa (KeyPair gerado no cliente, chave pública publicada no servidor, endpoints de consulta funcionando).

---

## Objetivo

Quando um usuário seleciona um contato para conversar, o sistema deriva uma chave de sessão AES-GCM 256-bit via ECDH usando a chave privada local + a chave pública do contato. Ambos os lados obtêm a mesma chave simétrica sem nunca transmiti-la.

As mensagens ainda são enviadas em texto puro — a criptografia será aplicada na Fase 4. Nesta fase, o objetivo é apenas ter a chave de sessão derivada e armazenada corretamente em memória.

---

## Escopo

### Cliente

1. **Camada de criptografia — `client/src/crypto/session.ts`**

   ```typescript
   // Mapa de sessões ativas: peerUserId → CryptoKey (AES-GCM)
   const sessions = new Map<string, CryptoKey>();

   /**
    * Deriva uma chave AES-GCM 256-bit a partir da chave privada local
    * e da chave pública do peer usando ECDH.
    */
   export async function deriveSessionKey(
     privateKey: CryptoKey,
     peerPublicKey: CryptoKey
   ): Promise<CryptoKey> {
     return crypto.subtle.deriveKey(
       {
         name: 'ECDH',
         public: peerPublicKey,
       },
       privateKey,
       {
         name: 'AES-GCM',
         length: 256,
       },
       false,       // non-extractable (chave de sessão não sai da memória)
       ['encrypt', 'decrypt']
     );
   }

   /**
    * Cria/armazena uma sessão criptográfica para um peer.
    */
   export function setSession(peerId: string, key: CryptoKey): void {
     sessions.set(peerId, key);
   }

   /**
    * Recupera a chave de sessão para um peer.
    */
   export function getSession(peerId: string): CryptoKey | undefined {
     return sessions.get(peerId);
   }

   /**
    * Verifica se existe sessão ativa para um peer.
    */
   export function hasSession(peerId: string): boolean {
     return sessions.has(peerId);
   }

   /**
    * Remove uma sessão específica.
    */
   export function removeSession(peerId: string): void {
     sessions.delete(peerId);
   }

   /**
    * Remove todas as sessões.
    */
   export function clearSessions(): void {
     sessions.clear();
   }

   /**
    * Lista todos os peers com sessão ativa.
    */
   export function getActiveSessions(): string[] {
     return Array.from(sessions.keys());
   }
   ```

2. **Inicialização de sessão sob demanda**

   Criar `client/src/crypto/session-init.ts` (ou integrar no hook useChat):

   ```typescript
   /**
    * Inicializa uma sessão criptográfica com um peer.
    * 
    * Fluxo:
    * 1. Carrega chave privada local
    * 2. Busca chave pública do peer no servidor
    * 3. Importa chave pública do peer
    * 4. Deriva chave de sessão via ECDH
    * 5. Armazena sessão em memória
    * 
    * Se já existe sessão, retorna imediatamente.
    */
   export async function ensureSession(
     currentUserId: string,
     peerId: string
   ): Promise<CryptoKey> {
     // 1. Se já tem sessão, retorna
     const existing = getSession(peerId);
     if (existing) return existing;

     // 2. Carrega chave privada local
     const privateKey = await loadPrivateKey(currentUserId);
     if (!privateKey) {
       throw new Error('No private key found. Please log in again.');
     }

     // 3. Busca chave pública do peer
     const { publicKey: peerPublicKeyBase64 } = await fetchPublicKey(peerId);

     // 4. Importa chave pública
     const peerPublicKey = await importPublicKey(peerPublicKeyBase64);

     // 5. Deriva chave de sessão
     const sessionKey = await deriveSessionKey(privateKey, peerPublicKey);

     // 6. Armazena sessão
     setSession(peerId, sessionKey);

     return sessionKey;
   }
   ```

   **Nota sobre importações:** `loadPrivateKey` e `importPublicKey` vêm de `keypair.ts` (Fase 2). `fetchPublicKey` vem de `api/http.ts` (Fase 2).

3. **Modificação no hook useChat**

   Em `client/src/hooks/useChat.tsx`, modificar a função `selectUser`:

   ```typescript
   const selectUser = useCallback(async (userId: string) => {
     setActiveUserId(userId);
     
     // Inicializa sessão criptográfica com o peer selecionado
     try {
       await ensureSession(currentUser!.id, userId);
       console.log(`[Chat] Session established with ${userId}`);
     } catch (err) {
       console.error(`[Chat] Failed to establish session with ${userId}:`, err);
       // Não impede o chat — fallback para texto puro (Fase 3 é preparatória)
     }
   }, [currentUser]);
   ```

4. **Limpeza de sessões no logout**

   Em `client/src/hooks/useAuth.tsx`, na função `logout`:

   ```typescript
   const logout = useCallback(() => {
     // Limpar sessões criptográficas da memória
     clearSessions();
     
     // ... resto do logout (limpar token, desconectar WS, etc.)
   }, []);
   ```

5. **Indicador visual de sessão (opcional)**

   Em `ChatHeader.tsx`, adicionar um indicador:
   - Cadeado verde ✓ se `hasSession(activeUserId)` for true.
   - Cadeado cinza ou ausente se não houver sessão.

   ```typescript
   // Em ChatHeader.tsx:
   import { hasSession } from '@/crypto/session';
   
   const isSecure = hasSession(peerId);
   // Renderizar ícone de cadeado se isSecure
   ```

---

## Estrutura de Arquivos ao Final da Fase

```
(adicionais/modificações sobre a Fase 2)

client/src/
├── crypto/
│   ├── keypair.ts            # Existente (Fase 2)
│   ├── session.ts            # NOVO: gerenciamento de sessões
│   └── session-init.ts       # NOVO: inicialização de sessão sob demanda
├── hooks/
│   ├── useAuth.tsx           # MODIFICADO: clearSessions() no logout
│   └── useChat.tsx           # MODIFICADO: ensureSession() ao selecionar usuário
├── components/
│   └── ChatHeader.tsx        # MODIFICADO: indicador visual de sessão
```

---

## Fluxo Detalhado

### Cenário: Alice inicia conversa com Bob (ambos online)

```
1. Alice faz login → chave privada carregada do localStorage.
2. Alice clica em "Bob" na lista de usuários.
3. useChat chama selectUser("bobId").
4. selectUser chama ensureSession("aliceId", "bobId").
5. ensureSession verifica: não há sessão para bobId.
6. Carrega chave privada da Alice (loadPrivateKey("aliceId")).
7. Busca chave pública do Bob no servidor: GET /api/users/bobId/key.
8. Importa chave pública do Bob: importPublicKey(base64).
9. Deriva chave de sessão: deriveSessionKey(alicePrivKey, bobPubKey) → CryptoKey (AES-GCM-256).
10. Armazena sessão: setSession("bobId", sessionKey).
11. UI mostra cadeado verde no ChatHeader.

[Quando Bob seleciona Alice para conversar — ou recebe uma mensagem dela:]
12. Bob clica em "Alice".
13. ensureSession("bobId", "aliceId").
14. Fetch public key da Alice.
15. DeriveSessionKey(bobPrivKey, alicePubKey) → MESMA CryptoKey.
16. setSession("aliceId", sessionKey).
```

### Propriedade fundamental do ECDH

```
deriveSessionKey(alicePriv, bobPub) === deriveSessionKey(bobPriv, alicePub)
```

Ambos derivam exatamente a mesma chave AES sem nunca compartilhá-la. Isso é garantido pela matemática do ECDH na curva P-256.

---

## Logs de Debug (console)

Para facilitar verificação durante o desenvolvimento, adicionar logs no módulo `session-init.ts`:

```typescript
console.log(`[Crypto] Ensuring session with ${peerId}...`);
console.log(`[Crypto] Session key derived successfully for ${peerId}`);
```

E no `ChatHeader.tsx`:

```typescript
console.log(`[Chat] Session status with ${peerId}: ${isSecure ? 'active' : 'inactive'}`);
```

---

## Edge Cases

### Peer não tem chave pública publicada

`GET /api/users/:id/key` retorna 404. `ensureSession` deve lançar erro claro: "Peer has no public key. They need to log in at least once."

### Chave privada local não encontrada

`loadPrivateKey` retorna null. `ensureSession` deve lançar: "No private key found. Please log in again."

### Sessão já existe (re-selecionar mesmo contato)

`getSession` retorna valor. `ensureSession` retorna imediatamente, sem novas requisições.

### Recarregar a página (perda das sessões em memória)

Após reload, o Map de sessões está vazio. Ao selecionar um contato novamente, `ensureSession` re-deriva a chave automaticamente:
1. Carrega privateKey do localStorage.
2. Busca publicKey do peer no servidor.
3. Deriva novamente.
4. Sessão restaurada.

Isso é transparente e rápido (milissegundos).

---

## Critérios de Aceitação

1. **Derivação correta:** Ao selecionar um contato, uma sessão é criada automaticamente.
2. **Mesma chave:** Alice e Bob derivam a mesma chave AES (verificável via console.log da chave exportada como JWK — apenas para debug, remover em produção).
3. **Sessão em memória:** Após derivar, `hasSession(peerId)` retorna true.
4. **Cache:** Selecionar o mesmo contato novamente NÃO gera novas requisições ao servidor (usa sessão em cache).
5. **Perda no reload:** Ao recarregar a página, as sessões somem da memória, mas são re-derivadas ao selecionar contatos novamente.
6. **Indicador visual:** Cadeado aparece no ChatHeader quando há sessão ativa.
7. **Limpeza no logout:** Ao fazer logout, todas as sessões são removidas da memória.
8. **Chat texto puro mantido:** As mensagens continuam sendo enviadas em texto puro (criptografia na Fase 4).

---

## Teste Manual da Fase 3

```bash
# Setup: Alice e Bob registrados e logados (Fases 1-2 completas)

# 1. Alice clica em Bob na lista de usuários
#    → Console: "[Crypto] Ensuring session with bobId..."
#    → Console: "[Crypto] Session key derived successfully for bobId"
#    → ChatHeader mostra 🔒 verde
#    → Verificar no console: exportKey('jwk', sessionKey) para Alice

# 2. Bob clica em Alice
#    → Mesmo processo
#    → Verificar no console: exportKey('jwk', sessionKey) para Bob
#    → COMPARAR: as JWKs devem ser IDÊNTICAS (mesma chave)

# 3. Alice clica em Bob novamente
#    → Console NÃO deve mostrar "Ensuring session..." (usa cache)

# 4. Alice recarrega a página
#    → Clica em Bob novamente
#    → Console deve mostrar "Ensuring session..." (re-derivação)

# 5. Alice faz logout
#    → Sessões limpas
#    → Login novamente → seleciona Bob → sessão re-derivada
```

---

## O que NÃO faz parte desta fase

- Criptografia de mensagens (AES-GCM encrypt/decrypt)
- Envio de mensagens criptografadas
- Rotação de chaves
- Múltiplas sessões simultâneas (já funciona, mas não testado a fundo)
- Histórico de chaves públicas
