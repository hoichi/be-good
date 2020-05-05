import { isNumber, isString } from 'lodash'

import { be, fallback, beArrayOf, beObjectOf } from './index'

test('be', () => {
  expect(be(isNumber)(20)).toBe(20)
  expect(() => be(isNumber)('20')).toThrow()

  // same but partial
  const beString = be(isString)
  expect(() => beString(20)).toThrow()
  expect(beString('twenty')).toEqual('twenty')
})

test('fallback basics', () => {
  const misdecoder = (_: any) => ({
    foo: be(isString)('foo'),
    bar: be(isNumber)('bar')
  })

  expect(() => misdecoder(undefined)).toThrow()
  const decoderWithFallback = fallback('fallen supine')(misdecoder)
  expect(decoderWithFallback(undefined)).toBe('fallen supine')
})

test('beArrayOf: happy path', () => {
  const decoder = beArrayOf(<T>(el: T) => el)
  expect(decoder([2, true, 'Cinderella'])).toStrictEqual([
    2,
    true,
    'Cinderella'
  ])
})

test('beArrayOf: not an array', () => {
  expect(() => beArrayOf(be(isString))(null)).toThrow()
  expect(() => beArrayOf(be(isString))(77)).toThrow()
  expect(() => beArrayOf(be(isString))('seventy seventeen')).toThrow()
  expect(() => beArrayOf(be(isString))(true)).toThrow()
  expect(() => beArrayOf(be(isString))(false)).toThrow()
  expect(() => beArrayOf(be(isString))({ a: 'a', b: 'boooooo' })).toThrow()
})

test('beArrayOf: invalid elements', () => {
  const elDecoder = be(isString)

  // invalidate elements, by default...
  expect(beArrayOf(elDecoder)(['1', '2', 3])).toStrictEqual(['1', '2'])
  expect(beArrayOf(elDecoder, {})(['1', '2', 3])).toStrictEqual(['1', '2'])
  // ...and explicitly
  expect(
    beArrayOf(elDecoder, { invalidate: 'element' })(['1', '2', 3])
  ).toStrictEqual(['1', '2'])

  // invalidate the whole array
  expect(() =>
    beArrayOf(elDecoder, { invalidate: 'array' })(['1', '2', 3])
  ).toThrow()
})

test('beArrayOf: min length', () => {
  const elDecoder = be(isNumber)

  // No lower limit by default
  expect(beArrayOf(elDecoder)(['1', '2', '3'])).toStrictEqual([])
  expect(beArrayOf(elDecoder, {})([])).toStrictEqual([])
  // ...and explicitly
  expect(
    beArrayOf(elDecoder, { minLength: 1 })(['1', '2', 3, 4])
  ).toStrictEqual([3, 4])
  expect(() =>
    beArrayOf(elDecoder, { minLength: 3 })(['1', '2', 3, 4])
  ).toThrow()

  // invalidating array beats the length limit
  // (not that we’re checking the exact error)
  expect(() =>
    beArrayOf(elDecoder, { invalidate: 'array', minLength: 1 })(['1', 2, 3])
  ).toThrow()
  expect(() =>
    beArrayOf(elDecoder, { invalidate: 'array', minLength: 100 })(['1', 3, 4])
  ).toThrow()
})

test('beObjectOf: happy path', () => {
  const antoine = {
    name: 'Tony',
    age: 44
  }
  const personDecoder = beObjectOf({
    name: be(isString),
    age: be(isNumber)
  })

  expect(personDecoder(antoine)).toStrictEqual(antoine)
  // extra fields are simply ignored
  expect(
    personDecoder({
      ...antoine,
      hobby: ['tea', 'bonsai'],
      catsOwned: 1
    })
  ).toStrictEqual(antoine)
})

test('beObjectOf: not an object', () => {
  const personDecoder = beObjectOf({
    name: be(isString),
    age: be(isNumber)
  })

  expect(() => personDecoder(null)).toThrow()
  expect(() => personDecoder(77)).toThrow()
  expect(() => personDecoder('seventy seventeen')).toThrow()
  expect(() => personDecoder(true)).toThrow()
  expect(() => personDecoder(false)).toThrow()

  // array _is_ an object (if you’re brave enough)
  const arr = [1, 2, 'five', { true: false }]
  // @ts-ignore
  arr.name = 'Joe'
  // @ts-ignore
  arr.age = 33
  expect(Array.isArray(arr)).toBe(true)
  expect(personDecoder(arr)).toStrictEqual({ name: 'Joe', age: 33 })
  expect(() => personDecoder([])).toThrow()
})

test('beObjectOf: field decoding failure', () => {
  const bob = {
    name: 'Bob',
    age: 37
  }
  const constantine = {
    name: 'Constantine',
    age: 'of Empires'
  }

  const numAgeDecoder = beObjectOf({ name: be(isString), age: be(isNumber) })
  const stringAgeDecoder = beObjectOf({ name: be(isString), age: be(isString) })

  expect(numAgeDecoder(bob)).toStrictEqual(bob)
  expect(() => numAgeDecoder(constantine)).toThrow()

  expect(() => stringAgeDecoder(bob)).toThrow()
  expect(stringAgeDecoder(constantine)).toStrictEqual(constantine)
})

test('beObjectOf: fallback', () => {
  const bob = {
    name: 'Bob',
    age: 37
  }
  const constantine = {
    name: 'Constantine',
    age: 'of Empires'
  }

  const numAgeDecoder = beObjectOf({ name: be(isString), age: be(isNumber) })
  const stringAgeDecoder = beObjectOf({ name: be(isString), age: be(isString) })

  expect(() =>
    beObjectOf({
      name: be(isString),
      age: be(isString)
    })(bob)
  ).toThrow()
  expect(
    beObjectOf({
      name: be(isString),
      age: fallback(0)(be(isString))
    })(bob)
  ).toStrictEqual({ name: 'Bob', age: 0 })
})

/*
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
*/
