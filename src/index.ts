import isNumber from 'lodash/isNumber';

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
	errorMessage: string,
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
	errorMessage: string,
): T {
	if (predicate(val)) return val;

	throw new Error(errorMessage);
}

type CatchOptions = {
	logger?: (e: Error) => void;
}

const noop = () => {}

/**
 * Runs a decoding function, and if all the validations succeed, returns
 * the value. If something fails, falls back to another value (and optionally
 * logs the error).
 * @param make {() => T} The function that generates the expected type (and throws on invalid data)
 * @param fallback {U} The fallback value (probably different from T)
 * @param options {CatchOptions} 
 */
export function orBe<T, U>(
	make: () => T,
	fallback: U,
	{ logger = noop }: CatchOptions = {}
): T | U {
	try {
		return make()
	} catch(e) {
		/*
			If we ever add a custom error, we should replace all the
			`new TypeError` invocations. But frankly, why not catch all
			exceptions indiscriminately, even those not foreseen
			by a programmer.
		*/
		logger(e)
		return fallback
	}
}