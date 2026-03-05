import logger from '@/logger.ts';
import { toast } from 'sonner';

/**
 * Displays a toast notification with the given text and variant.
 * @param text - The text to display in the toast notification.
 * @param variant - The variant of the toast notification. Can be "success", "error", "warning", or "info".
 */
export function ToasterHandler(
  text: string,
  variant: 'success' | 'error' | 'warning' | 'info'
) {
  if (variant === 'error') {
    logger.error(text);
    toast.error(text);
  } else if (variant === 'success') {
    logger.info(text);
    toast.success(text);
  } else {
    if (variant === 'warning') logger.warn(text);
    if (variant === 'info') logger.info(text);
    toast.message(text);
  }
}

export function ToasterHandlerPromise(
  promise: any,
  loadingText: string,
  successText: string,
  errorText: string
) {
  toast.promise(promise, {
    loading: loadingText,
    success: successText,
    error: errorText,
  });
}
