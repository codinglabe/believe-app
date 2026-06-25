import { showErrorToast, showSuccessToast } from '@/lib/toast'

/** Survives React Strict Mode remounts; cleared when flash props empty. */
const shownFlash = {
  success: '',
  error: '',
  info: '',
  warning: '',
}

export function showSessionFlashToasts(flash: {
  success: string
  error: string
  info: string
  warning: string
}): void {
  if (!flash.success.trim()) {
    shownFlash.success = ''
  } else if (shownFlash.success !== flash.success) {
    shownFlash.success = flash.success
    showSuccessToast(flash.success)
  }

  if (!flash.error.trim()) {
    shownFlash.error = ''
  } else if (shownFlash.error !== flash.error) {
    shownFlash.error = flash.error
    showErrorToast(flash.error)
  }

  if (!flash.info.trim()) {
    shownFlash.info = ''
  } else if (shownFlash.info !== flash.info) {
    shownFlash.info = flash.info
    showSuccessToast(flash.info)
  }

  if (!flash.warning.trim()) {
    shownFlash.warning = ''
  } else if (shownFlash.warning !== flash.warning) {
    shownFlash.warning = flash.warning
    showErrorToast(flash.warning)
  }
}
