import { useEffect } from 'react'

export default function Toast({ message, tone = 'success', onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className={`toast toast--${tone}`} role="status" aria-live="polite">
      <span>{message}</span>
      <button type="button" className="icon-btn" aria-label="Dismiss notification" onClick={onDismiss}>
        &times;
      </button>
    </div>
  )
}
