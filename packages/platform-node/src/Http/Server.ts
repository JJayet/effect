/**
 * @since 1.0.0
 */
import type * as App from "@effect/platform/Http/App"
import type * as Etag from "@effect/platform/Http/Etag"
import type * as Middleware from "@effect/platform/Http/Middleware"
import type * as Platform from "@effect/platform/Http/Platform"
import type * as Server from "@effect/platform/Http/Server"
import type { ServeError } from "@effect/platform/Http/ServerError"
import type * as ServerRequest from "@effect/platform/Http/ServerRequest"
import type * as Config from "effect/Config"
import type * as ConfigError from "effect/ConfigError"
import type * as Effect from "effect/Effect"
import type { LazyArg } from "effect/Function"
import type * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import type * as Http from "node:http"
import type * as Net from "node:net"
import * as internal from "../internal/http/server.js"
import type * as NodeContext from "../NodeContext.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (
  evaluate: LazyArg<Http.Server<typeof Http.IncomingMessage, typeof Http.ServerResponse>>,
  options: Net.ListenOptions
) => Effect.Effect<
  Server.Server,
  ServeError,
  Scope.Scope
> = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeHandler: {
  <R, E>(
    httpApp: App.Default<R, E>
  ): Effect.Effect<
    Exclude<R, Scope.Scope | ServerRequest.ServerRequest>,
    never,
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse<Http.IncomingMessage>) => void
  >
  <R, E, App extends App.Default<any, any>>(
    httpApp: App.Default<R, E>,
    middleware: Middleware.Middleware.Applied<R, E, App>
  ): Effect.Effect<
    Exclude<Effect.Effect.Context<App>, Scope.Scope | ServerRequest.ServerRequest>,
    never,
    (nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse<Http.IncomingMessage>) => void
  >
} = internal.makeHandler

/**
 * @since 1.0.0
 * @category layers
 */
export const layerServer: (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) => Layer.Layer<Server.Server, ServeError> = internal.layerServer

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: (
  evaluate: LazyArg<Http.Server>,
  options: Net.ListenOptions
) => Layer.Layer<Platform.Platform | Etag.Generator | NodeContext.NodeContext | Server.Server, ServeError> =
  internal.layer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerConfig: (
  evaluate: LazyArg<Http.Server>,
  options: Config.Config.Wrap<Net.ListenOptions>
) => Layer.Layer<
  Platform.Platform | Etag.Generator | NodeContext.NodeContext | Server.Server,
  ServeError | ConfigError.ConfigError
> = internal.layerConfig
