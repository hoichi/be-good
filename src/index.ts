import isArray from 'lodash/isArray'

/**
 * The base for the whole library. Run predicate on the value.
 * If predicate returns true, returns the value as is. Otherwise, throws
 * with the given message.
 * If you just want a condition, not a type assertion, use `beTrue`
 * @param val {any} The value itself.
 * @param predicate {(a: any) => a is T}. As you can see, the predicate should
 * assert a type
 * @param errorMessage {string}
 */
export function be<T>(
  val: any,
  predicate: (a: any) => a is T,
  errorMessage: string
): T {
  /**
   * @param val {any} The value itself.
   */
  return makeDecoder(predicate, errorMessage)(val);
}

export function makeDecoder<T>(
  predicate: (a: any) => a is T,
  errorMessage: string
): (val: any) => T {
  /**
   * @param val {any} The value itself.
   */
  return function decoderFunctionExn(val: any): T {
    if (predicate(val)) return val

    throw new TypeError(errorMessage)
  }
}

type CatchOptions = {
  logger?: (e: Error) => void
}

const noop = () => {}

/**
 * Runs a decoding function, and if all the validations succeed, returns
 * the value. If something fails, falls back to another value (and optionally
 * logs the error).
 * @param input {In} The input data
 * @param decoder {D => T} The function that transforms input to the expected
 * resulting type (and throws upon meeting invalid data)
 * @param fallback {Fb} The fallback value (probably different from T)
 * @param options {CatchOptions}
 */
export function decode<In, Out, Fb>(
  input: In,
  decoder: (data: In) => Out,
  fallback: Fb,
  { logger = noop }: CatchOptions = {}
): Out | Fb {
  try {
    return decoder(input)
  } catch (e) {
    /* If we ever add a custom error, we should replace all the
	   `new TypeError` invocations. But frankly, why not catch all
	   exceptions indiscriminately, even those not foreseen
	   by a programmer.
	*/
    logger(e)
    return fallback
  }
}

type ArrayOptions = {
  invalidateAll?: boolean
  minLength?: number
  minLengthError?: string
  notAnArrayError?: string
}

export function decodeArray<Out>(
  input: unknown,
  elementDecoder: (el: unknown) => Out,
  {
    invalidateAll,
    minLength = 0,
    minLengthError,
    notAnArrayError
  }: ArrayOptions = {}
): Out[] | null {
  if (!isArray(input))
    throw TypeError(
      notAnArrayError || `${printValueInfo(input)} is not an array`
    )

  const result = []
  for (const el of input) {
    try {
      result.push(elementDecoder(el))
    } catch (e) {
      if (invalidateAll) throw e
      // otherwise, don’t push the result, but swallow the exception,
      // effectively invalidating a single element, but not the whole array
    }
  }

  if (result.length < minLength) {
    throw Error(
      minLengthError ||
        `Array length (${result.length}) less than specified (${minLength})`
    )
  }
  return result
}

function printValueInfo(value: any) {
  const valType = typeof value
  const lq = valType === 'string' ? '“' : ''
  const rq = valType === 'string' ? '”' : ''
  return `${lq + value + rq} (${typeof value})`
}
