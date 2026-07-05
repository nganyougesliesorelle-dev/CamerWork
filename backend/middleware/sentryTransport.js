/**
 * sentryTransport.js — Transport Winston personnalisé pour Sentry.
 *
 * Envoie les logs de niveau 'audit' et 'error' vers Sentry pour
 * la surveillance en temps réel et les alertes.
 *
 * Installation :
 *   npm install @sentry/node
 *
 * Configuration dans .env :
 *   SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
 *
 * Usage :
 *   import { createSentryTransport } from './middleware/sentryTransport.js';
 *   logger.add(createSentryTransport());
 */

import winston from 'winston';
import Transport from 'winston-transport';

/**
 * Transport Winston vers Sentry.
 *
 * Envoie les événements de niveau 'audit' et 'error' à Sentry.
 * Les événements 'info' et 'warn' ne sont pas envoyés pour éviter
 * le bruit (ils restent dans les fichiers de log).
 */
export class SentryTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this.name = 'SentryTransport';
    this.dsn = opts.dsn || process.env.SENTRY_DSN;
    this.environment = process.env.NODE_ENV || 'development';
    this._sentry = null;
    this._initialized = false;
  }

  /**
   * Initialise Sentry de manière lazy (premier log).
   */
  async _ensureInitialized() {
    if (this._initialized) return;
    if (!this.dsn) {
      this._initialized = true;
      return; // Sentry non configuré, on ignore silencieusement
    }

    try {
      const Sentry = await import('@sentry/node');
      Sentry.init({
        dsn: this.dsn,
        environment: this.environment,
        tracesSampleRate: 0.1, // 10% des transactions pour la perf
        maxBreadcrumbs: 50,
        attachStacktrace: true,
        beforeSend(event) {
          // Filtrer les données sensibles
          if (event.request?.data?.password) {
            delete event.request.data.password;
          }
          if (event.request?.data?.email) {
            // Hasher l'email pour l'anonymisation partielle
            event.request.data.email = '***@***';
          }
          return event;
        },
      });
      this._sentry = Sentry;
      this._initialized = true;
    } catch (err) {
      console.warn('Sentry non disponible, transport désactivé:', err.message);
      this._initialized = true;
    }
  }

  async log(info, callback) {
    setImmediate(() => callback());

    // N'envoyer que les événements critiques à Sentry
    const criticalLevels = ['audit', 'error'];
    if (!criticalLevels.includes(info.level)) return;

    await this._ensureInitialized();
    if (!this._sentry) return;

    try {
      const { action, userId, ip, email, error, message, ...meta } = info;

      // Utiliser `captureMessage` pour les événements d'audit,
      // `captureException` pour les vraies erreurs
      if (info.level === 'error' && error) {
        this._sentry.captureException(
          error instanceof Error ? error : new Error(error),
          {
            level: 'error',
            tags: { action: action || 'unknown' },
            user: userId ? { id: userId } : undefined,
            extra: { ip, email, ...meta },
          }
        );
      } else {
        this._sentry.captureMessage(
          message || `Événement d'audit: ${action || 'inconnu'}`,
          {
            level: 'warning', // Les audits sont des warnings Sentry
            tags: { action: action || 'unknown', level: info.level },
            user: userId ? { id: userId } : undefined,
            extra: { ip, email, ...meta },
          }
        );
      }
    } catch (err) {
      // Échec silencieux — ne pas casser le logging principal
      console.warn('Erreur envoi Sentry:', err.message);
    }
  }
}

/**
 * Factory : crée une instance du transport Sentry.
 * @param {Object} opts — Options (dsn, environment)
 * @returns {SentryTransport}
 */
export function createSentryTransport(opts = {}) {
  return new SentryTransport(opts);
}

export default { SentryTransport, createSentryTransport };
