/**
 * The base for the whole library. Applies a predicate to the value.
 * If the predicate yields true, returns the value as is. Otherwise, throws.
 * @param predicate {(a: any) => a is T}. As you can see, the predicate should
 * @param input {unknown} The value itself.
 * assert a type
 */
export function be<T>(predicate: (a: any) => a is T): (u: unknown) => T {
  return function decoder(input: unknown | T): T {
    if (!predicate(input))
      throw TypeError(`assertion failed on ${printValueInfo(input)}`)

    return input
  }
}

/**
 * Runs a decoding function, and if all the validations succeed, returns
 * the value. If something fails, falls back to another value (and optionally
 * logs the error).
 * @param fallbackVal {Fb} The fallback value (probably different from T)
 * @return decorator {(In => Out) => In => Out | Fb} The same decoder that,
 * instead of throwing, returns a fallback value
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
          exceptions indiscriminately, even those not foreseen
          by a programmer.
        */
        return fallbackVal
      }
    }
  }
}

/**
 * Just returns an object, if it’s an object. Doesn’t decode fields or anything.
 * Useful because...
 * @returns an object typed as {Re== 'stricord<string, unknown>}
 */
export const beObject = be(isObject)

type DecodersFor<T> = {
  [P in keyof T]: (field: unknown) => T[P]
}

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

type BeCollectionOptions = {
  /** What to invalidate on errors */
  invalidate?: 'single' | 'all'
  minSize?: number
}

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
  // Unlike lodash, we consider typeof value === 'function' a negative
  // (getting a function after deserialization is probably a bug anyway)
}
