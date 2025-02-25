import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("ReadonlyMap > readonlyMap", () => {
  it("property tests", () => {
    Util.roundtrip(S.readonlyMap({ key: S.number, value: S.string }))
  })

  it("decoding", async () => {
    const schema = S.readonlyMap({ key: S.number, value: S.string })
    await Util.expectDecodeUnknownSuccess(schema, [], new Map())
    await Util.expectDecodeUnknownSuccess(
      schema,
      [[1, "a"], [2, "b"], [3, "c"]],
      new Map([[1, "a"], [2, "b"], [3, "c"]])
    )

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(ReadonlyArray<readonly [number, string]> <-> ReadonlyMap<number, string>)
└─ From side transformation failure
   └─ Expected ReadonlyArray<readonly [number, string]>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      [[1, "a"], [2, 1]],
      `(ReadonlyArray<readonly [number, string]> <-> ReadonlyMap<number, string>)
└─ From side transformation failure
   └─ ReadonlyArray<readonly [number, string]>
      └─ [1]
         └─ readonly [number, string]
            └─ [1]
               └─ Expected a string, actual 1`
    )
  })

  it("encoding", async () => {
    const schema = S.readonlyMap({ key: S.number, value: S.string })
    await Util.expectEncodeSuccess(schema, new Map(), [])
    await Util.expectEncodeSuccess(schema, new Map([[1, "a"], [2, "b"], [3, "c"]]), [[1, "a"], [
      2,
      "b"
    ], [3, "c"]])
  })
})
