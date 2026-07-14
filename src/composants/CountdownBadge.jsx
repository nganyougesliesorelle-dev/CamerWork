/**
 * CountdownBadge.jsx — Badge de compte à rebours pour les deadlines.
 *
 * Affiche le temps restant avant une date d'expiration, avec mise à jour
 * automatique toutes les minutes. Disparaît une fois la deadline passée.
 *
 * Usage :
 *   <CountdownBadge expiryDate={job.expiryDate} />
 *   <CountdownBadge expiryDate={job.expiryDate} size="lg" urgent={true} />
 */

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export function CountdownBadge({ expiryDate, size = 'sm', urgent = false, className = '' }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiryDate) return;

    const calc = () => {
      const now = new Date();
      const exp = expiryDate?.toDate ? expiryDate.toDate() : new Date(expiryDate);
      const diff = exp.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        setExpired(true);
        return;
      }

      const totalHours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft({ days, hours, minutes, totalHours });
    };

    calc();
    const interval = setInterval(calc, 60_000);
    return () => clearInterval(interval);
  }, [expiryDate]);

  if (expired) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 ${className}`}>
        <AlertTriangle size={12} />
        Expirée
      </span>
    );
  }

  if (!timeLeft) return null;

  const isUrgent = urgent || timeLeft.totalHours < 48;

  const baseClasses = size === 'lg'
    ? 'px-4 py-2 rounded-xl text-xs font-black'
    : 'px-3 py-1 rounded-full text-[10px] font-black';

  const colorClasses = isUrgent
    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
    : 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800';

  const label = timeLeft.days > 0
    ? `${timeLeft.days}j ${timeLeft.hours}h`
    : timeLeft.hours > 0
      ? `${timeLeft.hours}h ${timeLeft.minutes}min`
      : `${timeLeft.minutes}min`;

  return (
    <span className={`inline-flex items-center gap-1.5 border uppercase tracking-wide ${baseClasses} ${colorClasses} ${className}`}>
      <Clock size={size === 'lg' ? 16 : 12} className={isUrgent ? 'text-amber-500 animate-pulse' : ''} />
      {label}
    </span>
  );
}

export default CountdownBadge;
