import { isNumber, isString } from 'lodash'

import { be, decode, decodeArray, decodeObject, makeDecoder } from './index'

test('be', () => {
  const numError = 'Not a number!'

  expect(be(20, isNumber, numError)).toBe(20)
  expect(() => be('20', isNumber, numError)).toThrow(numError)
})

test('decodeArray: happy path', () => {
  expect(decodeArray([1, false, 'Bob'], el => el, null)).toStrictEqual([
    1,
    false,
    'Bob'
  ])
})

test('decodeArray: filtering', () => {
  expect(
    decodeArray(['a', 0, 'b', 1, 'c'], makeDecoder(isString, '!'), null)
  ).toStrictEqual(['a', 'b', 'c'])
})

test('decodeArray: invalidate parent', () => {
  expect(() =>
    decodeArray(['a', 0, 'b', 1, 'c'], makeDecoder(isString, '!!!'), null, {
      invalidate: { element: 'all', array: 'throw' }
    })
  ).toThrow('!!!')
})

test('decodeArray: not an array', () => {
  expect(() => {
    decodeArray('[]', x => x, null, {
      invalidate: { element: 'all', array: 'throw' }
    })
  }).toThrow('“[]” (string) is not an array')

  expect(() => {
    decodeArray(3.14, x => x, null, {
      invalidate: { element: 'all', array: 'throw' }
    })
  }).toThrow('3.14 (number) is not an array')

  expect(decodeArray(false, x => x, 77)).toBe(77)
})

test('decodeArray: check length and throw', () => {
  expect(() =>
    decodeArray(
      [false, false, false, false, true],
      x => {
        if (!x) throw Error('!!!')
        return x
      },
      null,
      {
        minLength: 2,
        minLengthError: 'Way too short!',
        invalidate: { element: 'single', array: 'throw' }
      }
    )
  ).toThrow('Way too short!')
})

test('decodeArray: check length and fall back', () => {
  expect(
    decodeArray(
      [false, false, false, false, true],
      x => {
        if (!x) throw Error('!!!')
        return x
      },
      null,
      { minLength: 2 }
    )
  ).toBe(null)
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
          ),
          null
        )
      }),
      null
    )
  ).toStrictEqual({ id: 3, animalNames: ['Cat', 'Dog', 'Siren'] })
})

test('decodeObject: wrong member, fallback', () => {
  expect(
    decodeObject(
      {
        foo: 'foo',
        bar: 4
      },
      obj => ({
        foo: be(obj.foo, isString, 'foo should be a string'),
        bar: be(obj.bar, isString, 'bar should be a string')
      }),
      null
    )
  ).toBe(null)
})

test('decodeObject: wrong member, throw', () => {
  expect(() =>
    decodeObject(
      {
        foo: 'foo',
        bar: 4
      },
      obj => ({
        foo: be(obj.foo, isString, 'foo should be a string'),
        bar: be(obj.bar, isString, 'bar should be a string')
      }),
      null,
      { onFailure: 'propagate' }
    )
  ).toThrow('bar should be a string')
})

test('decodeObject: not an object, throw', () => {
  expect(() =>
    decodeObject(
      '{{-}}',
      obj => ({
        foo: be(obj.foo, isString, 'foo should be a string'),
        bar: be(obj.bar, isString, 'bar should be a string')
      }),
      null,
      { onFailure: 'propagate', notAnObjectErrMsg: 'You call that an object?' }
    )
  ).toThrow('You call that an object?')
})
