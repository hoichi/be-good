import { isNumber, isString } from 'lodash'

import {
  be,
  beArrayOf,
  beDictOf,
  beObject,
  beObjectOf,
  fallback
} from './index'

const beString = be(isString)
const beNumber = be(isNumber)

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
    foo: beString('foo'),
    bar: beNumber('bar')
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
  expect(() => beArrayOf(beString)(null)).toThrow()
  expect(() => beArrayOf(beString)(77)).toThrow()
  expect(() => beArrayOf(beString)('seventy seventeen')).toThrow()
  expect(() => beArrayOf(beString)(true)).toThrow()
  expect(() => beArrayOf(beString)(false)).toThrow()
  expect(() => beArrayOf(beString)({ a: 'a', b: 'boooooo' })).toThrow()
})

test('beArrayOf: invalid elements', () => {
  // invalidate elements, by default...
  expect(beArrayOf(beString)(['1', '2', 3])).toStrictEqual(['1', '2'])
  expect(beArrayOf(beString, {})(['1', '2', 3])).toStrictEqual(['1', '2'])
  // ...and explicitly
  expect(
    beArrayOf(beString, { invalidate: 'single' })(['1', '2', 3])
  ).toStrictEqual(['1', '2'])

  // invalidate the whole array
  expect(() =>
    beArrayOf(beString, { invalidate: 'all' })(['1', '2', 3])
  ).toThrow()
})

test('beDictOf: min size', () => {
  // No lower limit by default
  expect(beArrayOf(beNumber)(['1', '2', '3'])).toStrictEqual([])
  expect(beArrayOf(beNumber, {})([])).toStrictEqual([])
  // ...and explicitly
  expect(
    beArrayOf(beNumber, {
      minSize: 1
    })(['1', '2', 3, 4])
  ).toStrictEqual([3, 4])
  expect(() => beArrayOf(beNumber, { minSize: 3 })(['1', '2', 3, 4])).toThrow()

  // invalidating array beats the length limit
  // (not that we’re checking the exact error)
  expect(() =>
    beArrayOf(beNumber, { invalidate: 'all', minSize: 1 })(['1', 2, 3])
  ).toThrow()

  expect(() =>
    beArrayOf(beNumber, {
      invalidate: 'single',
      minSize: 100
    })(['1', 3, 4])
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

test('beObject', () => {
  expect(() => beObject(null)).toThrow()
  expect(() => beObject(undefined)).toThrow()
  expect(() => beObject(22)).toThrow()
  expect(() => beObject('eleven')).toThrow()
  expect(() => beObject(() => {})).toThrow()

  // and now something positive
  expect(beObject({})).toStrictEqual({})
  expect(
    beObject({ name: undefined, surname: 'Johnson', 1: 'yes' })
  ).toStrictEqual({ name: undefined, surname: 'Johnson', 1: 'yes' })
})

test('beDictOf: happy path', () => {
  const decoder = beDictOf(<T>(el: T) => el)
  expect(decoder({ a: 2, b: true, c: 'Cinderella' })).toStrictEqual({
    a: 2,
    b: true,
    c: 'Cinderella'
  })

  // hmmm... are we sure we need this mess?
  expect(beDictOf(be(isString))(['a', 'boooooo'])).toStrictEqual({
    '0': 'a',
    '1': 'boooooo'
  })
})

test('beDictOf: not an object', () => {
  expect(() => beDictOf(be(isString))(null)).toThrow()
  expect(() => beDictOf(be(isString))(77)).toThrow()
  expect(() => beDictOf(be(isString))('seventy seventeen')).toThrow()
  expect(() => beDictOf(be(isString))(true)).toThrow()
  expect(() => beDictOf(be(isString))(false)).toThrow()
})

test('beDictOf: invalid elements', () => {
  const beString = be(isString)
  const input = {
    x: '1',
    y: '2',
    z: 3
  }

  // invalidate elements, by default...
  expect(beDictOf(beString)(input)).toStrictEqual({ x: '1', y: '2' })
  expect(beDictOf(beString, {})(input)).toStrictEqual({ x: '1', y: '2' })
  // ...and explicitly
  expect(beDictOf(beString, { invalidate: 'single' })(input)).toStrictEqual({
    x: '1',
    y: '2'
  })

  // invalidate the whole dictionary
  expect(() => beDictOf(beString, { invalidate: 'all' })(input)).toThrow()
})

test('beDictOf: min length', () => {
  // No lower limit by default
  expect(
    beDictOf(beNumber)({ foo: '1', bar: false, baz: ['3'] })
  ).toStrictEqual({})
  expect(beDictOf(beNumber, {})({})).toStrictEqual({})

  // ...and explicitly
  expect(
    beDictOf(beNumber, { minSize: 1 })({
      one: '1',
      two: '2',
      three: 3,
      four: 4
    })
  ).toStrictEqual({ three: 3, four: 4 })
  expect(() =>
    beDictOf(beNumber, { minSize: 3 })({
      one: '1',
      two: '2',
      three: 3,
      four: 4
    })
  ).toThrow()

  // invalidating array beats the length limit
  // (not that the test is checking the exact error)
  expect(() =>
    beDictOf(beNumber, { invalidate: 'all', minSize: 1 })({
      a: 'a',
      two: 2,
      three: 3
    })
  ).toThrow()
  expect(() =>
    beDictOf(beNumber, { invalidate: 'all', minSize: 100 })({
      a: 'a',
      two: 2,
      four: 4
    })
  ).toThrow()
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
