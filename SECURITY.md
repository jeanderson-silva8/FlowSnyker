# Política de Segurança — FlowSnyker

## Versões Suportadas

| Versão | Suportada |
|--------|:---------:|
| 1.x (main) | ✅ |
| < 1.0 | ❌ |

## Reportando Vulnerabilidades

Se você encontrar uma vulnerabilidade de segurança no FlowSnyker, **NÃO** abra uma issue pública.

### Canal de Reporte

Envie um email para: **security@flowsnyker.dev** (ou o email do maintainer)

### O que incluir no reporte

1. **Descrição** — O que é a vulnerabilidade
2. **Passos para reproduzir** — Como explorar
3. **Impacto** — O que um atacante poderia fazer
4. **Severidade estimada** — Crítica / Alta / Média / Baixa

### Prazo de Resposta

| Etapa | Prazo |
|-------|-------|
| Confirmação de recebimento | 48h |
| Avaliação inicial | 7 dias |
| Fix (vulnerabilidade crítica) | 14 dias |
| Fix (vulnerabilidade não-crítica) | 30 dias |

### Política de Disclosure

- **Responsible Disclosure**: Pedimos que aguarde o fix antes de divulgar publicamente.
- Daremos crédito ao reporter no changelog (a menos que prefira anonimato).

## Medidas de Segurança Implementadas

- 🔐 Hash de senhas com **Argon2id** (OWASP recomendado)
- 🔄 **Refresh token rotation** com detecção de reuso
- 🛡️ **WAF custom** com auto-blacklist
- 🔒 **CORS estrito** + Helmet + CSP
- ✅ **Autorização por board** em todas as rotas e sockets
- 📝 **Validação Zod** em HTTP e WebSocket
- 🚫 **Rate limiting** + Account lockout
- 📊 **Logging estruturado** com redação de dados sensíveis
