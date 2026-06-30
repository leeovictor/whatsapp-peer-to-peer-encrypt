---
name: e2ee-chat
description: Use when implementing or modifying the Web Chat E2EE project. Covers architecture, crypto layer isolation, project conventions, and phase-based implementation workflow.
---

# Web Chat E2EE — Project Skill

This skill provides reusable context for implementing any part of the End-to-End Encrypted Web Chat project.

## Project Reference Files

The project has two categories of reference documentation:

| File | Purpose |
|------|---------|
| `ARCHITECTURE.md` | Global architecture, stack, ADRs, API contract, data models, conventions |
| `docs/phase-N-name.md` | Detailed implementation plan for a specific phase |

**Always read both** before implementing anything. Use `grep -l "Fase N" docs/*.md` to find the correct phase file.

## Architecture Overview

```
Browser A → Crypto Layer → Server (dumb pipe) → Crypto Layer → Browser B
```

The server **never** possesses plaintext, private keys, or session keys. It only handles:
- JWT authentication
- Public key storage
- WebSocket message routing
- Offline message queue

## Technology Stack

- **Frontend**: React 18, Vite, TypeScript (strict)
- **Backend**: Node.js, Express, ws, TypeScript (strict)
- **Crypto**: Web Crypto API (SubtleCrypto) — browser-native
- **Auth**: JWT (jsonwebtoken), bcrypt for passwords
- **Storage**: In-memory Maps on server, localStorage on client
- **Monorepo**: npm workspaces

## Crypto Layer Isolation (CRITICAL)

The crypto layer at `client/src/crypto/` is **completely isolated** from the UI.

```
client/src/crypto/
├── keypair.ts      # ECDH P-256 key generation, export/import
├── session.ts      # Session derivation & in-memory cache
└── encryption.ts   # AES-GCM encrypt/decrypt
```

### Golden Rule

**No file outside `client/src/crypto/` may import `crypto.subtle` or types like `CryptoKey`, `CryptoKeyPair`.**

UI components only interact with the crypto layer through high-level functions that return plain strings (base64):

- `encrypt(key, plaintext) → { iv: string, ciphertext: string }`
- `decrypt(key, iv, ciphertext) → string`
- `hasSession(peerId) → boolean`

## ADRs (Architecture Decision Records)

1. **CryptoKey in memory**: Session keys (AES CryptoKey) live only in `Map<string, CryptoKey>`. Re-derived on page reload from localStorage private key + server public key.
2. **Single WebSocket**: One WS connection per client, multiplexed by `to`/`from` fields.
3. **No database**: All server data in memory (Maps). Restart = data loss.
4. **No shared/ package**: Types duplicated between client/server, kept manually in sync.
5. **bcrypt**: Password hashing with salt rounds = 10.
6. **JWT without refresh**: 24h expiration, no refresh token.

## Code Conventions

- **File naming**: `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- **Imports**: Use `@/` alias in client (via Vite resolve alias), avoid deep `../` relative paths
- **Return types**: All exported functions must have explicit return type annotations
- **No `any`**: Use `unknown` where needed
- **No unnecessary comments**: Code should be self-explanatory
- **Server logs**: Prefix with `[MODULE]` — e.g., `[Auth]`, `[WS]`, `[Keys]`

## Project Startup

```bash
npm install            # Install dependencies (monorepo root)
npm run dev:server     # Start backend on port 3001
npm run dev:client     # Start frontend on port 5173
```

## Phase Structure

Each phase in `docs/` follows this structure:

- **Pré-requisito**: Which phase must be complete first
- **Objetivo**: What this phase achieves
- **Escopo**: Exact files to create/modify, with code references
- **Estrutura de Arquivos ao Final**: Complete file tree after implementation
- **Fluxo Detalhado**: ASCII diagrams of data flow
- **Edge Cases**: Known corner cases and their handling
- **Critérios de Aceitação**: Verifiable completion criteria
- **Teste Manual**: Step-by-step manual test procedure
- **O que NÃO faz parte**: Explicit scope boundaries

## Implementation Order Within a Phase

1. Directory structure (`mkdir -p`)
2. Config files (`package.json`, `tsconfig.json`, `vite.config.ts`)
3. TypeScript types (`types/index.ts`)
4. Server modules: stores → services → routers → ws handlers → index.ts
5. Client modules: types → api → crypto → store → hooks → components
6. Integration (entry points)
7. `npm install` → verify compilation → manual test

## Tool Usage Rules

- **Read first, then Edit**: Never edit a file without reading it first
- **Edit for modifications**: Use Edit tool to modify existing files
- **Write for new files**: Only use Write for files that don't exist yet
- **Batch independent operations**: Run multiple Read/Write/Glob/Grep calls in parallel
- **Verify**: After implementation, run TypeScript compiler to check for type errors
