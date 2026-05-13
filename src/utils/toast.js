/**
 * Toast notifications using SweetAlert2 (styles from Minia theme app.min.css)
 */
import Swal from 'sweetalert2'

const DEFAULT_DURATION = 1000

function show(message, icon, duration = DEFAULT_DURATION) {
  const isError = icon === 'error'

  if (isError) {
    return Swal.fire({
      icon: 'error',
      title: message,
      showConfirmButton: true,
      confirmButtonText: 'OK',
      showCloseButton: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
    })
  }

  return Swal.fire({
    icon,
    title: message,
    timer: duration,
    timerProgressBar: true,
    showConfirmButton: false,
    showCloseButton: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
  })
}

export const toast = {
  success: (message, duration) => show(message, 'success', duration),
  error: (message) => show(message, 'error'),
  warning: (message, duration) => show(message, 'warning', duration),
  info: (message, duration) => show(message, 'info', duration),
}
