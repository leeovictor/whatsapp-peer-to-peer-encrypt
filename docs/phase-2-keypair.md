# Fase 2 — Geração de KeyPair + Publicação de Chaves Públicas

## Pré-requisito

Fase 1 completa e funcional (chat texto puro com auth, WebSocket e lista de usuários).

---

## Objetivo

Adicionar geração de pares de chaves ECDH no cliente e infraestrutura no servidor para armazenar e distribuir chaves públicas. O chat ainda funciona em texto puro — a criptografia será integrada nas fases 3 e 4.

---

## Escopo

### Servidor

1. **Armazenamento de chaves públicas**
   - `server/src/keys/keys.store.ts`:
     - `Map<userId, publicKeyBase64>`.
     - `setPublicKey(userId, publicKey): void`
     - `getPublicKey(userId): string | undefined`
     - `removePublicKey(userId): void` (para quando usuário é removido — fase futura)

2. **Endpoints de chave pública**
   - `server/src/keys/keys.router.ts`:
     - `PUT /api/keys` — autenticado. Body: `{ publicKey: string }`. Salva/atualiza chave pública do usuário logado. Retorna `{ success: true }`.
     - `GET /api/users/:id/key` — autenticado. Retorna `{ publicKey: string }` ou 404 se usuário não tem chave publicada.

3. **Registro no server index**
   - Adicionar `app.use('/api', keysRouter)` em `server/src/index.ts`.

4. **Tipos adicionais**
   - `PublicKeyEntry { userId: string, publicKey: string }` em `server/src/types/index.ts`.

### Cliente

1. **Camada de criptografia — `client/src/crypto/keypair.ts`**

   Esta é a PRIMEIRA peça da camada de criptografia isolada. Deve ser implementada sem dependências de React ou da UI.

   ```typescript
   // Gera par de chaves ECDH usando curva P-256
   export async function generateKeyPair(): Promise<CryptoKeyPair> {
     return crypto.subtle.generateKey(
       { name: 'ECDH', namedCurve: 'P-256' },
       true,              // extractable: true (precisamos exportar a pública e a privada)
       ['deriveKey']      // key usages
     );
   }

   // Exporta chave pública como ArrayBuffer e converte para base64
   export async function exportPublicKey(key: CryptoKey): Promise<string> {
     const raw = await crypto.subtle.exportKey('raw', key);
     return arrayBufferToBase64(raw);
   }

   // Importa chave pública a partir de base64
   export async function importPublicKey(base64: string): Promise<CryptoKey> {
     const raw = base64ToArrayBuffer(base64);
     return crypto.subtle.importKey(
       'raw',
       raw,
       { name: 'ECDH', namedCurve: 'P-256' },
       true,
       []  // sem usages — só serve para deriveKey
     );
   }

   // Salva chave privada no localStorage como JWK
   export async function storePrivateKey(key: CryptoKey): Promise<void> {
     const jwk = await crypto.subtle.exportKey('jwk', key);
     localStorage.setItem('privateKeyJwk', JSON.stringify(jwk));
   }

   // Carrega chave privada do localStorage
   export async function loadPrivateKey(): Promise<CryptoKey | null> {
     const stored = localStorage.getItem('privateKeyJwk');
     if (!stored) return null;
     const jwk = JSON.parse(stored);
     return crypto.subtle.importKey(
       'jwk',
       jwk,
       { name: 'ECDH', namedCurve: 'P-256' },
       true,
       ['deriveKey']
     );
   }

   // ─── Helpers internos (não exportados ou exportados como utils) ───

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

2. **Módulo de API — adicionar endpoint de chave pública**

   Em `client/src/api/http.ts`, adicionar:

   ```typescript
   export const publishPublicKey = (publicKey: string) =>
     request<{ success: boolean }>('PUT', '/keys', { publicKey });

   export const fetchPublicKey = (userId: string) =>
     request<{ publicKey: string }>('GET', `/users/${userId}/key`);
   ```

3. **Hook de autenticação — integrar geração de chave no login/registro**

   Em `client/src/hooks/useAuth.tsx`, modificar:

   - Após login ou registro bem-sucedido:
     1. Verificar se já existe chave privada no localStorage (`loadPrivateKey()`).
     2. Se não existe: gerar novo par (`generateKeyPair()`).
     3. Salvar chave privada (`storePrivateKey()`).
     4. Exportar chave pública (`exportPublicKey()`).
     5. Publicar no servidor (`publishPublicKey()` via HTTP).

   - Isso garante que todo usuário logado SEMPRE tem uma chave pública publicada no servidor.

   - **Edge case:** Se o token expirou e o usuário faz login novamente, a chave privada já existe no localStorage → não gerar novo par, apenas republicar a chave pública (garantir que o servidor tem a chave atual).

4. **Tipos adicionais no cliente**

   Em `client/src/types/index.ts`, adicionar (se ainda não existir):

   ```typescript
   export interface PublicKeyResponse {
     publicKey: string;
   }
   ```

---

## Estrutura de Arquivos Esperada ao Final da Fase

```
(adicionais/modificações sobre a Fase 1)

server/src/
├── keys/
│   ├── keys.router.ts          # NOVO
│   └── keys.store.ts           # NOVO
├── types/
│   └── index.ts                # MODIFICADO: adicionar PublicKeyEntry
└── index.ts                    # MODIFICADO: adicionar keysRouter

client/src/
├── crypto/                     # NOVO diretório
│   └── keypair.ts              # NOVO
├── api/
│   └── http.ts                # MODIFICADO: publishPublicKey, fetchPublicKey
├── hooks/
│   └── useAuth.tsx            # MODIFICADO: integração com keypair no login/registro
└── types/
    └── index.ts                # MODIFICADO: adicionar PublicKeyResponse
```

---

## Fluxo Detalhado

### Cenário 1: Usuário novo (primeiro registro)

```
1. Usuário preenche formulário de registro.
2. Client chama POST /api/auth/register.
3. Servidor cria usuário, retorna { token, user }.
4. useAuth recebe resposta.
5. Verifica localStorage → sem privateKey.
6. Chama generateKeyPair() → { publicKey: CryptoKey, privateKey: CryptoKey }.
7. Chama storePrivateKey(privateKey) → salva JWK no localStorage.
8. Chama exportPublicKey(publicKey) → "base64string...".
9. Chama publishPublicKey("base64string...") → PUT /api/keys.
10. Servidor armazena chave pública.
11. Usuário está pronto para conversar (chat texto puro ainda).
```

### Cenário 2: Usuário retornando (login)

```
1. Usuário faz login.
2. Client chama POST /api/auth/login.
3. Servidor valida e retorna { token, user }.
4. useAuth recebe resposta.
5. Verifica localStorage → privateKey existe.
6. Chama loadPrivateKey() → CryptoKey.
7. Exporta publicKey da chave carregada → exportPublicKey(privateKey.publicKey? NÃO, precisa ser o par).
   NOTA: CryptoKeyPair não é armazenado. Mas podemos exportar a chave pública a partir da privada?
   NÃO — Web Crypto API não permite derivar a pública da privada diretamente.
   
   SOLUÇÃO: Armazenar a chave pública também no localStorage (como base64).
   Adicionar em keypair.ts:
   
   export async function storePublicKeyBase64(base64: string): Promise<void> {
     localStorage.setItem('publicKeyBase64', base64);
   }
   
   export function loadPublicKeyBase64(): string | null {
     return localStorage.getItem('publicKeyBase64');
   }
   
   No fluxo de registro: após exportPublicKey, chamar storePublicKeyBase64.
   
   No fluxo de login:
   - Carregar privateKey.
   - Carregar publicKeyBase64.
   - Se publicKeyBase64 existe: chamar publishPublicKey(publicKeyBase64) para garantir que o servidor tem a versão mais recente.
   - Se não existe (corner case): gerar novo par.
```

### Cenário 3: Usuário faz logout e login com outra conta no mesmo browser

```
1. Ao fazer logout: NÃO limpar chaves do localStorage (elas são do usuário anterior? Não, são do browser).
   SOLUÇÃO: namespace as chaves por userId.
   
   Modificar keypair.ts:
   - storePrivateKey(userId, key): localStorage.setItem(`privateKey:${userId}`, jwk)
   - loadPrivateKey(userId): localStorage.getItem(`privateKey:${userId}`)
   - storePublicKeyBase64(userId, base64): localStorage.setItem(`publicKey:${userId}`, base64)
   - loadPublicKeyBase64(userId): localStorage.getItem(`publicKey:${userId}`)
```

---

## Decisões de Design

### Chave pública também armazenada localmente

A Web Crypto API não permite derivar a chave pública a partir da chave privada no formato ECDH. Por isso, após exportar a chave pública, também a armazenamos em localStorage (como base64) junto com a chave privada (como JWK).

### Namespace por userId

Como um mesmo navegador pode ser usado por múltiplos usuários, as chaves no localStorage são prefixadas com o userId: `privateKey:${userId}`, `publicKey:${userId}`.

### Chave pública no servidor é sobrescrita

`PUT /api/keys` sempre sobrescreve. Não há versionamento ainda (isso virá na Fase 6).

---

## Critérios de Aceitação

1. **Geração no registro:** Ao registrar novo usuário, um KeyPair ECDH P-256 é gerado e a chave pública é enviada ao servidor.
2. **Persistência local:** Chave privada (JWK) e chave pública (base64) são salvas no localStorage com namespace por userId.
3. **Recuperação no login:** Ao fazer login com um usuário já registrado, a chave privada é carregada do localStorage e a chave pública é republicada no servidor.
4. **Endpoint de consulta:** `GET /api/users/:id/key` retorna a chave pública do usuário (base64).
5. **Verificação no servidor:** O servidor armazena apenas a chave pública; nunca recebe ou armazena a chave privada.
6. **Chat texto puro mantido:** O chat existente da Fase 1 continua funcionando normalmente (a criptografia ainda não está ativa).
7. **Múltiplos usuários no mesmo browser:** Fazer logout do usuário A, registrar usuário B → cada um tem suas próprias chaves isoladas no localStorage.

---

## Teste Manual da Fase 2

```bash
# Garantir que servidor e cliente estão rodando

# 1. Registrar Alice
#    → Verificar no console do navegador: chave privada salva em localStorage
#    → Fazer GET /api/users/:aliceId/key → deve retornar chave pública base64

# 2. Registrar Bob
#    → Mesma verificação

# 3. Fazer logout da Alice, limpar localStorage (simular novo browser)
#    → Fazer login da Alice
#    → Verificar que chave privada foi carregada do localStorage
#    → Verificar que chave pública foi republicada

# 4. Testar GET /api/users/bobId/key como Alice
#    → Deve retornar a chave pública do Bob

# 5. Chat texto puro continua funcionando entre Alice e Bob
```

---

## O que NÃO faz parte desta fase

- Derivação de chave de sessão (ECDH)
- Criptografia de mensagens
- Uso da chave pública para qualquer operação criptográfica
- Rotação de chaves
- Interface visual para chaves (tudo é transparente para o usuário)
