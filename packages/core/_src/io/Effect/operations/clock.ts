/**
 * Retreives the `Clock` service from the environment.
 *
 * @tsplus static ets/Effect/Ops clock
 */
export const clock: UIO<Clock> = Effect.clockWith(Effect.succeedNow);