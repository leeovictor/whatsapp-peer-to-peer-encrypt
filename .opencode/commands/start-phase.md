---
description: Inicia a implementação de uma fase do projeto Web Chat E2EE. Use quando o usuário disser "start-phase", "implementar fase", "iniciar fase", ou mencionar o número de uma fase.
agent: general
---

Você é um agente de implementação do projeto Web Chat com Criptografia de Ponta a Ponta (E2EE).

O usuário quer iniciar a implementação de uma fase com a seguinte mensagem: $ARGUMENTS

## Passo 1 — Identificar a fase

Com base na mensagem do usuário, determine qual fase deve ser implementada:

- **Fase 1** — palavras-chave: "fase 1", "phase 1", "foundation", "fundação", "login", "chat básico", "texto puro"
- **Fase 2** — palavras-chave: "fase 2", "phase 2", "keypair", "chaves", "public key", "ecdh"
- **Fase 3** — palavras-chave: "fase 3", "phase 3", "sessions", "sessões", "session key", "troca de chaves"
- **Fase 4** — palavras-chave: "fase 4", "phase 4", "encryption", "aes", "aes-gcm", "criptografia", "mensagens criptografadas"
- **Fase 5** — palavras-chave: "fase 5", "phase 5", "persistence", "offline", "reconexão", "reconnect"
- **Fase 6** — palavras-chave: "fase 6", "phase 6", "rotação", "rotation", "múltiplas conversas", "renovação"

Se a mensagem for ambígua, pergunte ao usuário qual fase ele deseja implementar listando as 6 opções com uma breve descrição de cada. Se for uma continuação (ex: "continua"), retome de onde parou.

## Passo 2 — Carregar o contexto

Leia **obrigatoriamente** estes dois arquivos ANTES de implementar:

1. `ARCHITECTURE.md` — stack, estrutura de diretórios, ADRs, convenções, API REST, contrato da camada crypto
2. `docs/phase-N-*.md` — o arquivo da fase identificada

Use `grep` para localizar o arquivo exato da fase se necessário: `grep -l "Fase N" docs/*.md`

## Passo 3 — Verificar pré-requisitos

O arquivo da fase lista um **Pré-requisito** no topo. Verifique se a fase anterior está completa:

- Liste os diretórios `client/src/` e `server/src/` para ver o que já existe.
- Compare com a seção "Estrutura de Arquivos Esperada ao Final da Fase" da fase anterior.
- Se algo estiver faltando, IMPLEMENTE o que falta da fase anterior antes de prosseguir.

Se for a Fase 1, não há pré-requisito — comece do zero criando o monorepo.

## Passo 4 — Implementar (seguindo o plano da fase)

Siga o arquivo `docs/phase-N-*.md` meticulosamente:

### Ordem de implementação

1. **Estrutura de diretórios** — crie todas as pastas necessárias primeiro (`mkdir -p`).
2. **Arquivos de configuração** — `package.json`, `tsconfig.json`, `vite.config.ts`, etc.
3. **Tipos TypeScript** — defina as interfaces em `types/index.ts` antes de implementar lógica.
4. **Módulos do servidor** — na ordem: stores → services → routers → ws handlers → index.ts.
5. **Módulos do cliente** — na ordem: types → api → crypto → store → hooks → components.
6. **Integração** — conecte tudo no entry point (`server/src/index.ts`, `client/src/App.tsx`).

### Regras durante a implementação

- **Sempre** use `Read` para ler qualquer arquivo antes de editá-lo com `Edit`.
- **Sempre** use `Edit` (não `Write`) para modificar arquivos existentes.
- Use `Write` apenas para criar arquivos NOVOS.
- Mantenha imports organizados (libs externas primeiro, depois módulos internos).
- Use `@/` alias no client (ex: `import { encrypt } from '@/crypto/encryption'`).
- **NUNCA** adicione comentários a menos que a fase explicitamente peça.
- Tipagem explícita de retorno em todas as funções exportadas.
- Logs no servidor prefixados com `[MODULE]` (ex: `[Auth]`, `[WS]`, `[Keys]`).

### Convenções do projeto (do ARCHITECTURE.md)

- `kebab-case.ts` para módulos, `PascalCase.tsx` para componentes React.
- TypeScript strict mode.
- Nada de `any` — use `unknown` quando necessário.
- Criptografia isolada: NENHUM componente React importa `crypto.subtle` ou `CryptoKey` diretamente.
- Servidor trata mensagens como opacas — nunca interpreta `iv` ou `ciphertext`.

## Passo 5 — Instalar dependências e verificar

Após criar todos os arquivos:

```bash
npm install
```

Se houver erros de tipo, compile para verificar:

```bash
npx tsc --noEmit -p server/tsconfig.json
npx tsc --noEmit -p client/tsconfig.json
```

Corrija quaisquer erros de compilação encontrados.

## Passo 6 — Verificar contra os critérios de aceitação

O arquivo da fase contém uma seção **"Critérios de Aceitação"**. Após implementar, faça uma auto-verificação:

- Abra cada arquivo criado/modificado e confirme que atende ao critério.
- Se houver uma seção **"Teste Manual"**, execute os passos descritos (inicie servidor e cliente, abra navegador, teste os cenários).
- Se algo falhar, corrija e verifique novamente.

## Passo 7 — Reportar conclusão

Ao finalizar, reporte ao usuário:

```
✅ Fase N concluída: <nome da fase>

Arquivos criados: N
Arquivos modificados: M

Resumo do que foi implementado:
- <item 1>
- <item 2>
- ...

Para testar:
  Terminal 1: npm run dev:server
  Terminal 2: npm run dev:client

⚠️ Lembre-se: reinicie o opencode para que as mudanças de config tenham efeito.
```

## Notas importantes

- Se o usuário pedir para "pular" ou "assumir" algo de uma fase anterior, AVISE que as fases são cumulativas e pular pode causar problemas, mas respeite a decisão.
- Se encontrar ambiguidade no plano da fase, PERGUNTE ao usuário em vez de assumir.
- Mantenha um `todowrite` atualizado durante toda a implementação.
- Se uma fase levar mais de 10 minutos, faça checkpoints intermediários informando o progresso.
