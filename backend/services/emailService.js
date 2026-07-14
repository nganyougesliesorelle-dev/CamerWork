/**
 * emailService.js — Service d'envoi d'emails transactionnels via Nodemailer.
 *
 * Templates disponibles :
 *   - passwordReset(email, resetLink) → email de réinitialisation
 *   - welcome(email, name) → email de bienvenue
 *   - applicationUpdate(email, name, jobTitle, status) → mise à jour candidature
 *
 * Configuration via variables d'environnement :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *
 * Usage :
 *   import { sendPasswordResetEmail, sendWelcomeEmail } from './services/emailService.js';
 *   await sendPasswordResetEmail('user@mail.com', 'https://...');
 */

import nodemailer from 'nodemailer';
import { logger } from '../middleware/auditLogger.js';

// ─── Transport Nodemailer (créé une seule fois) ──────────────────────
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn('SMTP non configuré — les emails seront simulés en console', {
      action: 'email_service_init_failed',
    });
    // Fallback : transport de test (Ethereal) ou console
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Timeout raisonnable
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  // Vérifier la connexion au démarrage
  transporter.verify()
    .then(() => logger.info('📧 Service email connecté', { action: 'email_service_ready', host }))
    .catch((err) => logger.warn('⚠️  Service email indisponible', { action: 'email_service_error', error: err.message }));

  return transporter;
}

// ─── From address ────────────────────────────────────────────────────
function getFrom() {
  return process.env.SMTP_FROM || '"CamerWork" <noreply@camerwork.app>';
}

// ─── Template : Réinitialisation de mot de passe ─────────────────────
function passwordResetTemplate(email, resetLink) {
  return {
    subject: '🔐 Réinitialisation de votre mot de passe — CamerWork',
    html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f9ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f9ff;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(14,116,144,0.08);overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0c4a6e,#0891b2);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#38bdf8,#2dd4bf);border-radius:14px;text-align:center;line-height:48px;margin-bottom:12px;">
                <span style="font-size:24px;font-weight:900;color:#fff;">CW</span>
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                Camer<span style="color:#2dd4bf;">Work</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0c4a6e;">
                Réinitialisation de mot de passe
              </h2>
              <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.6;">
                Bonjour,
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.6;">
                Vous avez demandé la réinitialisation de votre mot de passe CamerWork.
                Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" 
                       style="display:inline-block;background:linear-gradient(135deg,#0c4a6e,#0891b2);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;letter-spacing:0.3px;">
                      🔒 Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
                Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation,
                ignorez simplement cet email — votre compte reste sécurisé.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                CamerWork — La plateforme d'emploi au Cameroun<br>
                Cet email a été envoyé à <strong>${email}</strong>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

// ─── Template : Bienvenue ────────────────────────────────────────────
function welcomeTemplate(email, name) {
  const displayName = name || email.split('@')[0];
  return {
    subject: '🎉 Bienvenue sur CamerWork !',
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f0f9ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(14,116,144,0.08);overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0c4a6e,#0891b2);padding:32px 40px;text-align:center;">
          <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#38bdf8,#2dd4bf);border-radius:14px;text-align:center;line-height:48px;">
            <span style="font-size:24px;font-weight:900;color:#fff;">CW</span></div>
          <h1 style="margin:10px 0 0;font-size:20px;color:#fff;">Bienvenue sur CamerWork, ${displayName} !</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 12px;font-size:14px;color:#475569;line-height:1.6;">
            Votre compte a été créé avec succès. Vous pouvez maintenant :
          </p>
          <ul style="margin:0 0 24px;padding:0 0 0 20px;font-size:14px;color:#475569;line-height:1.8;">
            <li>📋 Parcourir les offres d'emploi au Cameroun</li>
            <li>📄 Créer votre CV optimisé ATS</li>
            <li>🤝 Postuler et discuter avec les recruteurs</li>
            <li>🎯 Recevoir des recommandations personnalisées</li>
          </ul>
          <table width="100%"><tr><td align="center">
            <a href="https://camerwork-1e3d0.web.app/offres" style="display:inline-block;background:linear-gradient(135deg,#0c4a6e,#0891b2);color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;">
              🚀 Découvrir les offres
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;color:#94a3b8;">CamerWork © ${new Date().getFullYear()} — ${email}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

// ─── Fonctions d'envoi publiques ─────────────────────────────────────

/**
 * Envoie un email de réinitialisation de mot de passe.
 * @param {string} email
 * @param {string} resetLink — Lien de réinitialisation Firebase
 * @returns {Promise<{success:boolean,message?:string,error?:string}>}
 */
export async function sendPasswordResetEmail(email, resetLink) {
  const transport = getTransporter();
  const template = passwordResetTemplate(email, resetLink);

  if (!transport) {
    // Mode développement : log dans la console
    logger.info('📧 [SIMULÉ] Email de reset password', {
      action: 'email_simulated',
      type: 'password_reset',
      to: email,
      resetLink,
    });
    console.log(`\n📧 ─── EMAIL SIMULÉ ──────────────────────────`);
    console.log(`   To:      ${email}`);
    console.log(`   Subject: ${template.subject}`);
    console.log(`   Link:    ${resetLink}`);
    console.log(`   ───────────────────────────────────────────\n`);
    return { success: true, message: 'Email simulé (SMTP non configuré)' };
  }

  try {
    const info = await transport.sendMail({
      from: getFrom(),
      to: email,
      subject: template.subject,
      html: template.html,
    });

    logger.info('Email de reset password envoyé', {
      action: 'email_sent',
      type: 'password_reset',
      to: email,
      messageId: info.messageId,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Échec envoi email reset password', {
      action: 'email_send_failed',
      type: 'password_reset',
      to: email,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Envoie un email de bienvenue.
 * @param {string} email
 * @param {string} name
 * @returns {Promise<{success:boolean,message?:string,error?:string}>}
 */
export async function sendWelcomeEmail(email, name) {
  const transport = getTransporter();
  const template = welcomeTemplate(email, name);

  if (!transport) {
    logger.info('📧 [SIMULÉ] Email de bienvenue', {
      action: 'email_simulated',
      type: 'welcome',
      to: email,
    });
    return { success: true, message: 'Email simulé (SMTP non configuré)' };
  }

  try {
    const info = await transport.sendMail({
      from: getFrom(),
      to: email,
      subject: template.subject,
      html: template.html,
    });

    logger.info('Email de bienvenue envoyé', {
      action: 'email_sent',
      type: 'welcome',
      to: email,
      messageId: info.messageId,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Échec envoi email bienvenue', {
      action: 'email_send_failed',
      type: 'welcome',
      to: email,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

/**
 * Vérifie si le service email est disponible.
 * @returns {boolean}
 */
export function isEmailServiceAvailable() {
  return getTransporter() !== null;
}

export default {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  isEmailServiceAvailable,
};
