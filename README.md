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

const optional = or(undefined)  // a catching decorator
const beString = be(isString)   // a decoder    
const beOptionalString = optional(beString) // a decorated decoder

beOptionalString('Catchers in the Rye')  // 'Catchers in the Rye`
beOptionalString(-1)  // undefined
```

So:

- you provide a value (here, `undefined`) to the `or` and get a decorator
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

## Todos

- [x] `beDictOf`
- [ ] proper Readme
- [ ] more examples
- [ ] lenses? we have getters
