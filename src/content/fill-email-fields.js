/**
 * Injected in the page with scripting.executeScript(): it must stay
 * self-contained (no imports, no outer variables), only its source is sent.
 *
 * Finds the email fields of the most relevant form (signup form with an
 * "email" + "confirm email" pair rather than a footer newsletter), then fills
 * them the way password managers do so that React/Vue/Angular and validation
 * scripts register the change.
 *
 * @param {string} value
 * @param {{ dryRun?: boolean, includeFocused?: boolean }} [options]
 *   dryRun: only score the frame, used to pick the best frame;
 *   includeFocused: also fill the focused field even if it doesn't look like
 *   an email field (the user right-clicked it to get an alias)
 * @returns {{ score: number, count: number, filled: number }}
 */
export function fillEmailFields(value, { dryRun = false, includeFocused = false } = {}) {
    const EMAIL_HINT = /e[-_. ]?mail|courriel|\bm[ée]l\b|correo|e-?post/i
    const CONFIRM_HINT = /confirm|verif|repeat|retype|again|re-?enter|r[ée]p[ée]t|ressaisi|wiederhol|mail[-_]?2\b/i
    const NEWSLETTER_HINT = /newsletter|subscribe|abonne|infolettre/i
    const SEARCH_HINT = /search|recherche|query/i
    const TEXT_TYPES = new Set(['email', 'text', ''])

    /** Open and closed shadow roots, as exposed to content scripts. */
    const shadowRootOf = (element) =>
        globalThis.chrome?.dom?.openOrClosedShadowRoot?.(element)
        ?? element.openOrClosedShadowRoot
        ?? element.shadowRoot

    function collectInputs(root, inputs = []) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
        for (let node = walker.currentNode; node; node = walker.nextNode()) {
            if (node instanceof HTMLInputElement) inputs.push(node)
            const shadow = node instanceof Element && shadowRootOf(node)
            if (shadow) collectInputs(shadow, inputs)
        }
        return inputs
    }

    function describe(input) {
        const labelledBy = (input.getAttribute('aria-labelledby') ?? '')
            .split(/\s+/)
            .map(id => id && input.getRootNode().getElementById?.(id)?.textContent)
        return [
            input.name, input.id, input.placeholder, input.title,
            input.getAttribute('autocomplete'), input.getAttribute('aria-label'),
            ...Array.from(input.labels ?? [], label => label.textContent),
            ...labelledBy,
        ].filter(Boolean).join(' ')
    }

    function isVisible(input) {
        if (typeof input.checkVisibility === 'function') {
            return input.checkVisibility({ visibilityProperty: true })
        }
        return input.getClientRects().length > 0 && getComputedStyle(input).visibility !== 'hidden'
    }

    function isFillable(input) {
        const type = (input.getAttribute('type') ?? '').toLowerCase()
        return TEXT_TYPES.has(type) && !input.disabled && !input.readOnly && isVisible(input)
    }

    function isEmailField(input) {
        const type = (input.getAttribute('type') ?? '').toLowerCase()
        if (!isFillable(input) || input.closest('[role=search]')) return false
        const text = describe(input)
        if (type === 'email') return !SEARCH_HINT.test(text)
        return EMAIL_HINT.test(text) && !SEARCH_HINT.test(text)
    }

    function deepActiveElement() {
        let active = document.activeElement
        while (active && shadowRootOf(active)?.activeElement) active = shadowRootOf(active).activeElement
        return active
    }

    const inputs = collectInputs(document.documentElement)
    const passwords = inputs.filter(input => input.type === 'password' && isVisible(input))
    const groups = new Map()
    for (const input of inputs.filter(isEmailField)) {
        const key = input.form ?? null
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(input)
    }

    const focused = deepActiveElement()
    if (includeFocused && focused instanceof HTMLInputElement && isFillable(focused)) {
        const key = focused.form ?? null
        if (!groups.has(key)) groups.set(key, [])
        if (!groups.get(key).includes(focused)) groups.get(key).push(focused)
    }

    let best = { score: 0, fields: [] }
    for (const [form, fields] of groups) {
        let score = fields.length
        if (fields.includes(focused)) score += 10
        if (passwords.some(p => p.form === form)) score += 3
        if (fields.some(f => CONFIRM_HINT.test(describe(f)))) score += 2
        // Still fillable when alone on the page, but any other form wins.
        if (form && NEWSLETTER_HINT.test(`${form.id} ${form.className} ${form.action}`)) score -= 0.5
        if (score > best.score) best = { score, fields }
    }

    if (dryRun || best.score <= 0) {
        return { score: best.score, count: best.fields.length, filled: 0 }
    }

    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    const pageHasFocus = document.hasFocus()
    const fire = (input, event) => input.dispatchEvent(event)

    for (const input of best.fields) {
        input.focus({ preventScroll: true })
        // The popup keeps the focus: focus/blur events won't fire natively.
        if (!pageHasFocus) {
            fire(input, new FocusEvent('focus'))
            fire(input, new FocusEvent('focusin', { bubbles: true, composed: true }))
        }
        for (const type of ['keydown', 'keypress']) {
            fire(input, new KeyboardEvent(type, { bubbles: true, composed: true }))
        }
        // The prototype setter bypasses the instance setter frameworks such as
        // React install, so their value tracker sees the change on "input".
        nativeSetter.call(input, value)
        fire(input, new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertText', data: value }))
        fire(input, new KeyboardEvent('keyup', { bubbles: true, composed: true }))
        fire(input, new Event('change', { bubbles: true }))
        input.blur()
        if (!pageHasFocus) {
            fire(input, new FocusEvent('blur'))
            fire(input, new FocusEvent('focusout', { bubbles: true, composed: true }))
        }
        input.animate?.(
            [{ boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.7)' }, { boxShadow: '0 0 0 3px rgba(34, 197, 94, 0)' }],
            { duration: 1200, easing: 'ease-out' },
        )
    }

    return { score: best.score, count: best.fields.length, filled: best.fields.length }
}
