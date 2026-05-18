import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { showSuccess, showError } from '@/lib/toastNotifications';

interface FlashProps {
  success?: string;
  error?: string;
}

export default function FlashHandler() {
  const { flash } = usePage<{ flash: FlashProps }>().props;

  useEffect(() => {
    if (flash?.success) {
      showSuccess(flash.success);
    }
    if (flash?.error) {
      showError(flash.error);
    }
  }, [flash]);

  return null;
}
