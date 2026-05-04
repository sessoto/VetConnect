import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const fmtDateTime = (d: string | Date) =>
  format(new Date(d), "dd MMM yyyy, HH:mm", { locale: es });

export const fmtRelative = (d: string | Date) =>
  formatDistanceToNow(new Date(d), { addSuffix: true, locale: es });
