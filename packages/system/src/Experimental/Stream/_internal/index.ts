// tracing: off

import "../../../Operator"

import * as Cause from "../../../Cause"
import * as Chunk from "../../../Collections/Immutable/Chunk"
import * as T from "../../../Effect"
import { identity } from "../../../Function"
import * as M from "../../../Managed"
import * as O from "../../../Option"
import * as C from "../Channel"
import * as Sink from "../Sink"

export const StreamTypeId = Symbol()
export type StreamTypeId = typeof StreamTypeId

/**
 * A `Stream<R, E, A>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `A`, may fail with errors of type `E`
 * and uses an environment of type `R`.
 * One way to think of `Stream` is as a `Effect` program that could emit multiple values.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage buffers
 * between operators. As an optimization, `Stream` does not emit single values, but
 * rather an array of values. This allows the cost of effect evaluation to be
 * amortized.
 *
 * `Stream` forms a monad on its `A` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `Effect` (with some
 * adjustments for the multiple-valued nature of `Stream`). These aspects allow
 * for rich and expressive composition of streams.
 */
export class Stream<R, E, A> {
  readonly _typeId: StreamTypeId = StreamTypeId;
  readonly [T._R]!: (_: R) => void;
  readonly [T._E]!: () => E;
  readonly [T._A]!: () => A

  constructor(
    readonly channel: C.Channel<
      R,
      unknown,
      unknown,
      unknown,
      E,
      Chunk.Chunk<A>,
      unknown
    >
  ) {}
}

/**
 * Empty stream
 */
export const empty = fromChunk(Chunk.empty<never>())

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 */
export function chain_<R, E, O, R1, E1, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => Stream<R1, E1, O1>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    C.concatMap_(self.channel, (o) =>
      Chunk.reduce_(
        Chunk.map_(o, (x) => f(x).channel),
        C.unit as C.Channel<
          R1,
          unknown,
          unknown,
          unknown,
          E1,
          Chunk.Chunk<O1>,
          unknown
        >,
        (s, a) => C.chain_(s, () => a)
      )
    )
  )
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 *
 * @dataFirst chain_
 */
export function chain<O, R1, E1, O1>(
  f: (o: O) => Stream<R1, E1, O1>
): <R, E>(self: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (self) => chain_(self, f)
}

/**
 * Halt a stream with the specified exception
 */
export function die(u: unknown): Stream<unknown, never, never> {
  return new Stream(C.die(u))
}

/**
 * Halt a stream with the specified exception
 */
export function dieWith(u: () => unknown): Stream<unknown, never, never> {
  return new Stream(C.dieWith(u))
}

/**
 * Halt a stream with the specified error
 */
export function fail<E>(error: E): Stream<unknown, E, never> {
  return new Stream(C.fail(error))
}

/**
 * Halt a stream with the specified error
 */
export function failWith<E>(error: () => E): Stream<unknown, E, never> {
  return new Stream(C.failWith(error))
}

/**
 * Repeats this stream forever.
 */
export function forever<R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(C.repeated(self.channel))
}

/**
 * Creates a stream from a `Chunk` of values
 *
 * @param c a chunk of values
 * @return a finite stream of values
 */
export function fromChunk<O>(c: Chunk.Chunk<O>): Stream<unknown, never, O> {
  return new Stream(C.unwrap(T.succeedWith(() => C.write(c))))
}

/**
 * Creates a stream from a `Chunk` of values
 *
 * @param c a chunk of values
 * @return a finite stream of values
 */
export function fromChunkWith<O>(c: () => Chunk.Chunk<O>): Stream<unknown, never, O> {
  return new Stream(C.unwrap(T.succeedWith(() => C.writeWith(c))))
}

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export function effect<R, E, A>(self: T.Effect<R, E, A>): Stream<R, E, A> {
  return new Stream(C.unwrap(T.fold_(self, C.fail, (x) => C.write(Chunk.single(x)))))
}

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function effectOption<R, E, A>(
  self: T.Effect<R, O.Option<E>, A>
): Stream<R, E, A> {
  return new Stream(
    C.unwrap(
      T.fold_(
        self,
        O.fold(() => C.unit, C.fail),
        (x) => C.write(Chunk.single(x))
      )
    )
  )
}

/**
 * Creates a single-valued stream from a managed resource
 */
export function managed<R, E, A>(self: M.Managed<R, E, A>): Stream<R, E, A> {
  return new Stream(C.managedOut(M.map_(self, Chunk.single)))
}

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export function flatten<R0, E0, R, E, A>(
  self: Stream<R0, E0, Stream<R, E, A>>
): Stream<R0 & R, E0 | E, A> {
  return chain_(self, identity)
}

/**
 * Transforms the elements of this stream using the supplied function.
 */
export function map_<R, E, O, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => O1
): Stream<R, E, O1> {
  return new Stream(C.mapOut_(self.channel, (o) => Chunk.map_(o, f)))
}

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @dataFirst map_
 */
export function map<O, O1>(
  f: (o: O) => O1
): <R, E>(self: Stream<R, E, O>) => Stream<R, E, O1> {
  return (self) => map_(self, f)
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): T.Effect<R & R2, E2, Z> {
  return C.runDrain(self.channel[">>>"](sink.channel))
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 *
 * @dataFirst run_
 */
export function run<E, A, R2, E2, Z>(
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): <R>(self: Stream<R, E, A>) => T.Effect<R & R2, E2, Z> {
  return (self) => run_(self, sink)
}

/**
 * Runs the stream and collects all of its elements to a chunk.
 */
export function runCollect<R, E, A>(
  self: Stream<R, E, A>
): T.Effect<R, E, Chunk.Chunk<A>> {
  return run_(self, Sink.collectAll())
}

/**
 * Runs the stream and collects ignore its elements.
 */
export function runDrain<R, E, A>(self: Stream<R, E, A>): T.Effect<R, E, void> {
  return run_(self, Sink.drain())
}

/**
 * Creates a single-valued pure stream
 */
export function succeed<O>(o: O): Stream<unknown, never, O> {
  return fromChunk(Chunk.single(o))
}

/**
 * Creates a single-valued pure stream
 */
export function succeedWith<O>(o: () => O): Stream<unknown, never, O> {
  return fromChunkWith(() => Chunk.single(o()))
}

function takeLoop<E, A>(
  n: number
): C.Channel<unknown, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> {
  return C.readWithCause(
    (i) => {
      const taken = Chunk.take_(i, n)
      const left = Math.max(n - Chunk.size(taken), 0)
      if (left > 0) {
        return C.chain_(C.write(taken), () => takeLoop(left))
      } else {
        return C.write(taken)
      }
    },
    C.halt,
    C.end
  )
}

/**
 * Takes the specified number of elements from this stream.
 */
export function take_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  if (n <= 0) {
    return empty
  }
  if (!Number.isInteger(n)) {
    return die(new Cause.IllegalArgumentException(`${n} should be an integer`))
  }
  return new Stream(self.channel[">>>"](takeLoop(n)))
}

/**
 * Takes the specified number of elements from this stream.
 *
 * @dataFirst take_
 */
export function take(n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A> {
  return (self) => take_(self, n)
}

/**
 * Interpret the stream as a managed pull
 */
export function toPull<R, E, A>(
  self: Stream<R, E, A>
): M.Managed<R, never, T.Effect<R, O.Option<E>, Chunk.Chunk<A>>> {
  return M.map_(C.toPull(self.channel), (pull) =>
    T.mapError_(pull, (e) => (e._tag === "Left" ? O.some(e.left) : O.none))
  )
}

/**
 * Creates a stream produced from an effect
 */
export function unwrap<R0, E0, R, E, A>(
  self: T.Effect<R0, E0, Stream<R, E, A>>
): Stream<R0 & R, E0 | E, A> {
  return flatten(effect(self))
}

/**
 * Creates a stream produced from a managed
 */
export function unwrapManaged<R0, E0, R, E, A>(
  self: M.Managed<R0, E0, Stream<R, E, A>>
): Stream<R0 & R, E0 | E, A> {
  return flatten(managed(self))
}
