# Simple and Flexible Data Decoding

Work in progress. Full docs pending. API breakage not out of question.

## What it is

This is a set of building blocks for type-safe JSON decoders, written in and for
 TypeScript. JSON decoders are well-known in languages like Elm or ReasonML
 , and their goal is, basically, to validate external data and guarantee it
  really is what the types say it is, so you can _safely_ rely on your types.
  
It’s functional in the right places, it’s compatible with a lot of imperative
 code, it’s flexible—it is, dare I say, pragmatic.

## Installation

```shell script
yarn add be-good
```

Or

```shell script
npm i -S be-good
```

## Usage

### Basics: be

The basest building block is the `be` fabric:

```ts
import isString from 'lodash/isString'
import { be } from 'be-good'

const beString = be(isString)
```

`be` takes a [user-defined type guard](https://www.typescriptlang.org/docs
/handbook/advanced-types.html#user-defined-type-guards). E.g., lodash’s
 `isString` is typed as `(value?: any): value is string`, so TypeScript infers
  the `beString` return type as `string`.  

The functions that `be` returns (like `beSting`) are called decoders. A
 decoder is a function that takes an unknown value and returns a value of a proven type.
 
But, it is possible that a decoder cannot return a value of the necessary type
, e.g., the input is invalid. In those cases, a decoder _throws_. So, you
 might want to wrap all of your decoder invocations in `try/catch`, or...
 
 ### Or: catching decorators
 
 The second base function is `or`: a factory for _catching decorators_
 . Sounds complicated, but it’s actually quite simple:
 
```ts
import { be, or } from 'be-good'

const optional = or(undefined)              // a catching decorator
const beString = be(isString)               // + a decoder    
const beOptionalString = optional(beString) // = a decorated decoder

beOptionalString('Catchers in the Rye')  // 'Catchers in the Rye`
beOptionalString(-1)  // undefined
```

To describe what happens above:

- you apply `or` to a value (here, `undefined`) and get back a decorator
- you apply the decorator to the decoder and get back a new decoder
- if the new decoder is given a valid input value (here, a string), it returns
 that value
- otherwise, it returns a fallback (`undefined`)
 
 Obviously, the return type of `beOptionalString ` here is not just `string `, but `string | undefined`. On the other hand, nothing stops you from using a fallback of the same type as the expected value:
 
 ```ts
const alwaysBeNumber = or(0)(be(isNumber))
``` 

And sure, you can create one-off decorators on the fly. On the other hand
, you may want to keep some of them (like the `optional` above) reusable.

### Decoding objects

There’s a pretty low-level decoder called `beObject` that simply asserts that
 the value is indeed an object. It’s useful if you’re doing some
  non-standard stuff, like transforming your data instead of simply decoding
  –we’ll cover those scenarios later.

For the most scenarios, there’s a more convenient decoder: `beObjectOf`.

```ts
import { be, beObjectOf, or } from 'be-good'
import { isBoolean, isNumber, isString } from 'lodash'

const beBoolean = be(isBoolean)
const beNumber = be(isNumber)
const beString = be(isString)
const orNull = or(null)

type Mercenary = {
  name: string,
  fee: number,
  hasGun: boolean,
  willTravel: boolean
}

const mercenaryDecoder = orNull(beObjectOf<Mercenary>({
  name: beString,
  fee: beNumber,
  hasGun: beBoolean,
  willTravel: beBoolean
}))
```

Never mind the silliness a mercenary without a gun that won’t travel (must
 be real good at sitting by the river waiting for those bodies), here’s
  how the decoder works.
  
```ts
mercenaryDecoder({ name: 'Al', fee: 100, hasGun: true, willTravel: true })
// input is an object, has all the fields, hence the decoder returns a Mercenary

mercenaryDecoder({
  name: 'Will', fee: 50_000_000, hasGun: true, willTravel: 'No, Will Smith'
})
// is object, right properties, wrong type, => null

mercenaryDecoder({
  name: 'Sara', hasGun: true, willTravel: true
})
// is object, missing fields, => null

mercenaryDecoder('I’m a mercenary, honest!')
// duh, not even an object => null

mercenaryDecoder({
  name: 'Spike',
  middleName: 'Danger',
  anotherMiddleName: 'Caution',
  surName: 'DeGuano',
  maidenName: 'Von Ulyanov',
  fee: 20,
  hasGun: false,
  willTravel: true
})
// extra properties don’t matter => Mercenary
```

### A note on generics and type inference

Actually, you don’t have to write `beObjectOf<Mercenary>`. The decoder return
 type will be inferred from the property decoders you gave to `beObjectOf`:
 e.g. `beObjectOf({ a: beString })` will have type `(x: unknown) => { a
 : string }`. And since TypeScript types are structural, it doesn’t matter
  how the type is called as long as the shape is right.

On the other hand, if you make a mistake in a property name or decoder you
 give to `beObjectOf`, TypeScript will fail—somewhere—but the error message
  might point to a place far from where the actual error is, and you’ll spend more time fixing it. So I’d recommend specifying the expected type right inside a decoder (like above), or maybe right outside of it, like this:
 
 ```ts
import { beOjbectOf, Decoder } from 'be-good'
// ...
const objDecoder: Decoder<Type> = optional(beObjectOf(/* ... */))
 ```

Fail early, I’d say.

## Todos

- [x] `beDictOf`
- [ ] proper Readme
- [ ] decoding sum types (discriminated unions)
- [ ] more examples
- [ ] lenses?
