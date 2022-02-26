import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 *
 * @tsplus fluent ets/Managed orElseFail
 */
export function orElseFail_<R, E, A, E2>(
  self: Managed<R, E, A>,
  e: LazyArg<E2>,
  __tsplusTrace?: string
) {
  return self | Managed.fail(e)
}

/**
 * Executes this effect and returns its value, if it succeeds, but
 * otherwise fails with the specified error.
 *
 * @ets_data_first orElseFail_
 */
export function orElseFail<E2>(e: LazyArg<E2>, __tsplusTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>) => self.orElseFail(e)
}