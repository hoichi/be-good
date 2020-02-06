import { isNumber, isString } from 'lodash'

import {be, decodeArray, decode, makeDecoder} from './index'

test('be', () => {
  const numError = 'Not a number!'

  expect(be(20, isNumber, numError)).toBe(20)
  expect(() => be('20', isNumber, numError)).toThrow(numError)
})

test('beArray: happy path', () => {
  expect(decodeArray([1, false, 'Bob'], el => el)).toStrictEqual([1, false, 'Bob'])
})

test('beArray: filtering', () => {
  expect(
    decodeArray(['a', 0, 'b', 1, 'c'], s => {
      if (typeof s !== 'string') throw Error('!')
      return { s }
    })
  ).toStrictEqual([{ s: 'a' }, { s: 'b' }, { s: 'c' }])
})

test('beArray: invalidate all', () => {
  expect(() =>
    decodeArray(
      ['a', 0, 'b', 1, 'c'],
      x => {
        if (typeof x !== 'string') throw Error('!!!')
        return x
      },
      { invalidateAll: true }
    )
  ).toThrow('!!!')
})

test('beArray: not an array', () => {
  expect(() => {
    decodeArray('[]', x => x)
  }).toThrow('“[]” (string) is not an array')

  expect(() => {
    decodeArray(3.14, x => x)
  }).toThrow('3.14 (number) is not an array')

  expect(() => {
    decodeArray('[]', x => x, {
      notAnArrayError: 'Not quite an array one would expect'
    })
  }).toThrow('Not quite an array one would expect')
})

test('beArray: checkLength', () => {
  expect(() =>
    decodeArray(
      [false, false, false, false, true],
      x => {
        if (!x) throw Error('!!!')
        return x
      },
      { minLength: 2, minLengthError: 'Way too short!' }
    )
  ).toThrow('Way too short!')

  expect(() =>
    decodeArray(
      [false, false, false, false, true],
      x => {
        if (!x) throw Error('!!!')
        return x
      },
      { minLength: 2 }
    )
  ).toThrow('Array length (1) less than specified (2)')
})

test('decode: validation ok', () => {
  expect(
    decode(
      ['foo', 'bar'],
      ([foo, bar]) => ({
        foo: be(foo, isString, 'Failed'),
        bar: be(bar, isString, 'Failed')
      }),
      null
    )
  ).toStrictEqual({
    foo: 'foo',
    bar: 'bar'
  })
})

test('decode: falling back', () => {
  const logger = jest.fn()

  expect(
    decode(
      void 0,
      () => ({
        foo: be('foo', isString, 'Failed'),
        bar: be('bar', isNumber, 'Failed')
      }),
      null,
      { logger }
    )
  ).toBe(null)

  expect(logger).toBeCalledWith(expect.objectContaining({ message: 'Failed' }))
})

test('decode: successful nested array', () => {
  expect(
    decode(
      { id: 3, animals: ['Cat', 'Dog', 'Siren'] },
      input => ({
        id: be(input.id, isNumber, 'Id should be a number'),
        animalNames: decodeArray(
          input.animals,
          makeDecoder(
            isString,
            'animal should have strings of characters as their names'
          )
            // fixme: maybe we should add a fallback parameter after all
            //  I mean, the only way to catch array validation errors here
            //  is `decode`, and wrapping `decodeArray` (a catching point in its
            //  own right) in `decode` eels rather weird
            //
            //  maybe we should have `invalidate: 'element' | 'array' | 'parent'
        )
      }),
      null
    )
  ).toStrictEqual({ id: 3, animalNames: ['Cat', 'Dog', 'Siren'] })
})
