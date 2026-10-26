// No 0/o, 1/l/i: the suffix stays readable when typed by hand.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const LENGTH = 5

export const SEPARATORS = ['.', '-', '_']

export function randomSuffix() {
    const bytes = crypto.getRandomValues(new Uint8Array(LENGTH))
    return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

/**
 * Appends a random suffix, replacing the one added previously so the dice
 * button can be clicked several times: amazon → amazon.k3x9q → amazon.p7td2.
 * @param {string} localPart
 * @param {string} separator
 * @param {string} [previous] suffix returned by the previous call
 * @returns {{ value: string, suffix: string }}
 */
export function addRandomSuffix(localPart, separator, previous = '') {
    const base = previous && localPart.endsWith(previous)
        ? localPart.slice(0, -previous.length)
        : localPart
    const suffix = base ? `${separator}${randomSuffix()}` : randomSuffix()
    return { value: base + suffix, suffix }
}
