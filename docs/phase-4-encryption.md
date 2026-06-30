# Fase 4 — Criptografia AES-GCM + Mensagens Criptografadas

## Pré-requisito

Fase 3 completa (sessões criptográficas derivadas via ECDH, armazenadas em memória, indicador visual de sessão ativa).

---

## Objetivo

Substituir o envio de mensagens em texto puro por mensagens criptografadas com AES-GCM 256-bit. O servidor passa a receber apenas ciphertext + IV, sem nunca ter acesso ao conteúdo. Toda criptografia/descriptografia ocorre no navegador.

---

## Escopo

### Cliente

1. **Camada de criptografia — `client/src/crypto/encryption.ts`**

   ```typescript
   const encoder = new TextEncoder();
   const decoder = new TextDecoder();

   /**
    * Criptografa uma string plaintext usando AES-GCM.
    * Retorna IV e ciphertext em base64.
    * O IV é gerado aleatoriamente (12 bytes = 96 bits, recomendado para GCM).
    */
   export async function encrypt(
     key: CryptoKey,
     plaintext: string
   ): Promise<{ iv: string; ciphertext: string }> {
     const iv = crypto.getRandomValues(new Uint8Array(12));
     const encoded = encoder.encode(plaintext);

     const ciphertext = await crypto.subtle.encrypt(
       {
         name: 'AES-GCM',
         iv,
       },
       key,
       encoded
     );

     return {
       iv: arrayBufferToBase64(iv.buffer),
       ciphertext: arrayBufferToBase64(ciphertext),
     };
   }

   /**
    * Descriptografa um ciphertext AES-GCM e retorna a string plaintext.
    */
   export async function decrypt(
     key: CryptoKey,
     iv: string,
     ciphertext: string
   ): Promise<string> {
     const ivBuffer = base64ToArrayBuffer(iv);
     const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

     const plaintext = await crypto.subtle.decrypt(
       {
         name: 'AES-GCM',
         iv: ivBuffer,
       },
       key,
       ciphertextBuffer
     );

     return decoder.decode(plaintext);
   }

   // ─── Helpers (podem ser compartilhados com keypair.ts) ───

   function arrayBufferToBase64(buffer: ArrayBuffer): string {
     const bytes = new Uint8Array(buffer);
     let binary = '';
     for (let i = 0; i < bytes.length; i++) {
       binary += String.fromCharCode(bytes[i]);
     }
     return btoa(binary);
   }

   function base64ToArrayBuffer(base64: string): ArrayBuffer {
     const binary = atob(base64);
     const bytes = new Uint8Array(binary.length);
     for (let i = 0; i < binary.length; i++) {
       bytes[i] = binary.charCodeAt(i);
     }
     return bytes.buffer;
   }
   ```

   **Refatoração opcional:** Mover `arrayBufferToBase64` e `base64ToArrayBuffer` para `client/src/crypto/utils.ts` já que são usados em `keypair.ts` e `encryption.ts`. Se fizer isso, atualizar imports em `keypair.ts`.

2. **Modificação no hook useChat — envio criptografado**

   Em `client/src/hooks/useChat.tsx`, modificar `sendMessage`:

   ```typescript
   import { encrypt } from '@/crypto/encryption';
   import { getSession } from '@/crypto/session';

   const sendMessage = useCallback(async (text: string) => {
     if (!activeUserId || !currentUser) return;

     // Obter chave de sessão
     const sessionKey = getSession(activeUserId);
     if (!sessionKey) {
       console.error('[Chat] No session key for', activeUserId);
       // Fallback: enviar em texto puro? NÃO — abortar.
       return;
     }

     // Criptografar
     const { iv, ciphertext } = await encrypt(sessionKey, text);

     // Enviar via WebSocket (formato criptografado)
     socketService.send({
       type: 'message',
       to: activeUserId,
       iv,
       ciphertext,
     });

     // Adicionar à lista local de mensagens (guardamos o plaintext + metadados)
     const message: Message = {
       id: crypto.randomUUID(),
       from: currentUser.id,
       to: activeUserId,
       plaintext: text,     // <-- mudou de "text" para "plaintext"
       timestamp: Date.now(),
       direction: 'sent',
     };
     setMessages(prev => [...prev, message]);
   }, [activeUserId, currentUser]);
   ```

3. **Modificação no hook useChat — recebimento descriptografado**

   No listener de mensagens WebSocket dentro de `useChat`:

   ```typescript
   import { decrypt } from '@/crypto/encryption';
   import { getSession, hasSession } from '@/crypto/session';
   import { ensureSession } from '@/crypto/session-init';

   // Dentro do useEffect que registra o listener do WebSocket:
   useEffect(() => {
     const unsubscribe = socketService.onMessage(async (data) => {
       if (data.type === 'message') {
         // Verificar/criar sessão com o remetente
         if (!hasSession(data.from)) {
           try {
             await ensureSession(currentUser!.id, data.from);
           } catch (err) {
             console.error('[Chat] Cannot decrypt: no session with', data.from, err);
             return;
           }
         }

         const sessionKey = getSession(data.from);
         if (!sessionKey) return;

         // Descriptografar
         let plaintext: string;
         try {
           plaintext = await decrypt(sessionKey, data.iv, data.ciphertext);
         } catch (err) {
           console.error('[Chat] Decryption failed:', err);
           plaintext = '[Mensagem não pôde ser descriptografada]';
         }

         const message: Message = {
           id: crypto.randomUUID(),
           from: data.from,
           to: currentUser!.id,
           plaintext,
           timestamp: data.timestamp,
           direction: 'received',
         };
         setMessages(prev => [...prev, message]);
       }
     });

     return unsubscribe;
   }, [currentUser]);
   ```

4. **Atualização do formato WebSocket Message**

   No cliente, `WsOutgoingMessage` muda de `{ type, to, text }` para `{ type, to, iv, ciphertext }`.

   No servidor, o formato de mensagem também muda.

5. **Atualização dos tipos no cliente**

   Em `client/src/types/index.ts`:

   ```typescript
   // Antigo (remover):
   // export interface WsOutgoingMessage {
   //   type: 'message';
   //   to: string;
   //   text: string;
   // }

   // Novo:
   export interface WsOutgoingMessage {
     type: 'message';
     to: string;
     iv: string;        // base64
     ciphertext: string; // base64
   }

   export interface WsIncomingMessage {
     type: 'message';
     from: string;
     iv: string;         // base64
     ciphertext: string; // base64
     timestamp: number;
   }

   export interface Message {
     id: string;
     from: string;
     to: string;
     plaintext: string;  // mudou de "text" para "plaintext"
     timestamp: number;
     direction: 'sent' | 'received';
   }
   ```

### Servidor

1. **Atualização do handler WebSocket**

   Em `server/src/ws/ws.handlers.ts`, modificar o handler de mensagem:

   ```typescript
   // Antigo:
   // if (data.type === 'message') {
   //   // encaminhar data.text
   // }

   // Novo:
   if (data.type === 'message') {
     const targetWs = connections.get(data.to);
     if (targetWs && targetWs.readyState === WebSocket.OPEN) {
       targetWs.send(JSON.stringify({
         type: 'message',
         from: userId,
         iv: data.iv,           // opaco para o servidor
         ciphertext: data.ciphertext, // opaco para o servidor
         timestamp: Date.now(),
       }));
     } else {
       ws.send(JSON.stringify({
         type: 'error',
         message: 'User offline',
       }));
     }
   }
   ```

2. **Atualização dos tipos no servidor**

   Em `server/src/types/index.ts`:

   ```typescript
   // Antigo (remover text):
   // export interface WsMessage {
   //   type: 'message';
   //   to: string;
   //   text: string;
   // }

   // Novo:
   export interface WsMessage {
     type: 'message';
     to: string;
     iv: string;         // base64 — servidor NÃO interpreta
     ciphertext: string; // base64 — servidor NÃO interpreta
   }

   export interface WsOutgoingMessage {
     type: 'message';
     from: string;
     iv: string;
     ciphertext: string;
     timestamp: number;
   }
   ```

   **Nota importante:** O servidor trata `iv` e `ciphertext` como strings opacas. NUNCA tenta decodificar, interpretar ou modificar esses campos.

3. **Validação no servidor (mínima)**

   Adicionar validação básica no handler para garantir que a mensagem tem os campos obrigatórios:

   ```typescript
   function isValidMessage(data: unknown): data is WsMessage {
     return (
       typeof data === 'object' &&
       data !== null &&
       'type' in data && data.type === 'message' &&
       'to' in data && typeof data.to === 'string' &&
       'iv' in data && typeof data.iv === 'string' &&
       'ciphertext' in data && typeof data.ciphertext === 'string'
     );
   }
   ```

---

## Estrutura de Arquivos ao Final da Fase

```
(adicionais/modificações sobre a Fase 3)

client/src/
├── crypto/
│   ├── keypair.ts            # Existente (Fase 2)
│   ├── session.ts            # Existente (Fase 3)
│   ├── session-init.ts       # Existente (Fase 3)
│   ├── encryption.ts         # NOVO
│   └── utils.ts              # NOVO (refatoração opcional dos helpers base64)
├── hooks/
│   └── useChat.tsx           # MODIFICADO: encrypt no send, decrypt no receive
├── components/
│   └── MessageBubble.tsx     # MODIFICADO: usar "plaintext" em vez de "text"
└── types/
    └── index.ts              # MODIFICADO: novos formatos de mensagem

server/src/
├── ws/
│   └── ws.handlers.ts        # MODIFICADO: encaminhar iv + ciphertext
└── types/
    └── index.ts              # MODIFICADO: novos tipos de mensagem
```

---

## Fluxo Detalhado de uma Mensagem Criptografada

```
Alice (remetente)                           Servidor                      Bob (destinatário)
──────────────────                           ───────                      ──────────────────
1. Digita "Olá Bob"

2. getSession("bobId")
   → CryptoKey AES-GCM

3. encrypt(sessionKey, "Olá Bob")
   → { iv: "AbCd...==", ciphertext: "XyZ0...==" }

4. socket.send({
     type: "message",
     to: "bobId",
     iv: "AbCd...==",
     ciphertext: "XyZ0...=="
   })
           │
           ▼
                           5. Recebe JSON
                           6. Valida campos
                           7. Busca WebSocket de bobId
                           8. Bob online? Sim.
                           9. Encaminha:
                              { type: "message",
                                from: "aliceId",
                                iv: "AbCd...==",
                                ciphertext: "XyZ0...==",
                                timestamp: 1719000000 }
                                     │
                                     ▼
                                                       10. Recebe mensagem
                                                       11. getSession("aliceId")
                                                           → CryptoKey AES-GCM
                                                       12. decrypt(sessionKey, iv, ciphertext)
                                                           → "Olá Bob"
                                                       13. Exibe "Olá Bob" na UI
```

Em **nenhum momento** o servidor vê "Olá Bob".

---

## Segurança do IV

- O IV (Initialization Vector) para AES-GCM deve ser:
  - **Único por mensagem** (nunca reutilizar com a mesma chave).
  - **Aleatório** (usando `crypto.getRandomValues`).
  - **12 bytes** (96 bits) — tamanho recomendado para GCM.
- O IV **não é secreto** — pode ser enviado em texto puro junto com o ciphertext. Sua única função é garantir que mensagens idênticas produzam ciphertexts diferentes.

---

## Tratamento de Erros de Descriptografia

Se a descriptografia falhar (ex: chave errada, ciphertext corrompido, IV reutilizado), `crypto.subtle.decrypt` lança exceção. O código deve capturar e exibir fallback:

```typescript
try {
  plaintext = await decrypt(sessionKey, data.iv, data.ciphertext);
} catch (err) {
  console.error('[Chat] Decryption failed:', err);
  plaintext = '[Mensagem não pôde ser descriptografada]';
}
```

---

## Critérios de Aceitação

1. **Envio criptografado:** Mensagens enviadas pela Alice chegam ao servidor como `{ iv, ciphertext }`. Verificar nos logs do servidor: NUNCA aparece o texto da mensagem.
2. **Recebimento descriptografado:** Bob recebe a mensagem e vê o texto original na UI.
3. **Servidor cego:** Inspecionar o código do servidor — não há chamada a `crypto.subtle.decrypt` nem tentativa de interpretar `iv`/`ciphertext`.
4. **IV único:** Cada mensagem tem um IV diferente (verificar nos payloads).
5. **Sessão automática no recebimento:** Se Bob recebe mensagem da Alice mas ainda não tinha sessão com ela, a sessão é criada automaticamente (via `ensureSession` no handler de recebimento).
6. **Erro de descriptografia tratado:** Se uma mensagem não puder ser descriptografada, o cliente mostra uma mensagem de erro amigável em vez de quebrar.
7. **Chat texto puro REMOVIDO:** Não é mais possível enviar mensagens em texto puro. O formato antigo `{ type, to, text }` não é mais aceito.
8. **Mensagem local:** Mensagens enviadas aparecem imediatamente na UI do remetente (usando o plaintext original, antes da resposta do servidor).

---

## Teste Manual da Fase 4

```bash
# Setup: Alice e Bob logados, sessão estabelecida (Fase 3)

# 1. Alice envia "Olá Bob"
#    → Alice vê "Olá Bob" na sua UI imediatamente
#    → Verificar console do servidor: recebeu { iv: "...", ciphertext: "..." }
#    → NENHUM log do servidor contém "Olá Bob"

# 2. Bob recebe a mensagem
#    → Bob vê "Olá Bob" na sua UI
#    → Console do Bob: mensagem descriptografada com sucesso

# 3. Testar IV único
#    → Alice envia "Olá Bob" de novo
#    → Comparar os IVs das duas mensagens (devem ser diferentes)
#    → Os ciphertexts também devem ser diferentes (mesmo plaintext, IV diferente)

# 4. Testar descriptografia com chave errada (simulação)
#    → No console do Bob, manualmente tentar decrypt com uma chave diferente
#    → Deve lançar erro

# 5. Testar sessão automática no recebimento
#    → Limpar sessões do Bob (clearSessions no console)
#    → Alice envia mensagem
#    → Bob recebe, sessão é recriada automaticamente, mensagem descriptografada

# 6. Verificar isolamento da criptografia
#    → Nenhum componente React importa diretamente crypto.subtle
#    → Nenhum componente React importa CryptoKey
#    → grep -r "crypto.subtle" client/src/components/ → vazio
#    → grep -r "CryptoKey" client/src/components/ → vazio
```

---

## O que NÃO faz parte desta fase

- Armazenamento de mensagens offline (servidor guardar mensagens criptografadas para entrega posterior)
- Reconexão automática
- Persistência de mensagens no cliente
- Rotação de chaves
- Múltiplas conversas simultâneas (funciona, mas não é o foco)
- Confirmação de entrega (delivery ack)
