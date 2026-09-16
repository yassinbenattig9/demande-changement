import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine des classes Tailwind avec gestion des conflits
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formate une date ISO ou VARCHAR en format lisible français (JJ/MM/AAAA ou JJ/MM/AAAA HH:mm)
 */
export function formatDateFr(dateStr?: string | null, withTime = false): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Cas de format VARCHAR simple de type YYYY-MM-DD ou DD/MM/YYYY
      return dateStr;
    }
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    };
    return new Intl.DateTimeFormat('fr-FR', options).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Calcule le nombre de jours restants avant une date butoir
 */
export function getDaysRemaining(dateButoirStr?: string | null): number | null {
  if (!dateButoirStr) return null;
  const target = new Date(dateButoirStr).getTime();
  if (isNaN(target)) return null;
  const now = new Date().getTime();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diffDays;
}
