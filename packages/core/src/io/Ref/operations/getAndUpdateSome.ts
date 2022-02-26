import { Tuple } from "../../../collection/immutable/Tuple"
import type { Option } from "../../../data/Option"
import { matchTag_ } from "../../../data/Utils"
import type { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 *
 * @tsplus fluent ets/XRef getAndUpdateSome
 */
export function getAndUpdateSome_<RA, RB, EA, EB, A>(
  self: XRef<RA, RB, EA, EB, A, A>,
  pf: (a: A) => Option<A>,
  __tsplusTrace?: string
): Effect<RA & RB, EA | EB, A> {
  return matchTag_(
    concrete(self),
    {
      Atomic: (atomic) => atomic.getAndUpdateSome(pf)
    },
    (_) =>
      (_ as XRef<RA, RB, EA, EB, A, A>).modify((v) => {
        const result = pf(v).getOrElse(v)
        return Tuple(v, result)
      })
  )
}

/**
 * Atomically modifies the `XRef` with the specified partial function,
 * returning the value immediately before modification. If the function is
 * undefined on the current value it doesn't change it.
 *
 * @ets_data_first getAndUpdateSome_
 */
export function getAndUpdateSome<A>(pf: (a: A) => Option<A>, __tsplusTrace?: string) {
  return <RA, RB, EA, EB>(
    self: XRef<RA, RB, EA, EB, A, A>
  ): Effect<RA & RB, EA | EB, A> => self.getAndUpdateSome(pf)
}