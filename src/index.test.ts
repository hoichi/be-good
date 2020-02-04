import { isNumber, isString } from "lodash";

import { be, beTrue, decode } from "./index";

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

test("orBe: validation ok", () => {
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

test("orBe: falling back", () => {
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
