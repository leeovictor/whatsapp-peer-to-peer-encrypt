# Web Chat E2EE

Projeto de estudo para compreensão de mecanismos de criptografia em aplicações web.

Chat web com criptografia de ponta a ponta (E2EE). O servidor atua apenas como intermediário de transporte — toda criptografia acontece exclusivamente nos navegadores dos clientes.

## Testar Online

[https://e2ee-chat-w82o.onrender.com](https://e2ee-chat-w82o.onrender.com)

## Funcionamento

```mermaid
flowchart TD
    subgraph BA["🧑 Browser A"]
        A1["1. Gera KeyPair ECDH P-256"]
        A2["2. Chave privada → localStorage"]
        A3["3. Chave pública → servidor"]
        A4["4. Busca pubKey do peer B"]
        A5["5. ECDH(privA + pubB) → AES-256"]
        A6["6. AES-GCM('Olá') → {iv, ciphertext}"]
    end

    subgraph BB["🧑 Browser B"]
        B1["1. Gera KeyPair ECDH P-256"]
        B2["2. Chave privada → localStorage"]
        B3["3. Chave pública → servidor"]
        B4["4. Busca pubKey do peer A"]
        B5["5. ECDH(privB + pubA) → AES-256"]
        B6["6. AES-GCM decrypt → 'Olá'"]
    end

    subgraph S["☁️ Servidor (dumb pipe)"]
        direction TB
        S1["Autenticação JWT"]
        S2["Armazena chaves públicas"]
        S3["Roteia mensagens via WS"]
        S4["Fila de mensagens offline"]
        S5["❌ NUNCA conhece:<br/>chaves privadas / sessão AES / conteúdo"]
    end

    A3 --> S2
    B3 --> S2
    A4 --> S2
    B4 --> S2
    A6 --> S3
    S3 --> B6
```

## Funcionalidades

- Autenticação com JWT (registro e login)
- Geração de par de chaves ECDH P-256 no cliente
- Derivação de chave de sessão AES-GCM via ECDH
- Criptografia e descriptografia AES-GCM
- Troca de mensagens em tempo real via WebSocket
- Fila de mensagens offline
- Persistência de chave privada e sessões no localStorage

## Stack

| Camada       | Tecnologia                       |
|-------------|----------------------------------|
| Frontend    | React 18, Vite, TypeScript       |
| Backend     | Node.js, Express, ws, TypeScript |
| Criptografia| Web Crypto API (SubtleCrypto)    |
| Autenticação| JWT, bcrypt                      |
| Hospedagem  | Render                           |

## Executar Localmente

```bash
npm install
npm run dev:server   # Backend em http://localhost:3001
npm run dev:client   # Frontend em http://localhost:5173
```

## Estrutura

```
client/src/
├── api/        # HTTP + WebSocket
├── auth/       # Estado de autenticação
├── crypto/     # Camada isolada de criptografia
├── store/      # localStorage
├── hooks/      # React hooks
├── components/ # UI
└── types/

server/src/
├── auth/       # Registro/login
├── users/      # Gerenciamento de usuários
├── keys/       # Chaves públicas
├── messages/   # Roteamento e fila offline
├── ws/         # WebSocket
└── middleware/
```
