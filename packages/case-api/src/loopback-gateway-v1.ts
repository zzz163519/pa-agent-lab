import {
  createServer,
  request as createUpstreamRequest,
  type IncomingHttpHeaders,
  type Server,
  type ServerResponse,
} from "node:http";
import { pathToFileURL } from "node:url";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export interface LoopbackGatewayOptionsV1 {
  readonly targetOrigin: string;
  readonly allowedHosts: readonly string[];
  readonly allowedOrigins: readonly string[];
}

export function createLoopbackGatewayV1(
  options: LoopbackGatewayOptionsV1,
): Server {
  const target = validateTargetOrigin(options.targetOrigin);
  if (options.allowedHosts.length === 0 || options.allowedOrigins.length === 0) {
    throw new Error("Loopback gateway requires explicit Host and Origin allowlists");
  }
  return createServer((request, response) => {
    const host = (request.headers.host ?? "").replace(/:\d+$/, "");
    const origin = request.headers.origin;
    if (
      !options.allowedHosts.includes(host) ||
      (origin !== undefined && !options.allowedOrigins.includes(origin))
    ) {
      sendGatewayError(response, 403, "The local gateway boundary rejected the request.");
      return;
    }

    const requestTarget = request.url ?? "/";
    if (
      !requestTarget.startsWith("/") ||
      requestTarget.startsWith("//") ||
      requestTarget.includes("\\")
    ) {
      sendGatewayError(
        response,
        400,
        "The local gateway accepts only origin-form request targets.",
      );
      return;
    }
    const upstreamUrl = new URL(requestTarget, target);
    if (upstreamUrl.origin !== target.origin) {
      sendGatewayError(
        response,
        400,
        "The local gateway request target escaped its fixed upstream.",
      );
      return;
    }
    const upstream = createUpstreamRequest(
      upstreamUrl,
      {
        method: request.method,
        headers: filterHeaders(request.headers),
        setHost: false,
      },
      (upstreamResponse) => {
        response.writeHead(
          upstreamResponse.statusCode ?? 502,
          filterHeaders(upstreamResponse.headers),
        );
        upstreamResponse.pipe(response);
      },
    );
    upstream.once("error", () => {
      if (!response.headersSent) {
        sendGatewayError(response, 502, "The local Console upstream is unavailable.");
      } else {
        response.destroy();
      }
    });
    request.once("aborted", () => upstream.destroy());
    request.pipe(upstream);
  });
}

function validateTargetOrigin(value: string): URL {
  const target = new URL(value);
  if (
    target.protocol !== "http:" ||
    target.username.length > 0 ||
    target.password.length > 0 ||
    target.pathname !== "/" ||
    target.search.length > 0 ||
    target.hash.length > 0
  ) {
    throw new Error("Loopback gateway target must be one credential-free HTTP origin");
  }
  return target;
}

function filterHeaders(headers: IncomingHttpHeaders): IncomingHttpHeaders {
  const connectionValue = headers.connection;
  const nominatedHeaders = new Set(
    (Array.isArray(connectionValue)
      ? connectionValue.join(",")
      : (connectionValue ?? ""))
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name.length > 0),
  );
  return Object.fromEntries(
    Object.entries(headers).filter(([name, value]) => {
      const normalizedName = name.toLowerCase();
      return (
        value !== undefined &&
        !HOP_BY_HOP_HEADERS.has(normalizedName) &&
        !nominatedHeaders.has(normalizedName)
      );
    }),
  );
}

function sendGatewayError(
  response: ServerResponse,
  statusCode: number,
  message: string,
): void {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(
    JSON.stringify({
      code:
        statusCode === 400
          ? "BAD_REQUEST"
          : statusCode === 403
            ? "FORBIDDEN"
            : "BAD_GATEWAY",
      message,
    }),
  );
}

function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function parsePort(name: string, value: string): number {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer from 1 through 65535`);
  }
  return port;
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const targetOrigin = required(
    "PA_GATEWAY_TARGET_ORIGIN",
    process.env.PA_GATEWAY_TARGET_ORIGIN,
  );
  if (targetOrigin !== "http://console:3210") {
    throw new Error("PA_GATEWAY_TARGET_ORIGIN must be http://console:3210");
  }
  const publicPort = parsePort(
    "PA_PUBLIC_PORT",
    process.env.PA_PUBLIC_PORT ?? "3210",
  );
  const gatewayPort = parsePort(
    "PA_GATEWAY_PORT",
    process.env.PA_GATEWAY_PORT ?? "3210",
  );
  const server = createLoopbackGatewayV1({
    targetOrigin,
    allowedHosts: ["127.0.0.1", "localhost"],
    allowedOrigins: [
      `http://127.0.0.1:${publicPort}`,
      `http://localhost:${publicPort}`,
    ],
  });
  server.listen(gatewayPort, "0.0.0.0", () => {
    console.log(`http://127.0.0.1:${publicPort}/console/`);
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => server.close());
  }
}
