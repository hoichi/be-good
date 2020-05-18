/**
 * The base for the whole library. Applies a predicate to the value.
 * If the predicate yields true, returns the value as is. Otherwise, throws.
 * @param {any => a is T} predicate. As you can see, the predicate
 * should be a user defined type guard (i.e. return `a is Foo`, not just
 * boolean).
 * @return {unknown => T} decoder. A decoder function that either
 * returns a value of type T or throws
 */
export function be<T>(predicate: (a: any) => a is T): (u: unknown) => T {
  return function decoder(input: unknown | T): T {
    if (!predicate(input))
      throw TypeError(`assertion failed on ${printValueInfo(input)}`)

    return input
  }
}

/**
 * Given a fallback value, returns a decorator for decoder functions. The
 * decorator wraps a decoder function in a try/catch, and if the decoder
 * throws on invalid input, returns a fallback value instead.
 * @param {Fb} fallbackVal. The fallback value. Can be different from T:
 * nullish values are likely candidates.
 * @return {(In => Out) => In => Out | Fb} decorator.
 */
export function fallback<Fb>(fallbackVal: Fb) {
  return function decorator<In, Out>(decoder: (data: In) => Out) {
    return function decoratedDecoder(input: In): Out | Fb {
      try {
        return decoder(input)
      } catch (e) {
        /*
          If we ever add a custom error, we should replace all the
          `new TypeError` invocations. But frankly, why not catch all
          exceptions indiscriminately, even those we didn't throw on purpose.
        */
        return fallbackVal
      }
    }
  }
}

/**
 * An alias for fallback
 */
export const or = fallback

/**
 * Returns its input, if the input is an object. Doesn’t decode fields or
 * anything. Its result type makes it useful for destructuring and further
 * decoding.
 * For most of your object decoding needs though, you probably want either
 * `beObjectOf` or `beDictOf`
 * @returns {Record<string, unknown>}
 */
export const beObject = be(isObject)

/**
 * An object of field decoders for a given output shape
 * E.g., DecodersFor<{ a: string, b: number }> equals to
 * { a: unknown => string, b: unknown => number }
 */
type DecodersFor<T> = {
  [P in keyof T]: (field: unknown) => T[P]
}

/**
 * Given an object where every property is a decoder, returns an object
 * decoder that:
 * 1. Checks if its input is an object
 * 2. For every property decoder, tries to get a corresponding property of input
 * and applies that decoder to its value.
 * If a property decoder throws (e.g., if you didn’t wrap it with `or`), that
 * means the property was required, so the whole object is invalidated.
 * @param {DecodersFor<Out>} fieldDecoders
 * @return {unknown => Out} an object decoder
 */
export function beObjectOf<Out>(fieldDecoders: DecodersFor<Out>) {
  type K = keyof Out

  return function objectDecoder(input: unknown): Out {
    if (!isObject(input)) throw new TypeError('Not an object')

    const result = {} as Out // getting a bit ahead of ourselves
    Object.keys(fieldDecoders).forEach(key => {
      result[key as K] = fieldDecoders[key as K](
        (input as Record<K, unknown>)[key as K]
      )
    })

    return result
  }
}

/**
 * Options for array/dictionary decoders
 */
type BeCollectionOptions = {
  /** What to invalidate on errors */
  invalidate?: 'single' | 'all'
  /** Minimum count of (valid) collection elements */
  minSize?: number
}

/**
 * Returns a dictionary decoder that
 * 1. Checks if it input is an object
 * 2. Runs an element decoder on every object property.
 * Depending on the options, an invalid element is either simply not
 * included in the resulting dictionary, or invalidates the whole result.
 * @param {unknown => ElOut} elDecoder. Either returns a value of ElOut or
 * throws
 * @param {BeCollectionOptions} [options]
 * @returns {unknown => Record<string, ElOut>} A decoder that either returns
 * a dictionary of valid elements, or throws
 */
export function beDictOf<ElOut>(
  elDecoder: (el: unknown) => ElOut,
  { invalidate = 'single', minSize = 0 }: BeCollectionOptions = {}
) {
  type DictOut = Record<string, ElOut>

  return function dictDecoder(input: unknown): DictOut {
    if (!isObject(input)) throw new TypeError('Not an object')

    let result = {} as DictOut
    let length = 0
    Object.keys(input).forEach(key => {
      try {
        result[key] = elDecoder(input[key])
        length++
      } catch (e) {
        switch (invalidate) {
          case 'single':
            break // swallow the error, move on to the next element
          case 'all':
            throw TypeError('invalid element')
        }
      }
    })

    if (length < minSize)
      throw TypeError(`Dic elements count less than ${minSize}`)

    return result
  }
}

/**
 * Returns an array decoder that
 * 1. Checks if it input is an array
 * 2. Runs an element decoder on every array element.
 * Depending on the options, an invalid element is either simply not
 * included in the resulting array, or invalidates the whole result.
 * @param {unknown => ElOut} elDecoder. Either returns a value of ElOut or
 * throws
 * @param {BeCollectionOptions} [options]
 * @returns {unknown => ElOut[]} A decoder that either returns
 * an array of valid elements, or throws
 */
export function beArrayOf<ElOut>(
  elDecoder: (el: unknown) => ElOut,
  { invalidate = 'single', minSize = 0 }: BeCollectionOptions = {}
) {
  return function arrayDecoder(input: unknown): ElOut[] {
    if (!Array.isArray(input)) throw TypeError('Not an array')

    const result = []
    for (const el of input as unknown[]) {
      try {
        result.push(elDecoder(el))
      } catch (e) {
        switch (invalidate) {
          case 'single':
            break // swallow the error, move on to the next element
          case 'all':
            throw TypeError('invalid element')
        }
      }
    }

    if (result.length < minSize)
      throw TypeError(`Array length less than ${minSize}`)

    return result
  }
}

function printValueInfo(value: any) {
  const [lq, rq] = typeof value === 'string' ? ['“', '”'] : ['', '']
  return `${lq + value + rq} (${typeof value})`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
  /*
    Unlike, say, lodash, we consider typeof value === 'function' a negative
    (getting a function after deserialization is probably a bug anyway)

    Arrays are a negative too. Technically, you can add string keys to an
    array, but it shouldn’t happen to serialized data, and Object.keys
    converting indexes to strings is more harm than help.
  */
}
