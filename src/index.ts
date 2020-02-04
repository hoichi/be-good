import isArray from "lodash/isArray";

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
  if (predicate(val)) return val;

  throw new TypeError(errorMessage);
}

/**
 * Checks for a condition that is not a type assertion. Ergo cannot
 * narrow done the value type and returns the same type it gets.
 * If you want to assert and narrow down types, use `be`.
 * @param val {T} The value itself.
 * @param predicate: {(a: T) => boolean}.
 * @param errorMessage {string}
 */
export function beTrue<T>(
  val: T,
  predicate: (a: T) => boolean,
  errorMessage: string
): T {
  if (predicate(val)) return val;

  throw new Error(errorMessage);
}

type CatchOptions = {
  logger?: (e: Error) => void;
};

const noop = () => {};

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
    return decoder(input);
  } catch (e) {
    /* If we ever add a custom error, we should replace all the
	   `new TypeError` invocations. But frankly, why not catch all
	   exceptions indiscriminately, even those not foreseen
	   by a programmer.
	*/
    logger(e);
    return fallback;
  }
}

// todo: fallback()
// something like orNull, simpler than the whole decode

type ArrayOptions = {
  invalidateAll?: boolean;
  minLength?: number;
};

export function beArray<Out>(
  input: unknown,
  elDecoder: (el: unknown) => Out,
  { invalidateAll, minLength = Infinity }: ArrayOptions = {}
): Out[] | null {
  if (!isArray(input)) return null; // todo: customize

  const result = [];
  for (const el of input) {
    try {
      result.push(elDecoder(el));
    } catch (e) {
      if (invalidateAll) throw e;
      // otherwise, don’t push the result, but swallow the exception,
      // effectively invalidating the single element, but not the whole array
		// todo: but shouldn’t `decode` log those errors? then every
		//  `orNull` and `fallback` should rethrow or smth
		//  Or, we should introduce verbosity/severity
		//  Or, decode should be a logging point, but fallback should mean it’s
		//  ok to fall back
    }
  }

  return result.length < minLength ? result : null;
}
