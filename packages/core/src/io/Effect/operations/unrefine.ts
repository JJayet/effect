import { identity } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../definition"

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @tsplus fluent ets/Effect unrefine
 */
export function unrefine_<R, E, A, E1>(
  self: Effect<R, E, A>,
  pf: (u: unknown) => Option<E1>,
  __tsplusTrace?: string
) {
  return self.unrefineWith(pf, identity)
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @ets_data_first unrefine_
 */
export function unrefine<E1>(pf: (u: unknown) => Option<E1>, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => self.unrefine(pf)
}