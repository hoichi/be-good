import curry from 'lodash/fp/curry'

/**
 * The base for the whole library. Run predicate on the value.
 * If predicate returns true, returns the value as is. Otherwise, throws
 * with the given message.
 * If you just want a condition, not a type assertion, use `beTrue`
 * @param predicate {(a: any) => a is T}. As you can see, the predicate should
 * @param input {unknown} The value itself.
 * assert a type
 */

interface Be {
  <T>(predicate: (a: any) => a is T, input: unknown): T
  <T>(predicate: (a: any) => a is T): (input: unknown) => T
}
const be = function be<T>(predicate: (a: any) => a is T, input: unknown) {
  const partial = (input: unknown) => {
    if (!predicate(input))
      throw TypeError(`assertion failed on ${printValueInfo(input)}`)

    return input
  }

  return arguments.length >= 2 ? partial(input) : (partial as any)
} as Be

/**
 * Runs a decoding function, and if all the validations succeed, returns
 * the value. If something fails, falls back to another value (and optionally
 * logs the error).
 * @param decoder {D => T} The function that transforms input to the expected
 * resulting type (and throws upon meeting invalid data)
 * @param fallback {Fb} The fallback value (probably different from T)
 * @param input {In} The input data
 */
function fallback_<In, Out, Fb>(
  decoder: (data: In) => Out,
  fallback: Fb,
  input: In
): Out | Fb {
  try {
    return decoder(input)
  } catch (e) {
    /* If we ever add a custom error, we should replace all the
	   `new TypeError` invocations. But frankly, why not catch all
	   exceptions indiscriminately, even those not foreseen
	   by a programmer.
	*/
    return fallback
  }
}

function beObjectOf_<Out extends object, K extends keyof Out>(
  fieldDecoders: Record<K, (fld: unknown) => Out[K]>,
  input: unknown
): Out {
  if (!isObject(input)) throw new TypeError('Not an object')

  const result = {} as Out // getting ahead of ourselves, but
  Object.keys(fieldDecoders).forEach(key => {
    result[key as K] = fieldDecoders[key as K](
      (input as Record<K, unknown>)[key as K]
    )
  })

  return result
}

type BeArrayOptions = {
  /** What to invalidate on errors */
  invalidate?: 'element' | 'all'
  minLength?: number
}

function beArrayOf_<ElOut>(
  elDecoder: (el: unknown) => ElOut,
  { invalidate = 'element', minLength = 0 }: BeArrayOptions,
  input: unknown
): ElOut[] {
  if (!Array.isArray(input)) throw TypeError('Not an array')

  const result = []
  for (const el of input as unknown[]) {
    try {
      result.push(elDecoder(el))
    } catch (e) {
      switch (invalidate) {
        case 'element':
          break // swallow the error, move on to the next element
        case 'all':
          throw TypeError('invalid element')
      }
    }
  }

  if (result.length < minLength)
    throw TypeError(`Array length less than ${minLength}`)

  return result
}

function printValueInfo(value: any) {
  const valType = typeof value
  const lq = valType === 'string' ? '“' : ''
  const rq = valType === 'string' ? '”' : ''
  return `${lq + value + rq} (${typeof value})`
}

function isObject(value: unknown): value is object {
  return !!value && typeof value === 'object'
  // Unlike lodash, we consider typeof value === 'function' a negative
  // (getting a function after deserialization is probably a bug anyway)
}

export const fallback = curry(fallback_)
export const beObjectOf = curry(beObjectOf_)
export const beArrayOf = curry(beArrayOf_)

export { be }
