import { isNumber, isString } from "lodash";

import { be, beArray, beTrue, decode } from "./index";

test("be", () => {
  const numError = "Not a number!";

  expect(be(20, isNumber, numError)).toBe(20);
  expect(() => be("20", isNumber, numError)).toThrow(numError);
});

test("beTrue", () => {
  const fiverError = "Not equals to 5.5!";
  const eq = (m: number) => (n: number) => n === m;

  expect(beTrue(5.5, eq(5.5), fiverError)).toBe(5.5);
  expect(() => beTrue(5.7, eq(5.5), fiverError)).toThrow(fiverError);
});

test("decode: validation ok", () => {
  expect(
    decode(
      ["foo", "bar"],
      ([foo, bar]) => ({
        foo: be(foo, isString, "Failed"),
        bar: beTrue(bar, s => s === "bar", "Failed")
      }),
      null
    )
  ).toStrictEqual({
    foo: "foo",
    bar: "bar"
  });
});

test("decode: falling back", () => {
  const logger = jest.fn();

  expect(
    decode(
      void 0,
      () => ({
        foo: be("foo", isString, "Failed"),
        bar: beTrue("bar", s => s === "foo", "Failed")
      }),
      null,
      { logger }
    )
  ).toBe(null);

  expect(logger).toBeCalledWith(expect.objectContaining({ message: "Failed" }));
});

test("beArray: happy path", () => {
  expect(beArray([1, false, "Bob"], el => el)).toStrictEqual([1, false, "Bob"]);
});

test("beArray: filtering", () => {
  expect(
    beArray(["a", 0, "b", 1, "c"], s => {
      if (typeof s !== "string") throw Error("!");
      return { s };
    })
  ).toStrictEqual([{ s: "a" }, { s: "b" }, { s: "c" }]);
});

test("beArray: invalidate all", () => {
  expect(() =>
    beArray(
      ["a", 0, "b", 1, "c"],
      x => {
        if (typeof x !== "string") throw Error("!!!");
        return x;
      },
      { invalidateAll: true }
    )
  ).toThrow("!!!");
});

test("beArray: not an array", () => {
  expect(() => {
    beArray("[]", x => x);
  }).toThrow("“[]” (string) is not an array");

  expect(() => {
    beArray(3.14, x => x);
  }).toThrow("3.14 (number) is not an array");

  expect(() => {
    beArray("[]", x => x, {
      notAnArrayError: "Not quite an array one would expect"
    });
  }).toThrow("Not quite an array one would expect");
});

test("beArray: checkLength", () => {
  expect(() =>
    beArray(
      [false, false, false, false, true],
      x => {
        if (!x) throw Error("!!!");
        return x;
      },
      { minLength: 2, minLengthError: "Way too short!" }
    )
  ).toThrow("Way too short!");

  expect(() =>
    beArray(
      [false, false, false, false, true],
      x => {
        if (!x) throw Error("!!!");
        return x;
      },
      { minLength: 2 }
    )
  ).toThrow("Array length (1) less than specified (2)");
});
