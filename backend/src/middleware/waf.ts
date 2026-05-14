import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════════════
// 🛡️ WAF (Web Application Firewall) — Nível Enterprise
// ═══════════════════════════════════════════════════════════════════
// Camada de defesa perimetral que intercepta e bloqueia requisições
// maliciosas ANTES que elas atinjam qualquer middleware ou rota.
//
// Cobre: XSS, Path Traversal, Scanner/Bot Blocking, HTTP Method
// Restriction, Header Anomaly Detection, IP Auto-Blacklist e
// Server Fingerprint Obfuscation.
// ═══════════════════════════════════════════════════════════════════

// ─── Auto-Blacklist (IPs bloqueados temporariamente) ─────────────
const blacklist = new Map<string, { until: number; reason: string }>();
const strikes = new Map<string, { count: number; resetAt: number }>();

const STRIKE_THRESHOLD = 10;        // Bloqueia após 10 tentativas maliciosas
const STRIKE_WINDOW_MS = 60_000;    // Janela de 1 minuto
const BLACKLIST_DURATION_MS = 15 * 60_000; // Banido por 15 minutos

// Auto-cleanup a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of blacklist) {
    if (now > entry.until) blacklist.delete(ip);
  }
  for (const [ip, entry] of strikes) {
    if (now > entry.resetAt) strikes.delete(ip);
  }
}, 5 * 60_000);

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function addStrike(ip: string, reason: string): boolean {
  const now = Date.now();
  const entry = strikes.get(ip) || { count: 0, resetAt: now + STRIKE_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + STRIKE_WINDOW_MS;
  }
  entry.count++;
  strikes.set(ip, entry);

  if (entry.count >= STRIKE_THRESHOLD) {
    blacklist.set(ip, { until: now + BLACKLIST_DURATION_MS, reason });
    strikes.delete(ip);
    logger.warn('WAF: IP auto-blacklisted', { ip: ip.substring(0, 8) + '***', reason });
    return true; // IP was blacklisted
  }
  return false;
}

// ─── 1. Blocked User-Agents (Scanners, Exploit Tools, Bots) ─────
const BLOCKED_UA_PATTERNS = [
  // Vulnerability scanners
  /nikto/i, /sqlmap/i, /nmap/i, /masscan/i, /nessus/i, /openvas/i,
  /acunetix/i, /burpsuite/i, /w3af/i, /arachni/i, /skipfish/i,
  /gobuster/i, /dirbuster/i, /wfuzz/i, /ffuf/i, /nuclei/i,
  // Exploit frameworks
  /metasploit/i, /hydra/i, /medusa/i, /havij/i,
  // Malicious crawlers
  /zgrab/i, /censys/i, /semrush/i, /ahref/i, /mj12bot/i,
  /dotbot/i, /blexbot/i, /petalbot/i,
  // Generic attack tools
  /python-requests\/[0-9]/i, /go-http-client/i, /curl\/[0-9]/i,
  /libwww-perl/i, /lwp-trivial/i, /wget\/[0-9]/i,
  /httpie/i, /scrapy/i, /phantom/i, /headless/i,
];

// ─── 2. Path Traversal Patterns ──────────────────────────────────
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.[/\\]/,                   // ../  ..\
  /\.\.[/\\]\.\.[/\\]/,         // ../../
  /%2e%2e[/\\%]/i,              // URL-encoded ../
  /%252e%252e/i,                // Double-encoded ../
  /\/etc\/(passwd|shadow|hosts)/i,
  /\/proc\/(self|version)/i,
  /\/windows\/(system32|win\.ini)/i,
  /\/(\.env|\.git|\.svn|\.htaccess|\.DS_Store)/i,
  /\/wp-admin|\/wp-login|\/wp-content/i,       // WordPress probing
  /\/phpmyadmin|\/pma|\/adminer|\/dbadmin/i,    // DB admin probing
  /\/cgi-bin|\/\.well-known\/security/i,
  /\/actuator|\/swagger|\/graphiql/i,           // Framework probing
];

// ─── 3. XSS Payload Patterns ─────────────────────────────────────
const XSS_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /on(load|error|click|mouseover|focus|blur|submit|change|input|keyup|keydown)\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /<svg[\s>].*?on\w+\s*=/i,
  /expression\s*\(/i,           // CSS expression()
  /url\s*\(\s*['"]?\s*javascript/i,
  /data\s*:\s*text\/html/i,     // data:text/html injection
  /vbscript\s*:/i,
];

// ─── 4. SQL/NoSQL Injection Patterns ─────────────────────────────
const INJECTION_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|alter|create|truncate|exec|execute)\b.*\b(from|into|table|database|where|set)\b)/i,
  /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,           // OR 1=1, AND 1=1
  /(--|#|\/\*|\*\/)/,                             // SQL comments
  /'\s*(or|and)\s+'[^']*'\s*=\s*'[^']*'/i,      // ' OR '1'='1'
  /(\$where|\$regex|\$ne|\$gt|\$lt|\$gte|\$lte|\$nin|\$in|\$exists)/i, // MongoDB operators
  /\{\s*['"]\$\w+['"]\s*:/,                      // {"$operator": value}
];

// ─── 5. Blocked HTTP Methods ─────────────────────────────────────
const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

// ─── Deep Scan: recursively check all string values in an object ──
function deepScanObject(obj: unknown, patterns: RegExp[]): string | null {
  if (typeof obj === 'string') {
    for (const pattern of patterns) {
      if (pattern.test(obj)) return pattern.source;
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const match = deepScanObject(item, patterns);
      if (match) return match;
    }
    return null;
  }
  if (obj && typeof obj === 'object') {
    for (const value of Object.values(obj)) {
      const match = deepScanObject(value, patterns);
      if (match) return match;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// 🔥 MAIN WAF MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════
export const wafMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const ip = getClientIp(req);

  // ── 0. Check Blacklist ──────────────────────────────────────────
  const banned = blacklist.get(ip);
  if (banned && Date.now() < banned.until) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // ── 1. HTTP Method Restriction ──────────────────────────────────
  if (!ALLOWED_METHODS.has(req.method.toUpperCase())) {
    logger.warn('WAF: Blocked HTTP method', { method: req.method });
    addStrike(ip, `blocked-method:${req.method}`);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // ── 2. User-Agent Analysis ──────────────────────────────────────
  const userAgent = req.headers['user-agent'] || '';
  if (!userAgent && req.method !== 'OPTIONS') {
    // Missing UA on non-preflight = suspicious
    addStrike(ip, 'missing-user-agent');
  }
  for (const pattern of BLOCKED_UA_PATTERNS) {
    if (pattern.test(userAgent)) {
      logger.warn('WAF: Blocked scanner/bot', { pattern: pattern.source });
      addStrike(ip, `blocked-ua:${pattern.source}`);
      res.status(403).json({ error: 'Access denied' });
      return;
    }
  }

  // ── 3. Path Traversal Detection ─────────────────────────────────
  const fullPath = decodeURIComponent(req.originalUrl || req.url);
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(fullPath)) {
      logger.warn('WAF: Path traversal blocked', { path: fullPath.substring(0, 50) });
      addStrike(ip, 'path-traversal');
      res.status(403).json({ error: 'Access denied' });
      return;
    }
  }

  // ── 4. XSS Detection (URL + Query + Body) ──────────────────────
  // Scan URL
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(fullPath)) {
      logger.warn('WAF: XSS in URL blocked');
      addStrike(ip, 'xss-url');
      res.status(403).json({ error: 'Access denied' });
      return;
    }
  }

  // Scan query params
  const queryMatch = deepScanObject(req.query, XSS_PATTERNS);
  if (queryMatch) {
    logger.warn('WAF: XSS in query blocked');
    addStrike(ip, 'xss-query');
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  // Scan body (only if parsed — runs after express.json())
  if (req.body && typeof req.body === 'object') {
    const bodyXss = deepScanObject(req.body, XSS_PATTERNS);
    if (bodyXss) {
      logger.warn('WAF: XSS in body blocked');
      addStrike(ip, 'xss-body');
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // ── 5. SQL/NoSQL Injection Detection (Body) ──────────────────
    const bodyInjection = deepScanObject(req.body, INJECTION_PATTERNS);
    if (bodyInjection) {
      logger.warn('WAF: Injection in body blocked');
      addStrike(ip, 'injection-body');
      res.status(403).json({ error: 'Access denied' });
      return;
    }
  }

  // ── 6. Header Anomaly Detection ─────────────────────────────────
  // Oversized headers (potential buffer overflow attempt)
  const headerSize = JSON.stringify(req.headers).length;
  if (headerSize > 16_384) { // 16KB max header size
    logger.warn('WAF: Oversized headers blocked', { size: headerSize });
    addStrike(ip, 'oversized-headers');
    res.status(431).json({ error: 'Request header fields too large' });
    return;
  }

  // Suspicious Host header (Host header injection)
  const host = req.headers.host;
  if (host && /[<>"'`{}|\\]/.test(host)) {
    logger.warn('WAF: Host header injection blocked');
    addStrike(ip, 'host-injection');
    res.status(400).json({ error: 'Bad request' });
    return;
  }

  next();
};

// ═══════════════════════════════════════════════════════════════════
// 🕶️ SERVER FINGERPRINT OBFUSCATION
// ═══════════════════════════════════════════════════════════════════
// Remove headers que revelam a identidade/tecnologia do servidor.
// Impede que atacantes saibam que é Express/Node.js e ajustem exploits.
export const obfuscateServer = (req: Request, res: Response, next: NextFunction): void => {
  // Remove o header X-Powered-By (Express adiciona automaticamente)
  res.removeHeader('X-Powered-By');

  // Remove qualquer Server header que o host/proxy possa injetar
  res.removeHeader('Server');

  // Adiciona header falso para confundir scanners
  res.setHeader('Server', 'CloudGuard/2.1');

  // Impedir que o servidor revele versão do framework via erro
  res.setHeader('X-Content-Type-Options', 'nosniff');

  next();
};

// ═══════════════════════════════════════════════════════════════════
// 📊 WAF STATS (para monitoramento via /api/health)
// ═══════════════════════════════════════════════════════════════════
export const getWafStats = () => ({
  blacklistedIps: blacklist.size,
  trackedIps: strikes.size,
  strikeThreshold: STRIKE_THRESHOLD,
  blacklistDurationMin: BLACKLIST_DURATION_MS / 60_000,
});
