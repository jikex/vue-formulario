/**
 * Converts to array.
 * If given parameter is not string, object ot array, result will be an empty array.
 * @param {*} item
 */
export default function arrayify (item: any): any[] {
    if (!item) {
        return []
    }
    if (typeof item === 'string') {
        return [item]
    }
    if (Array.isArray(item)) {
        return item
    }
    if (typeof item === 'object') {
        return Object.values(item)
    }
    return []
}
