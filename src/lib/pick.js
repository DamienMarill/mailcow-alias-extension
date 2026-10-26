/**
 * First candidate present in the options, else the first option.
 * @param {string[]} options
 * @param {...string} preferred
 */
export function pickOption(options, ...preferred) {
    return preferred.find(value => value && options.includes(value)) ?? options[0] ?? ''
}
