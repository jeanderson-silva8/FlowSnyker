import nodemailer from 'nodemailer';
import { logger } from './logger';

// --- Gmail SMTP ---
const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 8000,  // 8s para conectar
  socketTimeout: 10000,     // 10s para resposta
});

interface SendResetEmailParams {
  to: string;
  resetUrl: string;
  userName: string;
}

export const sendPasswordResetEmail = async ({ to, resetUrl, userName }: SendResetEmailParams): Promise<boolean> => {
  const html = buildResetEmailHTML(resetUrl, userName);

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const info = await gmailTransporter.sendMail({
        from: `"FlowSnyker Suporte" <${process.env.EMAIL_USER}>`,
        to,
        subject: '🔑 Recuperação de Senha — FlowSnyker',
        html,
      });

      logger.info('✅ Email enviado via Gmail SMTP', { to, messageId: info.messageId });
      return true;
    } catch (err) {
      logger.error('❌ Envio via Gmail SMTP falhou', { error: (err as Error).message });
    }
  }

  // Fallback: imprime no console de log do servidor o link
  logger.warn('📋 Credenciais de email ausentes ou falha no provedor — link gerado no console');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('🔑 LINK DE RECUPERAÇÃO DE SENHA (fallback console)');
  logger.info(`📧 Email: ${to}`);
  logger.info(`🔗 URL: ${resetUrl}`);
  logger.info('═══════════════════════════════════════════════════════════');
  return false;
};

function buildResetEmailHTML(resetUrl: string, userName: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background: linear-gradient(180deg, rgba(255, 58, 58, 0.06) 0%, rgba(26, 26, 26, 0.95) 30%); border: 1px solid rgba(255, 58, 58, 0.15); border-radius: 20px; overflow: hidden;">
          
          <!-- Header com gradiente -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 169, 77, 0.08) 100%); padding: 40px 40px 30px; text-align: center;">
              <div style="display: inline-block; margin-bottom: 16px;">
                <span style="font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">⚡ Flow<span style="background: linear-gradient(135deg, #FF6B6B, #FFA94D); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Snyker</span></span>
              </div>
              <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Recuperação de Senha</p>
            </td>
          </tr>

          <!-- Corpo do email -->
          <tr>
            <td style="padding: 36px 40px;">
              <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Olá, ${userName}! 👋
              </h1>
              <p style="margin: 0 0 28px; font-size: 14px; color: rgba(255, 255, 255, 0.6); line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no FlowSnyker. Clique no botão abaixo para criar uma nova senha:
              </p>

              <!-- Botão CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 4px 0 28px;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #FF6B6B 0%, #FFA94D 100%); color: #ffffff; text-decoration: none; border-radius: 14px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 24px rgba(255, 58, 58, 0.3); letter-spacing: 0.01em;">
                      Redefinir minha senha
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info -->
              <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.06em;">⏰ Atenção</p>
                <p style="margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.55); line-height: 1.5;">
                  Este link expira em <strong style="color: #FF6B6B;">15 minutos</strong>. Se você não solicitou esta recuperação, ignore este email — sua conta está segura.
                </p>
              </div>

              <!-- Link alternativo -->
              <p style="margin: 0; font-size: 12px; color: rgba(255, 255, 255, 0.35); line-height: 1.5;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: rgba(255, 107, 107, 0.7); word-break: break-all; line-height: 1.5;">
                ${resetUrl}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: rgba(255, 255, 255, 0.25);">
                Este email foi enviado automaticamente pelo FlowSnyker.
              </p>
              <p style="margin: 0; font-size: 11px; color: rgba(255, 255, 255, 0.2);">
                © ${new Date().getFullYear()} FlowSnyker — Plataforma de Gestão Colaborativa
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
