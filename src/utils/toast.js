/**
 * Toast notifications using SweetAlert2 (styles from Minia theme app.min.css)
 */
import Swal from 'sweetalert2'

const DEFAULT_DURATION = 3000
const ERROR_DURATION = 5000

function show(message, icon, duration = DEFAULT_DURATION) {
  const isError = icon === 'error'
  const ms = isError ? ERROR_DURATION : duration

  return Swal.fire({
    icon,
    title: message,
    timer: ms,
    timerProgressBar: false,
    showConfirmButton: true,
    confirmButtonText: 'OK',
    allowOutsideClick: true,
  })
}

export const toast = {
  success: (message, duration) => show(message, 'success', duration),
  error: (message, duration) => show(message, 'error', duration ?? ERROR_DURATION),
  warning: (message, duration) => show(message, 'warning', duration),
  info: (message, duration) => show(message, 'info', duration),
}
