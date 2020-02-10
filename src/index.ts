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
  return makeDecoder(predicate, errorMessage)(val)
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
  /** What to invalidate on errors */
  invalidate?: {
    element?: 'single' | 'all'
    array?: 'fallback' | 'throw'
  }
  minLength?: number
  minLengthError?: string
  notAnArrayError?: string
}

export function decodeArray<Out, Fb>(
  input: unknown,
  elementDecoder: (el: unknown) => Out,
  fallback: Fb,
  {
    invalidate: { element = 'single', array = 'fallback' } = {},
    minLength = 0,
    minLengthError,
    notAnArrayError
  }: ArrayOptions = {}
): Out[] | Fb {
  const invalidateArray = (errorMaker: () => Error) => {
    switch (array) {
      case 'fallback':
        return fallback
      case 'throw':
        throw errorMaker()
    }
  }

  if (!Array.isArray(input))
    return invalidateArray(() =>
      TypeError(notAnArrayError || `${printValueInfo(input)} is not an array`)
    )

  const result = []
  for (const el of input as unknown[] /* TS fails to see fallbackOrThrow as
   an early exit*/) {
    try {
      result.push(elementDecoder(el))
    } catch (e) {
      switch (element) {
        case 'single':
          break // swallow the error, move on to the next element
        case 'all':
          return invalidateArray(() => e)
      }
    }
  }

  if (result.length < minLength)
    return invalidateArray(() =>
      Error(
        minLengthError ||
          `Array length (${result.length}) less than specified (${minLength})`
      )
    )

  return result
}

function printValueInfo(value: any) {
  const valType = typeof value
  const lq = valType === 'string' ? '“' : ''
  const rq = valType === 'string' ? '”' : ''
  return `${lq + value + rq} (${typeof value})`
}
