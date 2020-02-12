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

// todo: flatten
//  ( too complicated for adding new stuff
//    and not too consistent with ObjectDecodeOptions
// todo: jsdoc
type DecodeArrayOptions = {
  /** What to invalidate on errors */
  invalidate?: {
    element?: 'single' | 'all'
    array?: 'fallback' | 'throw'
  }
  minLength?: number
  minLengthError?: string
  notAnArrayError?: string
}

/**
 * Decodes an array, if it is an array. Runs decoders on its elements.
 * Catches their errors.
 * @param input {unknown} The input, hopefully, an array
 * @param elementDecoder {(el: unknown) => Out} Should decode an element,
 * returning a value of the expected type, or throw
 * @param fallback {Fb} Returned is something is wrong with the element.
 * Note that decodeArray might throw instead, depending on the options
 * @param options {DecodeArrayOptions}
 */
export function decodeArray<Out, Fb>(
  input: unknown,
  elementDecoder: (el: unknown) => Out,
  fallback: Fb,
  {
    invalidate: { element = 'single', array = 'fallback' } = {},
    minLength = 0,
    minLengthError,
    notAnArrayError
  }: DecodeArrayOptions = {}
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

type DecodeObjectOptions = {
  onFailure?: 'fallback' | 'propagate'
  notAnObjectErrMsg?: string
}

// todo: jsdoc
export function decodeObject<Out extends object, Fb>(
  input: unknown,
  objectDecoder: (obj: Record<string, unknown>) => Out,
  fallback: Fb,
  { onFailure = 'fallback', notAnObjectErrMsg }: DecodeObjectOptions = {}
): Out | Fb {
  if (!isObject(input)) {
    switch (onFailure) {
      case 'propagate':
        throw notAnObjectErrMsg ||
          TypeError(printValueInfo(input) + ' is not an object')
      case 'fallback':
      default:
        return fallback
    }
  }

  try {
    return objectDecoder(input as Record<string, unknown>)
  } catch (e) {
    switch (onFailure) {
      case 'propagate':
        throw e
      case 'fallback':
      default:
        return fallback
    }
  }
}

// todo: manual decoding with be(isArray), be(isObject) and rearranging

function printValueInfo(value: any) {
  const valType = typeof value
  const lq = valType === 'string' ? '“' : ''
  const rq = valType === 'string' ? '”' : ''
  return `${lq + value + rq} (${typeof value})`
}

function isObject(value: unknown) {
  return !!value && typeof value === 'object'
  // Unlike lodash, we consider tyoeof value === 'function' a negative
  // (getting a function after deserialization is probably a bug anyway)
}
