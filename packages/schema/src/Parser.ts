/**
 * @since 1.0.0
 */

import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type { Concurrency, Mutable } from "effect/Types"
import * as AST from "./AST.js"
import * as Internal from "./internal/ast.js"
import * as InternalParser from "./internal/parser.js"
import type * as ParseResult from "./ParseResult.js"
import type * as Schema from "./Schema.js"
import * as TreeFormatter from "./TreeFormatter.js"

/** @internal */
export const mergeParseOptions = (
  a: AST.ParseOptions | undefined,
  b: AST.ParseOptions | undefined
): AST.ParseOptions | undefined => {
  if (a === undefined) {
    return b
  }
  if (b === undefined) {
    return a
  }
  const out: Mutable<AST.ParseOptions> = {}
  out.errors = b.errors ?? a.errors
  out.onExcessProperty = b.onExcessProperty ?? a.onExcessProperty
  return out
}

const getEither = (ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = goMemo(ast, isDecoding)
  return (u: unknown, overrideOptions?: AST.ParseOptions): Either.Either<any, ParseResult.ParseIssue> =>
    parser(u, mergeParseOptions(options, overrideOptions)) as any
}

const getSync = (ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = getEither(ast, isDecoding, options)
  return (input: unknown, overrideOptions?: AST.ParseOptions) =>
    Either.getOrThrowWith(parser(input, overrideOptions), (e) => new Error(TreeFormatter.formatIssue(e)))
}

const getOption = (ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = getEither(ast, isDecoding, options)
  return (input: unknown, overrideOptions?: AST.ParseOptions): Option.Option<any> =>
    Option.getRight(parser(input, overrideOptions))
}

const getEffect = <R>(ast: AST.AST, isDecoding: boolean, options?: AST.ParseOptions) => {
  const parser = goMemo(ast, isDecoding)
  return (input: unknown, overrideOptions?: AST.ParseOptions): Effect.Effect<any, ParseResult.ParseIssue, R> =>
    parser(input, { ...mergeParseOptions(options, overrideOptions), isEffectAllowed: true })
}

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknownSync = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => A => getSync(schema.ast, true, options)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknownOption = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Option.Option<A> => getOption(schema.ast, true, options)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknownEither = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Either.Either<A, ParseResult.ParseIssue> =>
  getEither(schema.ast, true, options)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknownPromise = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => {
  const parser = decodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: AST.ParseOptions): Promise<A> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeUnknown = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<A, ParseResult.ParseIssue, R> =>
  getEffect(schema.ast, true, options)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknownSync = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => I => getSync(schema.ast, false, options)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknownOption = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Option.Option<I> => getOption(schema.ast, false, options)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknownEither = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Either.Either<I, ParseResult.ParseIssue> =>
  getEither(schema.ast, false, options)

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknownPromise = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => {
  const parser = encodeUnknown(schema, options)
  return (u: unknown, overrideOptions?: AST.ParseOptions): Promise<I> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeUnknown = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<I, ParseResult.ParseIssue, R> =>
  getEffect(schema.ast, false, options)

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeSync: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => A = decodeUnknownSync

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeOption: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => Option.Option<A> = decodeUnknownOption

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodeEither: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => Either.Either<A, ParseResult.ParseIssue> = decodeUnknownEither

/**
 * @category decoding
 * @since 1.0.0
 */
export const decodePromise: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => Promise<A> = decodeUnknownPromise

/**
 * @category decoding
 * @since 1.0.0
 */
export const decode: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
) => (i: I, overrideOptions?: AST.ParseOptions) => Effect.Effect<A, ParseResult.ParseIssue, R> = decodeUnknown

/**
 * @category validation
 * @since 1.0.0
 */
export const validateSync = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => A => getSync(AST.to(schema.ast), true, options)

/**
 * @category validation
 * @since 1.0.0
 */
export const validateOption = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Option.Option<A> => getOption(AST.to(schema.ast), true, options)

/**
 * @category validation
 * @since 1.0.0
 */
export const validateEither = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (u: unknown, overrideOptions?: AST.ParseOptions) => Either.Either<A, ParseResult.ParseIssue> =>
  getEither(AST.to(schema.ast), true, options)

/**
 * @category validation
 * @since 1.0.0
 */
export const validatePromise = <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => {
  const parser = validate(schema, options)
  return (u: unknown, overrideOptions?: AST.ParseOptions): Promise<A> => Effect.runPromise(parser(u, overrideOptions))
}

/**
 * @category validation
 * @since 1.0.0
 */
export const validate = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
): (a: unknown, overrideOptions?: AST.ParseOptions) => Effect.Effect<A, ParseResult.ParseIssue, R> =>
  getEffect(AST.to(schema.ast), true, options)

/**
 * @category validation
 * @since 1.0.0
 */
export const is = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: AST.ParseOptions) => {
  const parser = goMemo(AST.to(schema.ast), true)
  return (u: unknown, overrideOptions?: AST.ParseOptions): u is A =>
    Either.isRight(parser(u, { ...mergeParseOptions(options, overrideOptions), isExact: true }) as any)
}

/**
 * @category validation
 * @since 1.0.0
 */
export const asserts = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: AST.ParseOptions) => {
  const parser = goMemo(AST.to(schema.ast), true)
  return (u: unknown, overrideOptions?: AST.ParseOptions): asserts u is A => {
    const result: Either.Either<any, ParseResult.ParseIssue> = parser(u, {
      ...mergeParseOptions(options, overrideOptions),
      isExact: true
    }) as any
    if (Either.isLeft(result)) {
      throw new Error(TreeFormatter.formatIssue(result.left))
    }
  }
}

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeSync: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (a: A, overrideOptions?: AST.ParseOptions) => I = encodeUnknownSync

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeOption: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (input: A, overrideOptions?: AST.ParseOptions) => Option.Option<I> = encodeUnknownOption

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodeEither: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (a: A, overrideOptions?: AST.ParseOptions) => Either.Either<I, ParseResult.ParseIssue> = encodeUnknownEither

/**
 * @category encoding
 * @since 1.0.0
 */
export const encodePromise: <A, I>(
  schema: Schema.Schema<A, I, never>,
  options?: AST.ParseOptions
) => (a: A, overrideOptions?: AST.ParseOptions) => Promise<I> = encodeUnknownPromise

/**
 * @category encoding
 * @since 1.0.0
 */
export const encode: <A, I, R>(
  schema: Schema.Schema<A, I, R>,
  options?: AST.ParseOptions
) => (a: A, overrideOptions?: AST.ParseOptions) => Effect.Effect<I, ParseResult.ParseIssue, R> = encodeUnknown

interface InternalOptions extends AST.ParseOptions {
  readonly isEffectAllowed?: boolean
  // `isExact = false` means that missing keys are treated as undefined values (`{ key: undefined }`)
  readonly isExact?: boolean
}

interface Parser {
  (i: any, options?: InternalOptions): Effect.Effect<any, ParseResult.ParseIssue, any>
}

/**
 * @since 1.0.0"
 */
export const defaultParseOption: AST.ParseOptions = {}

const decodeMemoMap = globalValue(
  Symbol.for("@effect/schema/Parser/decodeMemoMap"),
  () => new WeakMap<AST.AST, Parser>()
)
const encodeMemoMap = globalValue(
  Symbol.for("@effect/schema/Parser/encodeMemoMap"),
  () => new WeakMap<AST.AST, Parser>()
)

const goMemo = (ast: AST.AST, isDecoding: boolean): Parser => {
  const memoMap = isDecoding ? decodeMemoMap : encodeMemoMap
  const memo = memoMap.get(ast)
  if (memo) {
    return memo
  }
  const parser = go(ast, isDecoding)
  memoMap.set(ast, parser)
  return parser
}

const getConcurrency = (ast: AST.AST): Concurrency | undefined =>
  Option.getOrUndefined(AST.getConcurrencyAnnotation(ast))

const getBatching = (ast: AST.AST): boolean | "inherit" | undefined =>
  Option.getOrUndefined(AST.getBatchingAnnotation(ast))

const go = (ast: AST.AST, isDecoding: boolean): Parser => {
  switch (ast._tag) {
    case "Refinement": {
      if (isDecoding) {
        const from = goMemo(ast.from, true)
        return (i, options) =>
          handleForbidden(
            InternalParser.flatMap(
              InternalParser.mapError(from(i, options), (e) => InternalParser.refinement(ast, i, "From", e)),
              (a) =>
                Option.match(
                  ast.filter(a, options ?? defaultParseOption, ast),
                  {
                    onNone: () => Either.right(a),
                    onSome: (e) => Either.left(InternalParser.refinement(ast, i, "Predicate", e))
                  }
                )
            ),
            ast,
            i,
            options
          )
      } else {
        const from = goMemo(AST.to(ast), true)
        const to = goMemo(dropRightRefinement(ast.from), false)
        return (i, options) =>
          handleForbidden(InternalParser.flatMap(from(i, options), (a) => to(a, options)), ast, i, options)
      }
    }
    case "Transform": {
      const transform = getFinalTransformation(ast.transformation, isDecoding)
      const from = isDecoding ? goMemo(ast.from, true) : goMemo(ast.to, false)
      const to = isDecoding ? goMemo(ast.to, true) : goMemo(ast.from, false)
      return (i1, options) =>
        handleForbidden(
          InternalParser.flatMap(
            InternalParser.mapError(
              from(i1, options),
              (e) => InternalParser.transform(ast, i1, isDecoding ? "From" : "To", e)
            ),
            (a) =>
              InternalParser.flatMap(
                InternalParser.mapError(
                  transform(a, options ?? defaultParseOption, ast),
                  (e) => InternalParser.transform(ast, i1, "Transformation", e)
                ),
                (i2) =>
                  InternalParser.mapError(
                    to(i2, options),
                    (e) => InternalParser.transform(ast, i1, isDecoding ? "To" : "From", e)
                  )
              )
          ),
          ast,
          i1,
          options
        )
    }
    case "Declaration": {
      const parse = isDecoding
        ? ast.decodeUnknown(...ast.typeParameters)
        : ast.encodeUnknown(...ast.typeParameters)
      return (i, options) =>
        handleForbidden(
          InternalParser.mapError(parse(i, options ?? defaultParseOption, ast), (e) =>
            InternalParser.declaration(ast, i, e)),
          ast,
          i,
          options
        )
    }
    case "Literal":
      return fromRefinement(ast, (u): u is typeof ast.literal => u === ast.literal)
    case "UniqueSymbol":
      return fromRefinement(ast, (u): u is typeof ast.symbol => u === ast.symbol)
    case "UndefinedKeyword":
      return fromRefinement(ast, Predicate.isUndefined)
    case "VoidKeyword":
      return fromRefinement(ast, Predicate.isUndefined)
    case "NeverKeyword":
      return fromRefinement(ast, Predicate.isNever)
    case "UnknownKeyword":
    case "AnyKeyword":
      return Either.right
    case "StringKeyword":
      return fromRefinement(ast, Predicate.isString)
    case "NumberKeyword":
      return fromRefinement(ast, Predicate.isNumber)
    case "BooleanKeyword":
      return fromRefinement(ast, Predicate.isBoolean)
    case "BigIntKeyword":
      return fromRefinement(ast, Predicate.isBigInt)
    case "SymbolKeyword":
      return fromRefinement(ast, Predicate.isSymbol)
    case "ObjectKeyword":
      return fromRefinement(ast, Predicate.isObject)
    case "Enums":
      return fromRefinement(ast, (u): u is any => ast.enums.some(([_, value]) => value === u))
    case "TemplateLiteral": {
      const regex = AST.getTemplateLiteralRegex(ast)
      return fromRefinement(ast, (u): u is any => Predicate.isString(u) && regex.test(u))
    }
    case "Tuple": {
      const elements = ast.elements.map((e) => goMemo(e.type, isDecoding))
      const rest = Option.map(ast.rest, ReadonlyArray.map((ast) => goMemo(ast, isDecoding)))
      let requiredLen = ast.elements.filter((e) => !e.isOptional).length
      if (Option.isSome(ast.rest)) {
        requiredLen += ast.rest.value.length - 1
      }
      const expectedAST = AST.createUnion(ast.elements.map((_, i) => AST.createLiteral(i)))
      const concurrency = getConcurrency(ast)
      const batching = getBatching(ast)
      return (input: unknown, options) => {
        if (!Array.isArray(input)) {
          return Either.left(InternalParser.type(ast, input))
        }
        const allErrors = options?.errors === "all"
        const es: Array<[number, ParseResult.Index]> = []
        let stepKey = 0
        // ---------------------------------------------
        // handle missing indexes
        // ---------------------------------------------
        const len = input.length
        for (let i = len; i <= requiredLen - 1; i++) {
          const e = InternalParser.index(i, InternalParser.missing)
          if (allErrors) {
            es.push([stepKey++, e])
            continue
          } else {
            return Either.left(InternalParser.tuple(ast, input, [e]))
          }
        }

        // ---------------------------------------------
        // handle excess indexes
        // ---------------------------------------------
        if (Option.isNone(ast.rest)) {
          for (let i = ast.elements.length; i <= len - 1; i++) {
            const e = InternalParser.index(i, InternalParser.unexpected(expectedAST))
            if (allErrors) {
              es.push([stepKey++, e])
              continue
            } else {
              return Either.left(InternalParser.tuple(ast, input, [e]))
            }
          }
        }

        const output: Array<[number, any]> = []
        let i = 0
        type State = {
          es: typeof es
          output: typeof output
        }
        let queue:
          | Array<(_: State) => Effect.Effect<void, ParseResult.ParseIssue, any>>
          | undefined = undefined

        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        for (; i < elements.length; i++) {
          if (len < i + 1) {
            if (ast.elements[i].isOptional) {
              // the input element is missing
              continue
            }
          } else {
            const parser = elements[i]
            const te = parser(input[i], options)
            const eu = InternalParser.eitherOrUndefined(te)
            if (eu) {
              if (Either.isLeft(eu)) {
                // the input element is present but is not valid
                const e = InternalParser.index(i, eu.left)
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return Either.left(InternalParser.tuple(ast, input, [e]))
                }
              }
              output.push([stepKey++, eu.right])
            } else {
              const nk = stepKey++
              const index = i
              if (!queue) {
                queue = []
              }
              queue.push(({ es, output }: State) =>
                Effect.flatMap(Effect.either(te), (t) => {
                  if (Either.isLeft(t)) {
                    // the input element is present but is not valid
                    const e = InternalParser.index(index, t.left)
                    if (allErrors) {
                      es.push([nk, e])
                      return Effect.unit
                    } else {
                      return Either.left(InternalParser.tuple(ast, input, [e]))
                    }
                  }
                  output.push([nk, t.right])
                  return Effect.unit
                })
              )
            }
          }
        }
        // ---------------------------------------------
        // handle rest element
        // ---------------------------------------------
        if (Option.isSome(rest)) {
          const [head, ...tail] = rest.value
          for (; i < len - tail.length; i++) {
            const te = head(input[i], options)
            const eu = InternalParser.eitherOrUndefined(te)
            if (eu) {
              if (Either.isLeft(eu)) {
                const e = InternalParser.index(i, eu.left)
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return Either.left(InternalParser.tuple(ast, input, [e]))
                }
              } else {
                output.push([stepKey++, eu.right])
              }
            } else {
              const nk = stepKey++
              const index = i
              if (!queue) {
                queue = []
              }
              queue.push(
                ({ es, output }: State) =>
                  Effect.flatMap(Effect.either(te), (t) => {
                    if (Either.isLeft(t)) {
                      const e = InternalParser.index(index, t.left)
                      if (allErrors) {
                        es.push([nk, e])
                        return Effect.unit
                      } else {
                        return Either.left(InternalParser.tuple(ast, input, [e]))
                      }
                    } else {
                      output.push([nk, t.right])
                      return Effect.unit
                    }
                  })
              )
            }
          }
          // ---------------------------------------------
          // handle post rest elements
          // ---------------------------------------------
          for (let j = 0; j < tail.length; j++) {
            i += j
            if (len < i + 1) {
              continue
            } else {
              const te = tail[j](input[i], options)
              const eu = InternalParser.eitherOrUndefined(te)
              if (eu) {
                if (Either.isLeft(eu)) {
                  // the input element is present but is not valid
                  const e = InternalParser.index(i, eu.left)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return Either.left(InternalParser.tuple(ast, input, [e]))
                  }
                }
                output.push([stepKey++, eu.right])
              } else {
                const nk = stepKey++
                const index = i
                if (!queue) {
                  queue = []
                }
                queue.push(
                  ({ es, output }: State) =>
                    Effect.flatMap(Effect.either(te), (t) => {
                      if (Either.isLeft(t)) {
                        // the input element is present but is not valid
                        const e = InternalParser.index(index, t.left)
                        if (allErrors) {
                          es.push([nk, e])
                          return Effect.unit
                        } else {
                          return Either.left(InternalParser.tuple(ast, input, [e]))
                        }
                      }
                      output.push([nk, t.right])
                      return Effect.unit
                    })
                )
              }
            }
          }
        }

        // ---------------------------------------------
        // compute output
        // ---------------------------------------------
        const computeResult = ({ es, output }: State) =>
          ReadonlyArray.isNonEmptyArray(es) ?
            Either.left(InternalParser.tuple(ast, input, sortByIndex(es))) :
            Either.right(sortByIndex(output))
        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = {
              es: Array.from(es),
              output: Array.from(output)
            }
            return Effect.flatMap(
              Effect.forEach(cqueue, (f) => f(state), { concurrency, batching, discard: true }),
              () => computeResult(state)
            )
          })
        }
        return computeResult({ output, es })
      }
    }
    case "TypeLiteral": {
      if (ast.propertySignatures.length === 0 && ast.indexSignatures.length === 0) {
        return fromRefinement(ast, Predicate.isNotNullable)
      }

      const propertySignatures: Array<readonly [Parser, AST.PropertySignature]> = []
      const expectedKeys: Record<PropertyKey, null> = {}
      for (const ps of ast.propertySignatures) {
        propertySignatures.push([goMemo(ps.type, isDecoding), ps])
        expectedKeys[ps.name] = null
      }

      const indexSignatures = ast.indexSignatures.map((is) =>
        [
          goMemo(is.parameter, isDecoding),
          goMemo(is.type, isDecoding),
          is.parameter
        ] as const
      )
      const expectedAST = AST.createUnion(
        ast.indexSignatures.map((is): AST.AST => is.parameter).concat(
          Internal.ownKeys(expectedKeys).map((key) =>
            Predicate.isSymbol(key) ? AST.createUniqueSymbol(key) : AST.createLiteral(key)
          )
        )
      )
      const expected = goMemo(expectedAST, isDecoding)
      const concurrency = getConcurrency(ast)
      const batching = getBatching(ast)
      return (input: unknown, options) => {
        if (!Predicate.isRecord(input)) {
          return Either.left(InternalParser.type(ast, input))
        }
        const allErrors = options?.errors === "all"
        const es: Array<[number, ParseResult.Key]> = []
        let stepKey = 0

        // ---------------------------------------------
        // handle excess properties
        // ---------------------------------------------
        const onExcessPropertyError = options?.onExcessProperty === "error"
        const onExcessPropertyPreserve = options?.onExcessProperty === "preserve"
        const output: any = {}
        if (onExcessPropertyError || onExcessPropertyPreserve) {
          for (const key of Internal.ownKeys(input)) {
            const eu = InternalParser.eitherOrUndefined(expected(key, options))!
            if (Either.isLeft(eu)) {
              // key is unexpected
              if (onExcessPropertyError) {
                const e = InternalParser.key(key, InternalParser.unexpected(expectedAST))
                if (allErrors) {
                  es.push([stepKey++, e])
                  continue
                } else {
                  return Either.left(InternalParser.typeLiteral(ast, input, [e]))
                }
              } else {
                // preserve key
                output[key] = input[key]
              }
            }
          }
        }

        // ---------------------------------------------
        // handle property signatures
        // ---------------------------------------------
        type State = {
          es: typeof es
          output: typeof output
        }
        let queue:
          | Array<(state: State) => Effect.Effect<void, ParseResult.ParseIssue, any>>
          | undefined = undefined

        const isExact = options?.isExact === true
        for (let i = 0; i < propertySignatures.length; i++) {
          const ps = propertySignatures[i][1]
          const name = ps.name
          const hasKey = Object.prototype.hasOwnProperty.call(input, name)
          if (!hasKey) {
            if (ps.isOptional) {
              continue
            } else if (isExact) {
              const e = InternalParser.key(name, InternalParser.missing)
              if (allErrors) {
                es.push([stepKey++, e])
                continue
              } else {
                return Either.left(InternalParser.typeLiteral(ast, input, [e]))
              }
            }
          }
          const parser = propertySignatures[i][0]
          const te = parser(input[name], options)
          const eu = InternalParser.eitherOrUndefined(te)
          if (eu) {
            if (Either.isLeft(eu)) {
              const e = InternalParser.key(name, hasKey ? eu.left : InternalParser.missing)
              if (allErrors) {
                es.push([stepKey++, e])
                continue
              } else {
                return Either.left(InternalParser.typeLiteral(ast, input, [e]))
              }
            }
            output[name] = eu.right
          } else {
            const nk = stepKey++
            const index = name
            if (!queue) {
              queue = []
            }
            queue.push(
              ({ es, output }: State) =>
                Effect.flatMap(Effect.either(te), (t) => {
                  if (Either.isLeft(t)) {
                    const e = InternalParser.key(index, hasKey ? t.left : InternalParser.missing)
                    if (allErrors) {
                      es.push([nk, e])
                      return Effect.unit
                    } else {
                      return Either.left(InternalParser.typeLiteral(ast, input, [e]))
                    }
                  }
                  output[index] = t.right
                  return Effect.unit
                })
            )
          }
        }

        // ---------------------------------------------
        // handle index signatures
        // ---------------------------------------------
        for (let i = 0; i < indexSignatures.length; i++) {
          const indexSignature = indexSignatures[i]
          const parameter = indexSignature[0]
          const type = indexSignature[1]
          const keys = Internal.getKeysForIndexSignature(input, indexSignature[2])
          for (const key of keys) {
            // ---------------------------------------------
            // handle keys
            // ---------------------------------------------
            const keu = InternalParser.eitherOrUndefined(parameter(key, options))
            if (keu && Either.isRight(keu)) {
              // ---------------------------------------------
              // handle values
              // ---------------------------------------------
              const vpr = type(input[key], options)
              const veu = InternalParser.eitherOrUndefined(vpr)
              if (veu) {
                if (Either.isLeft(veu)) {
                  const e = InternalParser.key(key, veu.left)
                  if (allErrors) {
                    es.push([stepKey++, e])
                    continue
                  } else {
                    return Either.left(InternalParser.typeLiteral(ast, input, [e]))
                  }
                } else {
                  if (!Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
                    output[key] = veu.right
                  }
                }
              } else {
                const nk = stepKey++
                const index = key
                if (!queue) {
                  queue = []
                }
                queue.push(
                  ({ es, output }: State) =>
                    Effect.flatMap(
                      Effect.either(vpr),
                      (tv) => {
                        if (Either.isLeft(tv)) {
                          const e = InternalParser.key(index, tv.left)
                          if (allErrors) {
                            es.push([nk, e])
                            return Effect.unit
                          } else {
                            return Either.left(InternalParser.typeLiteral(ast, input, [e]))
                          }
                        } else {
                          if (!Object.prototype.hasOwnProperty.call(expectedKeys, key)) {
                            output[key] = tv.right
                          }
                          return Effect.unit
                        }
                      }
                    )
                )
              }
            }
          }
        }
        // ---------------------------------------------
        // compute output
        // ---------------------------------------------
        const computeResult = ({ es, output }: State) =>
          ReadonlyArray.isNonEmptyArray(es) ?
            Either.left(InternalParser.typeLiteral(ast, input, sortByIndex(es))) :
            Either.right(output)
        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = {
              es: Array.from(es),
              output: Object.assign({}, output)
            }
            return Effect.flatMap(
              Effect.forEach(cqueue, (f) => f(state), { concurrency, batching, discard: true }),
              () => computeResult(state)
            )
          })
        }
        return computeResult({ es, output })
      }
    }
    case "Union": {
      const searchTree = getSearchTree(ast.types, isDecoding)
      const ownKeys = Internal.ownKeys(searchTree.keys)
      const len = ownKeys.length
      const map = new Map<any, Parser>()
      for (let i = 0; i < ast.types.length; i++) {
        map.set(ast.types[i], goMemo(ast.types[i], isDecoding))
      }
      const concurrency = getConcurrency(ast) ?? 1
      const batching = getBatching(ast)
      return (input, options) => {
        const es: Array<[number, ParseResult.Type | ParseResult.TypeLiteral | ParseResult.Member]> = []
        let stepKey = 0
        let candidates: Array<AST.AST> = []
        if (len > 0) {
          // if there is at least one key then input must be an object
          if (Predicate.isRecord(input)) {
            for (let i = 0; i < len; i++) {
              const name = ownKeys[i]
              const buckets = searchTree.keys[name].buckets
              // for each property that should contain a literal, check if the input contains that property
              if (Object.prototype.hasOwnProperty.call(input, name)) {
                const literal = String(input[name])
                // check that the value obtained from the input for the property corresponds to an existing bucket
                if (Object.prototype.hasOwnProperty.call(buckets, literal)) {
                  // retrive the minimal set of candidates for decoding
                  candidates = candidates.concat(buckets[literal])
                } else {
                  es.push([
                    stepKey++,
                    InternalParser.typeLiteral(
                      AST.createTypeLiteral([
                        AST.createPropertySignature(name, searchTree.keys[name].ast, false, true)
                      ], []),
                      input,
                      [InternalParser.key(name, InternalParser.type(searchTree.keys[name].ast, input[name]))]
                    )
                  ])
                }
              } else {
                es.push([
                  stepKey++,
                  InternalParser.typeLiteral(
                    AST.createTypeLiteral([
                      AST.createPropertySignature(name, searchTree.keys[name].ast, false, true)
                    ], []),
                    input,
                    [InternalParser.key(name, InternalParser.missing)]
                  )
                ])
              }
            }
          } else {
            es.push([stepKey++, InternalParser.type(ast, input)])
          }
        }
        if (searchTree.otherwise.length > 0) {
          candidates = candidates.concat(searchTree.otherwise)
        }

        let queue:
          | Array<(state: State) => Effect.Effect<unknown, ParseResult.ParseIssue, any>>
          | undefined = undefined

        type State = {
          finalResult?: any
          es: typeof es
        }

        for (let i = 0; i < candidates.length; i++) {
          const candidate = candidates[i]
          const pr = map.get(candidate)!(input, options)
          // the members of a union are ordered based on which one should be decoded first,
          // therefore if one member has added a task, all subsequent members must
          // also add a task to the queue even if they are synchronous
          const eu = !queue || queue.length === 0 ? InternalParser.eitherOrUndefined(pr) : undefined
          if (eu) {
            if (Either.isRight(eu)) {
              return Either.right(eu.right)
            } else {
              es.push([stepKey++, InternalParser.member(candidate, eu.left)])
            }
          } else {
            const nk = stepKey++
            if (!queue) {
              queue = []
            }
            queue.push(
              (state) =>
                Effect.suspend(() => {
                  if ("finalResult" in state) {
                    return Effect.unit
                  } else {
                    return Effect.flatMap(Effect.either(pr), (t) => {
                      if (Either.isRight(t)) {
                        state.finalResult = Either.right(t.right)
                      } else {
                        state.es.push([nk, InternalParser.member(candidate, t.left)])
                      }
                      return Effect.unit
                    })
                  }
                })
            )
          }
        }

        // ---------------------------------------------
        // compute output
        // ---------------------------------------------
        const computeResult = (es: State["es"]) =>
          ReadonlyArray.isNonEmptyArray(es) ?
            es.length === 1 && es[0][1]._tag === "Type" ?
              Either.left(es[0][1]) :
              Either.left(InternalParser.union(ast, input, sortByIndex(es))) :
            // this should never happen
            Either.left(InternalParser.type(AST.neverKeyword, input))

        if (queue && queue.length > 0) {
          const cqueue = queue
          return Effect.suspend(() => {
            const state: State = { es: Array.from(es) }
            return Effect.flatMap(
              Effect.forEach(cqueue, (f) => f(state), { concurrency, batching, discard: true }),
              () => {
                if ("finalResult" in state) {
                  return state.finalResult
                }
                return computeResult(state.es)
              }
            )
          })
        }
        return computeResult(es)
      }
    }
    case "Suspend": {
      const get = Internal.memoizeThunk(() => goMemo(AST.mergeAnnotations(ast.f(), ast.annotations), isDecoding))
      return (a, options) => get()(a, options)
    }
  }
}

const fromRefinement = <A>(ast: AST.AST, refinement: (u: unknown) => u is A): Parser => (u) =>
  refinement(u) ? Either.right(u) : Either.left(InternalParser.type(ast, u))

/** @internal */
export const getLiterals = (
  ast: AST.AST,
  isDecoding: boolean
): ReadonlyArray<[PropertyKey, AST.Literal]> => {
  switch (ast._tag) {
    case "TypeLiteral": {
      const out: Array<[PropertyKey, AST.Literal]> = []
      for (let i = 0; i < ast.propertySignatures.length; i++) {
        const propertySignature = ast.propertySignatures[i]
        const type = isDecoding ? AST.from(propertySignature.type) : AST.to(propertySignature.type)
        if (AST.isLiteral(type) && !propertySignature.isOptional) {
          out.push([propertySignature.name, type])
        }
      }
      return out
    }
    case "Refinement":
      return getLiterals(ast.from, isDecoding)
    case "Suspend":
      return getLiterals(ast.f(), isDecoding)
    case "Transform":
      return getLiterals(isDecoding ? ast.from : ast.to, isDecoding)
  }
  return []
}

/**
 * The purpose of the algorithm is to narrow down the pool of possible candidates for decoding as much as possible.
 *
 * This function separates the schemas into two groups, `keys` and `otherwise`:
 *
 * - `keys`: the schema has at least one property with a literal value
 * - `otherwise`: the schema has no properties with a literal value
 *
 * If a schema has at least one property with a literal value, so it ends up in `keys`, first a namespace is created for
 * the name of the property containing the literal, and then within this namespace a "bucket" is created for the literal
 * value in which to store all the schemas that have the same property and literal value.
 *
 * @internal
 */
export const getSearchTree = (
  members: ReadonlyArray<AST.AST>,
  isDecoding: boolean
): {
  keys: {
    readonly [key: PropertyKey]: {
      buckets: { [literal: string]: ReadonlyArray<AST.AST> }
      ast: AST.AST // this is for error messages
    }
  }
  otherwise: ReadonlyArray<AST.AST>
} => {
  const keys: {
    [key: PropertyKey]: {
      buckets: { [literal: string]: Array<AST.AST> }
      ast: AST.AST
    }
  } = {}
  const otherwise: Array<AST.AST> = []
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    const tags = getLiterals(member, isDecoding)
    if (tags.length > 0) {
      for (let j = 0; j < tags.length; j++) {
        const [key, literal] = tags[j]
        const hash = String(literal.literal)
        keys[key] = keys[key] || { buckets: {}, ast: AST.neverKeyword }
        const buckets = keys[key].buckets
        if (Object.prototype.hasOwnProperty.call(buckets, hash)) {
          if (j < tags.length - 1) {
            continue
          }
          buckets[hash].push(member)
          keys[key].ast = AST.createUnion([keys[key].ast, literal])
        } else {
          buckets[hash] = [member]
          keys[key].ast = AST.createUnion([keys[key].ast, literal])
          break
        }
      }
    } else {
      otherwise.push(member)
    }
  }
  return { keys, otherwise }
}

const dropRightRefinement = (ast: AST.AST): AST.AST => AST.isRefinement(ast) ? dropRightRefinement(ast.from) : ast

const handleForbidden = <R, A>(
  effect: Effect.Effect<A, ParseResult.ParseIssue, R>,
  ast: AST.AST,
  actual: unknown,
  options: InternalOptions | undefined
): Effect.Effect<A, ParseResult.ParseIssue, R> => {
  const eu = InternalParser.eitherOrUndefined(effect)
  if (eu) {
    return eu
  }
  if (options?.isEffectAllowed === true) {
    return effect
  }
  try {
    return Effect.runSync(Effect.either(effect as Effect.Effect<A, ParseResult.ParseIssue>))
  } catch (e) {
    return Either.left(InternalParser.forbidden(ast, actual, e instanceof Error ? e.message : undefined))
  }
}

function sortByIndex<T>(
  es: ReadonlyArray.NonEmptyArray<[number, T]>
): ReadonlyArray.NonEmptyArray<T>
function sortByIndex<T>(es: Array<[number, T]>): Array<T>
function sortByIndex(es: Array<[number, any]>): any {
  return es.sort(([a], [b]) => a > b ? 1 : a < b ? -1 : 0).map(([_, a]) => a)
}

// -------------------------------------------------------------------------------------
// transformations interpreter
// -------------------------------------------------------------------------------------

const getFinalPropertySignatureTransformation = (
  transformation: AST.PropertySignatureTransformation,
  isDecoding: boolean
) => {
  switch (transformation._tag) {
    case "FinalPropertySignatureTransformation":
      return isDecoding ? transformation.decode : transformation.encode
  }
}

/** @internal */
export const getFinalTransformation = (
  transformation: AST.Transformation,
  isDecoding: boolean
): (input: any, options: AST.ParseOptions, self: AST.Transform) => Effect.Effect<any, ParseResult.ParseIssue, any> => {
  switch (transformation._tag) {
    case "FinalTransformation":
      return isDecoding ? transformation.decode : transformation.encode
    case "ComposeTransformation":
      return Either.right
    case "TypeLiteralTransformation":
      return (input) => {
        let out: Effect.Effect<any, ParseResult.ParseIssue, any> = Either.right(input)

        // ---------------------------------------------
        // handle property signature transformations
        // ---------------------------------------------
        for (const pst of transformation.propertySignatureTransformations) {
          const [from, to] = isDecoding ?
            [pst.from, pst.to] :
            [pst.to, pst.from]
          const transform = getFinalPropertySignatureTransformation(
            pst.propertySignatureTransformation,
            isDecoding
          )
          const f = (input: any) => {
            const o = transform(
              Object.prototype.hasOwnProperty.call(input, from) ?
                Option.some(input[from]) :
                Option.none()
            )
            delete input[from]
            if (Option.isSome(o)) {
              input[to] = o.value
            }
            return input
          }
          out = InternalParser.map(out, f)
        }
        return out
      }
  }
}
