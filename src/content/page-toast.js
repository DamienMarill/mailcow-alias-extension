/**
 * Injected in the page with scripting.executeScript(): must stay
 * self-contained. Isolated in a closed shadow root so the page's CSS
 * can't alter it and its CSS can't leak into the page.
 * @param {string} message
 * @param {'success' | 'error'} type
 */
export function showPageToast(message, type) {
    const ID = 'mailcow-alias-toast'
    document.getElementById(ID)?.remove()

    const host = document.createElement('div')
    host.id = ID
    const root = host.attachShadow({ mode: 'closed' })
    const toast = document.createElement('div')
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status')
    toast.textContent = message
    toast.style.cssText = [
        'position: fixed', 'right: 16px', 'bottom: 16px', 'z-index: 2147483647',
        'max-width: min(360px, calc(100vw - 32px))', 'padding: 10px 14px', 'border-radius: 8px',
        'font: 14px/1.4 system-ui, sans-serif', 'color: #fff', 'box-shadow: 0 4px 16px rgba(0, 0, 0, .25)',
        `background: ${type === 'error' ? '#dc2626' : '#16a34a'}`, 'word-break: break-word',
    ].join(';')
    root.append(toast)
    document.documentElement.append(host)
    setTimeout(() => host.remove(), type === 'error' ? 6000 : 4000)
}
