import { pipe } from "@fp-ts/data/Function"
import * as T from "@fp-ts/data/These"
import * as set from "@fp-ts/schema/data/Set"
import * as DE from "@fp-ts/schema/DecodeError"
import * as D from "@fp-ts/schema/Decoder"
import * as JD from "@fp-ts/schema/JsonDecoder"
import * as S from "@fp-ts/schema/Schema"

const decoderFor = JD.provideJsonDecoderFor(set.Provider)

describe("JsonDecoder", () => {
  describe("provideJsonDecoderFor", () => {
    it("declaration", () => {
      const schema = set.schema(S.number)
      const decoder = decoderFor(schema)
      expect(decoder.decode([])).toEqual(D.succeed(new Set()))
      expect(decoder.decode([1, 2, 3])).toEqual(D.succeed(new Set([1, 2, 3])))

      expect(decoder.decode(null)).toEqual(D.fail(DE.notType("ReadonlyArray<unknown>", null)))
      expect(decoder.decode([1, "a", 3])).toEqual(D.fail(DE.notType("number", "a")))
    })

    it("string", () => {
      const schema = S.string
      const decoder = decoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode(1)).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("number", () => {
      const schema = S.number
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode("a")).toEqual(D.fail(DE.notType("number", "a")))
    })

    it("boolean", () => {
      const schema = S.boolean
      const decoder = decoderFor(schema)
      expect(decoder.decode(true)).toEqual(D.succeed(true))
      expect(decoder.decode(false)).toEqual(D.succeed(false))
      expect(decoder.decode(1)).toEqual(D.fail(DE.notType("boolean", 1)))
    })

    it("of", () => {
      const schema = S.of(1)
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode("a")).toEqual(D.fail(DE.notEqual(1, "a")))
    })

    it("tuple", () => {
      const schema = S.tuple(S.string, S.number)
      const decoder = decoderFor(schema)
      expect(decoder.decode(["a", 1])).toEqual(D.succeed(["a", 1]))

      expect(decoder.decode(["a"])).toEqual(D.fail(DE.notType("number", undefined)))
      expect(decoder.decode({})).toEqual(D.fail(DE.notType("ReadonlyArray<unknown>", {})))
    })

    it("union", () => {
      const schema = S.union(S.string, S.number)
      const decoder = decoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode(1)).toEqual(D.succeed(1))

      expect(decoder.decode(null)).toEqual(
        T.left([DE.notType("string", null), DE.notType("number", null)])
      )
    })

    it("struct", () => {
      const schema = S.struct({ a: S.string, b: S.number })
      const decoder = decoderFor(schema)
      expect(decoder.decode({ a: "a", b: 1 })).toEqual(D.succeed({ a: "a", b: 1 }))

      expect(decoder.decode({ a: "a" })).toEqual(D.fail(DE.notType("number", undefined)))
    })

    it("indexSignature", () => {
      const schema = S.indexSignature(S.string)
      const decoder = decoderFor(schema)
      expect(decoder.decode({})).toEqual(D.succeed({}))
      expect(decoder.decode({ a: "a" })).toEqual(D.succeed({ a: "a" }))

      expect(decoder.decode([])).toEqual(
        D.fail(DE.notType("{ readonly [_: string]: unknown }", []))
      )
      expect(decoder.decode({ a: 1 })).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("array", () => {
      const schema = S.array(S.string)
      const decoder = decoderFor(schema)
      expect(decoder.decode([])).toEqual(D.succeed([]))
      expect(decoder.decode(["a"])).toEqual(D.succeed(["a"]))
      expect(decoder.decode(["a", "b", "c"])).toEqual(D.succeed(["a", "b", "c"]))

      expect(decoder.decode([1])).toEqual(D.fail(DE.notType("string", 1)))
    })

    it("minLength", () => {
      const schema = pipe(S.string, S.minLength(1))
      const decoder = decoderFor(schema)
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode("aa")).toEqual(D.succeed("aa"))

      expect(decoder.decode("")).toEqual(D.fail(DE.minLength(1)))
    })

    it("maxLength", () => {
      const schema = pipe(S.string, S.maxLength(2))
      const decoder = decoderFor(schema)
      expect(decoder.decode("")).toEqual(D.succeed(""))
      expect(decoder.decode("a")).toEqual(D.succeed("a"))
      expect(decoder.decode("aa")).toEqual(D.succeed("aa"))

      expect(decoder.decode("aaa")).toEqual(D.fail(DE.maxLength(2)))
    })

    it("min", () => {
      const schema = pipe(S.number, S.min(1))
      const decoder = decoderFor(schema)
      expect(decoder.decode(1)).toEqual(D.succeed(1))
      expect(decoder.decode(2)).toEqual(D.succeed(2))

      expect(decoder.decode(0)).toEqual(D.fail(DE.min(1)))
    })

    it("max", () => {
      const schema = pipe(S.number, S.max(1))
      const decoder = decoderFor(schema)
      expect(decoder.decode(0)).toEqual(D.succeed(0))
      expect(decoder.decode(1)).toEqual(D.succeed(1))

      expect(decoder.decode(2)).toEqual(D.fail(DE.max(1)))
    })

    it("lazy", () => {
      interface A {
        readonly a: string
        readonly as: ReadonlyArray<A>
      }
      const schema: S.Schema<A> = S.lazy<A>(() =>
        S.struct({
          a: S.string,
          as: S.array(schema)
        })
      )
      const decoder = decoderFor(schema)
      expect(decoder.decode({ a: "a1", as: [] })).toEqual(D.succeed({ a: "a1", as: [] }))
      expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [] }] })).toEqual(
        D.succeed({ a: "a1", as: [{ a: "a2", as: [] }] })
      )
      expect(decoder.decode({ a: "a1", as: [{ a: "a2", as: [1] }] })).toEqual(
        D.fail(DE.notType("{ readonly [_: string]: unknown }", 1))
      )
    })
  })
})