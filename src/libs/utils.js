import FileUpload from '../FileUpload'

/**
 * Function to map over an object.
 * @param {Object} obj An object to map over
 * @param {Function} callback
 */
export function map (original, callback) {
    const obj = {}
    for (let key in original) {
        obj[key] = callback(key, original[key])
    }
    return obj
}

/**
 * Shallow equal.
 * @param {} objA
 * @param {*} objB
 */
export function shallowEqualObjects (objA, objB) {
    if (objA === objB) {
        return true
    }
    if (!objA || !objB) {
        return false
    }
    var aKeys = Object.keys(objA)
    var bKeys = Object.keys(objB)
    var len = aKeys.length

    if (bKeys.length !== len) {
        return false
    }

    if (objA instanceof Date && objB instanceof Date) {
        return objA.getTime() === objB.getTime();
    }

    if (len === 0) {
        return objA === objB;
    }

    for (var i = 0; i < len; i++) {
        var key = aKeys[i]

        if (objA[key] !== objB[key]) {
            return false
        }
    }
    return true
}

/**
 * Given a string, convert snake_case to camelCase
 * @param {String} string
 */
export function snakeToCamel (string) {
    if (typeof string === 'string') {
        return string.replace(/([_][a-z0-9])/ig, ($1) => {
            if (string.indexOf($1) !== 0 && string[string.indexOf($1) - 1] !== '_') {
                return $1.toUpperCase().replace('_', '')
            }
            return $1
        })
    }
    return string
}

/**
 * Given a string, object, falsey, or array - return an array.
 * @param {mixed} item
 */
export function arrayify (item) {
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

/**
 * Given an array or string return an array of callables.
 * @param {array|string} validation
 * @param {array} rules and array of functions
 * @return {array} an array of functions
 */
export function parseRules (validation, rules) {
    if (typeof validation === 'string') {
        return parseRules(validation.split('|'), rules)
    }
    if (!Array.isArray(validation)) {
        return []
    }
    return validation.map(rule => parseRule(rule, rules)).filter(f => !!f)
}

/**
 * Given a string or function, parse it and return an array in the format
 * [fn, [...arguments]]
 * @param {string|function} rule
 */
function parseRule (rule, rules) {
    if (typeof rule === 'function') {
        return [rule, []]
    }
    if (Array.isArray(rule) && rule.length) {
        rule = rule.map(r => r) // light clone
        const [ruleName, modifier] = parseModifier(rule.shift())
        if (typeof ruleName === 'string' && rules.hasOwnProperty(ruleName)) {
            return [rules[ruleName], rule, ruleName, modifier]
        }
        if (typeof ruleName === 'function') {
            return [ruleName, rule, ruleName, modifier]
        }
    }
    if (typeof rule === 'string') {
        const segments = rule.split(':')
        const [ruleName, modifier] = parseModifier(segments.shift())
        if (rules.hasOwnProperty(ruleName)) {
            return [rules[ruleName], segments.length ? segments.join(':').split(',') : [], ruleName, modifier]
        } else {
            throw new Error(`Unknown validation rule ${rule}`)
        }
    }
    return false
}

/**
 * Return the rule name with the applicable modifier as an array.
 * @param {string} ruleName
 * @return {array} [ruleName, modifier]
 */
function parseModifier (ruleName) {
    if (/^[\^]/.test(ruleName.charAt(0))) {
        return [snakeToCamel(ruleName.substr(1)), ruleName.charAt(0)]
    }
    return [snakeToCamel(ruleName), null]
}

/**
 * Given an array of rules, group them by bail signals. For example for this:
 * bail|required|min:10|max:20
 * we would expect:
 * [[required], [min], [max]]
 * because any sub-array failure would cause a shutdown. While
 * ^required|min:10|max:10
 * would return:
 * [[required], [min, max]]
 * and no bailing would produce:
 * [[required, min, max]]
 * @param {array} rules
 */
export function groupBails (rules) {
    const groups = []
    const bailIndex = rules.findIndex(([,, rule]) => rule.toLowerCase() === 'bail')
    if (bailIndex >= 0) {
        // Get all the rules until the first bail rule (dont include the bail)
        const preBail = rules.splice(0, bailIndex + 1).slice(0, -1)
        // Rules before the `bail` rule are non-bailing
        preBail.length && groups.push(preBail)
        // All remaining rules are bailing rule groups
        rules.map(rule => groups.push(Object.defineProperty([rule], 'bail', { value: true })))
    } else {
        groups.push(rules)
    }

    return groups.reduce((groups, group) => {
        const splitByMod = (group, bailGroup = false) => {
            if (group.length < 2) {
                return Object.defineProperty([group], 'bail', { value: bailGroup })
            }
            const splits = []
            const modIndex = group.findIndex(([,,, modifier]) => modifier === '^')
            if (modIndex >= 0) {
                const preMod = group.splice(0, modIndex)
                // rules before the modifier are non-bailing rules.
                preMod.length && splits.push(...splitByMod(preMod, bailGroup))
                splits.push(Object.defineProperty([group.shift()], 'bail', { value: true }))
                // rules after the modifier are non-bailing rules.
                group.length && splits.push(...splitByMod(group, bailGroup))
            } else {
                splits.push(group)
            }
            return splits
        }
        return groups.concat(splitByMod(group))
    }, [])
}

/**
 * Escape a string for use in regular expressions.
 * @param {string} string
 */
export function escapeRegExp (string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

/**
 * Given a string format (date) return a regex to match against.
 * @param {string} format
 */
export function regexForFormat (format) {
    let escaped = `^${escapeRegExp(format)}$`
    const formats = {
        MM: '(0[1-9]|1[012])',
        M: '([1-9]|1[012])',
        DD: '([012][1-9]|3[01])',
        D: '([012]?[1-9]|3[01])',
        YYYY: '\\d{4}',
        YY: '\\d{2}'
    }
    return new RegExp(Object.keys(formats).reduce((regex, format) => {
        return regex.replace(format, formats[format])
    }, escaped))
}

/**
 * Check if
 * @param {mixed} data
 */
export function isValueType (data) {
    switch (typeof data) {
        case 'symbol':
        case 'number':
        case 'string':
        case 'boolean':
        case 'undefined':
            return true
        default:
            if (data === null) {
                return true
            }
            return false
    }
}

/**
 * A simple (somewhat non-comprehensive) cloneDeep function, valid for our use
 * case of needing to unbind reactive watchers.
 */
export function cloneDeep (obj) {
    if (typeof obj !== 'object') {
        return obj
    }
    const isArr = Array.isArray(obj)
    const newObj = isArr ? [] : {}
    for (const key in obj) {
        if (obj[key] instanceof FileUpload || isValueType(obj[key])) {
            newObj[key] = obj[key]
        } else {
            newObj[key] = cloneDeep(obj[key])
        }
    }
    return newObj
}

/**
 * Given a locale string, parse the options.
 * @param {string} locale
 */
export function parseLocale (locale) {
    const segments = locale.split('-')
    return segments.reduce((options, segment) => {
        if (options.length) {
            options.unshift(`${options[0]}-${segment}`)
        }
        return options.length ? options : [segment]
    }, [])
}

/**
 * Shorthand for Object.prototype.hasOwnProperty.call (space saving)
 */
export function has (ctx, prop) {
    return Object.prototype.hasOwnProperty.call(ctx, prop)
}

/**
 * Set a unique Symbol identifier on an object.
 * @param {object} o
 * @param {Symbol} id
 */
export function setId (o, id) {
    return Object.defineProperty(o, '__id', Object.assign(Object.create(null), { value: id || Symbol('uuid') }))
}

export function getNested(obj, field) {
    let fieldParts = field.split('.');

    let result = obj;
    for (const key in fieldParts) {
        let matches = fieldParts[key].match(/(.+)\[(\d+)\]$/);
        if (result === undefined) {
            return null
        }
        if (matches) {
            result = result[matches[1]];

            if (result === undefined) {
                return null
            }
            result = result[matches[2]];
        } else {
            result = result[fieldParts[key]];
        }
    }
    return result;
}

export function setNested(obj, field, value) {
    let fieldParts = field.split('.');

    let subProxy = obj;
    for (let i = 0; i < fieldParts.length; i++) {
        let fieldPart = fieldParts[i];

        let matches = fieldPart.match(/(.+)\[(\d+)\]$/);

        if (matches) {
            if (subProxy[matches[1]] === undefined) {
                subProxy[matches[1]] = [];
            }
            subProxy = subProxy[matches[1]];

            if (i == fieldParts.length - 1) {
                subProxy[matches[2]] = value
                break;
            } else {
                subProxy = subProxy[matches[2]];
            }
        } else {
            if (i == fieldParts.length - 1) {
                subProxy[fieldPart] = value
                break;
            } else {
                if (subProxy[fieldPart] === undefined) {
                    subProxy[fieldPart] = {};
                }
                subProxy = subProxy[fieldPart];
            }
        }
    }

    return obj;
}