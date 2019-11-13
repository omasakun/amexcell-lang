import { reg } from "./parser";

describe("reg", () => {
  it("/^(\d+)/", () => {
    const p = reg(/^(\d+)/);
    expect(p("hogemoge123")).toMatchInlineSnapshot(`null`);
    expect(p("123jkhsd")).toMatchInlineSnapshot(`
      Object {
        "t": "jkhsd",
        "v": Array [
          "123",
        ],
      }
    `);
    expect(p("123njk46")).toMatchInlineSnapshot(`
      Object {
        "t": "njk46",
        "v": Array [
          "123",
        ],
      }
    `);
    expect(p("0033")).toMatchInlineSnapshot(`
      Object {
        "t": "",
        "v": Array [
          "0033",
        ],
      }
    `);
    expect(p("hogefuga")).toMatchInlineSnapshot(`null`);
    expect(p("sdd567dsdds")).toMatchInlineSnapshot(`null`);
  });
});
