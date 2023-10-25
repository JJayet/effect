import { OtelSpan } from "@effect/opentelemetry/internal/tracer"
import * as NodeSdk from "@effect/opentelemetry/NodeSdk"
import * as Resource from "@effect/opentelemetry/Resource"
import * as it from "@effect/opentelemetry/test/utils/extend"
import * as OtelApi from "@opentelemetry/api"
import { AsyncHooksContextManager } from "@opentelemetry/context-async-hooks"
import { InMemorySpanExporter, SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Layer from "effect/Layer"

const TracingLive = NodeSdk.layer(() => ({
  spanProcessor: new SimpleSpanProcessor(new InMemorySpanExporter())
})).pipe(
  Layer.use(Resource.layer({ serviceName: "test" }))
)

// needed to test context propagation
const contextManager = new AsyncHooksContextManager()
OtelApi.context.setGlobalContextManager(contextManager)

describe("Tracer", () => {
  describe("provided", () => {
    it.effect("withSpan", () =>
      Effect.provide(
        Effect.withSpan("ok")(
          Effect.gen(function*(_) {
            const span = yield* _(Effect.flatMap(Effect.currentSpan, identity))
            expect(span).instanceOf(OtelSpan)
          })
        ),
        TracingLive
      ))

    it.effect("withSpan links", () =>
      Effect.gen(function*(_) {
        const linkedSpan = yield* _(Effect.makeSpanScoped("B"))
        const span = yield* _(
          Effect.currentSpan,
          Effect.flatten,
          Effect.withSpan("A"),
          Effect.linkSpans(linkedSpan)
        )
        assert(span instanceof OtelSpan)
        expect(span.links.length).toBe(1)
      }).pipe(
        Effect.scoped,
        Effect.provide(TracingLive)
      ))

    it.effect("supervisor sets context", () =>
      Effect.provide(
        Effect.withSpan("ok")(
          Effect.sync(() => {
            expect(OtelApi.trace.getSpan(OtelApi.context.active())).toBeDefined()
          })
        ),
        TracingLive
      ))

    it.effect("supervisor sets context generator", () =>
      Effect.gen(function*(_) {
        yield* _(Effect.yieldNow())
        expect(OtelApi.trace.getSpan(OtelApi.context.active())).toBeDefined()
      }).pipe(
        Effect.withSpan("ok"),
        Effect.provide(TracingLive)
      ))
  })

  describe("not provided", () => {
    it.effect("withSpan", () =>
      Effect.withSpan("ok")(
        Effect.gen(function*(_) {
          const span = yield* _(Effect.flatMap(Effect.currentSpan, identity))
          expect(span).not.instanceOf(OtelSpan)
        })
      ))
  })
})