# FlowSnyker — Modelagem de Ameaças (Threat Model)

## 1. Ativos Protegidos

| Ativo | Criticidade | Descrição |
|-------|:-----------:|-----------|
| Credenciais de usuário | 🔴 Crítica | Senhas (hash Argon2id), tokens JWT |
| Dados de boards/cards | 🟡 Alta | Conteúdo do workspace do usuário |
| Tokens de sessão | 🔴 Crítica | Access token (memória) + Refresh token (cookie HttpOnly) |
| Chaves de API | 🔴 Crítica | JWT_SECRET, MONGODB_URI, RESEND_API_KEY |

## 2. Atores

| Ator | Nível de Acesso | Motivação |
|------|:---------------:|-----------|
| Usuário anônimo | Nenhum | Criar conta, recuperar senha |
| Usuário autenticado | Boards de que é membro | Gerenciar cards, convidar membros |
| Board owner | Board específico | Editar, deletar board |
| Atacante externo | Nenhum | Exfiltrar dados, escalar privilégios |

## 3. Superfícies de Ataque

### 3.1 Autenticação
| Ameaça | Mitigação | Status |
|--------|-----------|:------:|
| Força bruta de senha | Rate limit (5/min) + Lockout (15 min após 5 falhas) | ✅ |
| Senhas fracas | Política: 8+ chars, maiúscula, minúscula, número | ✅ |
| Hash inseguro | Argon2id (migração transparente de bcrypt) | ✅ |
| Token theft (XSS) | Access token em memória, não localStorage | ✅ |
| Refresh token theft | Cookie HttpOnly + Secure + SameSite + Rotation | ✅ |
| Refresh token reuse | Detecção de reuso → revoga toda a família | ✅ |

### 3.2 Autorização
| Ameaça | Mitigação | Status |
|--------|-----------|:------:|
| IDOR em boards | `requireBoardAccess` middleware em TODAS as rotas | ✅ |
| IDOR em cards | `assertCardAccess` verifica membership no board do card | ✅ |
| Socket hijacking | `assertCanAccessBoard` em TODOS os 7 handlers | ✅ |
| Unauthorized room join | `board:join` valida membership ANTES de `socket.join()` | ✅ |
| Privilege escalation | `requireBoardOwner` para operações destrutivas | ✅ |

### 3.3 Injeção
| Ameaça | Mitigação | Status |
|--------|-----------|:------:|
| NoSQL Injection | Mongoose ORM + Zod validation + mongo-sanitize | ✅ |
| XSS | Helmet CSP + input sanitization | ✅ |
| Path traversal | WAF middleware com pattern detection | ✅ |

### 3.4 Rede / Infraestrutura
| Ameaça | Mitigação | Status |
|--------|-----------|:------:|
| DDoS | Rate limiting (100/min geral, 5/min auth) | ✅ |
| Scanner/bot probing | WAF auto-blacklist + scanner detection | ✅ |
| CSRF no refresh | Origin header validation | ✅ |
| Server fingerprinting | `obfuscateServer` remove headers identificadores | ✅ |
| Man-in-the-Middle | HSTS + TLS enforced (Render HTTPS) | ✅ |

## 4. Riscos Residuais (Aceitos)

| Risco | Justificativa |
|-------|---------------|
| Sem MFA/2FA | Escopo do projeto atual; pode ser adicionado futuramente |
| Sem audit log persistente | Logs estruturados via stdout cobrem para o momento |
| Sem encrypting at rest | MongoDB Atlas já provê encryption at rest por padrão |
| Sem WAF de terceiro | WAF custom no Express cobre os principais vetores |

## 5. Fluxo de Autenticação

```
[Register] → Argon2id hash → DB → Access Token (15m) + Refresh Cookie (7d)
[Login]    → Argon2id verify (bcrypt fallback) → Tokens
[Refresh]  → CSRF check → Rotation → Old token revoked → New tokens
[Reuse]    → Detect → Revoke ENTIRE family → Force re-login
[Lockout]  → 5 failures → 15 min block
```
