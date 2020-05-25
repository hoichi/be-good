# Simple and Flexible Data Decoding

Work in progress. Full docs pending. API breakage not out of question.

## What it is

This is a set of building blocks for type-safe JSON decoders, written in and for
TypeScript. JSON decoders are well-known in languages like Elm or ReasonML, and
their goal is, basically, to validate external data and guarantee it really is
what the types say it is, so you can _safely_ rely on your types.

It’s functional in the right places, it’s imperative-friendly, it’s flexible—it
is, dare I say, pragmatic.

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

`be` takes a
[user-defined type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards).
E.g., lodash’s `isString` is typed as `(value: any): value is string`, so
TypeScript infers the `beString` return type as `string`.

The functions that `be` returns (like `beSting`) are called decoders. A decoder
is a function that takes an unknown value and returns a value of a proven type.

But, it is possible that a decoder cannot return a value of the necessary type,
e.g., the input is invalid. In those cases, a decoder _throws_. Therefore, you might
want to wrap all of your decoder invocations in `try/catch`, or...

### Or: catching decorators

The second base function is `or`: a factory for _catching decorators_. Sounds
complicated, but it’s actually quite simple:

```ts
import { be, or } from 'be-good'

const optional = or(undefined) // a catching decorator
const beString = be(isString) // + a decoder
const beOptionalString = optional(beString) // = a decorated decoder

beOptionalString('Catchers in the Rye') // 'Catchers in the Rye`
beOptionalString(-1) // undefined
```

To describe what happens above:

- you apply `or` to a value (here, `undefined`) and get back a decorator
- you apply the decorator to the decoder and get back a new decoder
- if the new decoder is given a valid input value (here, a string), it returns
  that value
- otherwise, it returns a fallback (`undefined`)

Obviously, the return type of `beOptionalString` here is not just `string`, but
`string | undefined`. On the other hand, nothing stops you from using a fallback
of the same type as the expected value:

```ts
const alwaysBeNumber = or(0)(be(isNumber))
```

And sure, you can create one-off decorators on the fly. On the other hand, you
may want to keep some of them (like the `optional` above) reusable across your
app.

### Decoding objects

There’s a pretty low-level decoder called `beObject` that simply asserts that
the value is indeed an object. It’s useful if you’re doing some non-standard
stuff, like transforming your data instead of simply decoding—we’ll cover those
scenarios later.

For the most scenarios, there’s a more convenient decoder: `beObjectOf`.

```ts
import { be, beObjectOf, or } from 'be-good'
import { isBoolean, isNumber, isString } from 'lodash'

const beBoolean = be(isBoolean)
const beNumber = be(isNumber)
const beString = be(isString)
const orNull = or(null)

type Mercenary = {
  name: string
  fee: number
  hasGun: boolean
  willTravel: boolean
}

const mercenaryDecoder = orNull(
  beObjectOf<Mercenary>({
    name: beString,
    fee: beNumber,
    hasGun: beBoolean,
    willTravel: beBoolean
  })
)
```

Never mind the silliness a mercenary without a gun that won’t travel (must be
real good at sitting by the river waiting for those bodies), here’s how the
decoder works.

```ts
mercenaryDecoder({ name: 'Al', fee: 100, hasGun: true, willTravel: true })
// input is an object, has all the fields, hence the decoder returns a Mercenary

mercenaryDecoder({
  name: 'Will',
  fee: 50_000_000,
  hasGun: true,
  willTravel: 'No, Will Smith'
})
// is object, right properties, wrong type, => null

mercenaryDecoder({
  name: 'Sara',
  hasGun: true,
  willTravel: true
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
type will be inferred from the property decoders you gave to `beObjectOf`: e.g.
`beObjectOf({ a: beString })` will have type `(x: unknown) => { a : string }`.
And since TypeScript types are structural, it doesn’t matter how the type is
called as long as the shape is right.

Then again, if you make a mistake in a property name or decoder you give to
`beObjectOf`, TypeScript will fail—somewhere—and the error message might point
to a place far from where the actual error is, and you’ll spend more time fixing
it. Better specify the expected type right inside a decoder (like above), or
maybe right outside of it, like this:

```ts
import { beOjbectOf, Decoder } from 'be-good'
// ...
const objDecoder: Decoder<Type> = optional(beObjectOf(/* ... */))
```

Fail early, I say.

## Collections: beArrayOf & beDictOf

`beArrayOf` and `beDictOf` are similar to `beObjectOf`, but their parameters
are a bit different. First, they take a single element decoder—meaning all
the elements are supposed to be of the same type. Second, the fabric has
some other options:

```ts
type BeCollectionOptions = {
  /** What to invalidate on errors */
  invalidate?: 'single' | 'all'
  /** Minimum count of (valid) collection elements */
  minSize?: number
}
```

Some examples:

```ts
const beNumber = be(isNumber)

beArrayOf(beNumber)([3, 25.4, false, -7])
// [3, 25.4, -7], because by default, `invalidate` option is 'singe',
// and that means simply omitting invalid elements

beArrayOf(beNumber, { invalidate: 'all' })([3, 25.4, false, -7])
// throws on the first bad element (use `or(...)`)

const orFallback = or('<fallback>') 
beArrayOf(orFallback(beNumber))([3, 25.4, false, -7])
// [3, 25.4, '<fallback>', -7], compare to the first example

beArrayOf(beNumber, { minSize: 4 })([3, 25.4, false, -7])
// throws: only 3 valid elements

/* beDictOf is about the same: */

beDictOf(beNumber)({ a: 3, b: 25.4, c: false, d: -7 })
// { a: 3, b: 25.4, d: -7 }
// etc...
```

## Custom predicates and custom decoders

The type guard functions from lodash is handy, but what if you want to check for
more?
 
```ts
const isEven = (n: unknown): n is number => isNumber(n) && n % 2 === 0;

const beEven = be(isEven) // unknown => number
```

If you dig opaque types, you can use them too (the enum trick taken from
[an article by Patrick Bacon](https://spin.atomicobject.com/2017/06/19/strongly-typed-date-string-typescript/)).

```ts
  enum PriceBrand {}
  type Price = number & PriceBrand
  const isPrice = (n: unknown): n is Price => isNumber(n) && n > 0
  const bePrice = be(isPrice) // unknown => price
```

You can also write whole custom decoders, be it because you cannot validate
fields separately, or because you need to ~~mess with~~ manipulate your data
structure:
 
```ts
import { be, beObject, fail, or } from 'be-good'

type Range = {
  min: number;
  max: number;
}

type rangeDecoder = or(null)((input: unknown): Range => {
  // note that the input properties differ from the output ones
  const { start, end } = beObject(input)

  if (!isNumber(start) || !isNumber(end) || end > start) fail('Invalid range')

  return { min: start, max: end }
})
```

Note how the earlier examples mostly compose functions. As you see here, you
don’t have to do it. Sure, here we still used a catching decorator™ (i.e. the
result of `or(null)`), but you can also create variables, fail the decoder
imperatively and do all the stuff you can normally can do in JavaScript—even
though we do recommend keeping your decoders pure. And sure, you could write
this particular decoder in a more functional fashion, but the point is you don’t
have too. `be-good` is not hellbent on forcing a particular programming style.
   
Another important thing is using `fail` to... well, fail the decoder. Notice
how, like `beObject`, `fail` is used inside a function wrapped in a catching
decorator. You don’t want unchecked exceptions everywhere. And while on one hand
you have to remember about the exceptions, on the other hand you’re not
recommended to throw exceptions manually. If you want to fail your decoder, call
`fail`. Right now it doesn’t do much, but it might in the future, so don’t break
the abstraction.  

## Todos

- [x] `beDictOf`
- [ ] proper Readme
- [ ] decoding sum types (discriminated unions)
- [ ] more examples
