import assert from "node:assert/strict";
import { createServer, request as createRequest } from "node:http";
import { describe, it } from "node:test";

import { createLoopbackGatewayV1 } from "../src/loopback-gateway-v1.ts";

function listen(server: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const bound = server.address();
      if (bound === null || typeof bound === "string") {
        reject(new Error("server did not bind a TCP port"));
        return;
      }
      resolve(bound.port);
    });
  });
}

function close(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error))),
  );
}

function get(
  port: number,
  headers: Readonly<Record<string, string>>,
  path = "/readyz",
): Promise<{ readonly status: number; readonly body: string }> {
  return new Promise((resolve, reject) => {
    const request = createRequest(
      {
        host: "127.0.0.1",
        port,
        path,
        method: "GET",
        headers,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () =>
          resolve({ status: response.statusCode ?? 0, body }),
        );
      },
    );
    request.once("error", reject);
    request.end();
  });
}

describe("Phase 3A loopback gateway", () => {
  it("proxies only an allowed local Host and Origin to one fixed upstream", async () => {
    const upstream = createServer((request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          url: request.url,
          host: request.headers.host,
          forwardedHop: request.headers["x-hop"] ?? null,
        }),
      );
    });
    const rogueRequests: string[] = [];
    const rogue = createServer((request, response) => {
      rogueRequests.push(request.url ?? "");
      response.end("ROGUE");
    });
    const upstreamPort = await listen(upstream);
    const roguePort = await listen(rogue);
    const gateway = createLoopbackGatewayV1({
      targetOrigin: `http://127.0.0.1:${upstreamPort}`,
      allowedHosts: ["127.0.0.1", "localhost"],
      allowedOrigins: ["http://127.0.0.1:3211"],
    });
    const gatewayPort = await listen(gateway);
    try {
      const accepted = await get(gatewayPort, {
        host: "127.0.0.1:3211",
        origin: "http://127.0.0.1:3211",
        connection: "x-hop",
        "x-hop": "must-not-reach-upstream",
      });
      assert.equal(accepted.status, 200);
      assert.deepEqual(JSON.parse(accepted.body), {
        url: "/readyz",
        host: "127.0.0.1:3211",
        forwardedHop: null,
      });

      const foreignHost = await get(gatewayPort, {
        host: "attacker.example",
      });
      assert.equal(foreignHost.status, 403);

      const foreignOrigin = await get(gatewayPort, {
        host: "127.0.0.1:3211",
        origin: "http://attacker.example",
      });
      assert.equal(foreignOrigin.status, 403);

      const absoluteTarget = await get(
        gatewayPort,
        { host: "127.0.0.1:3211" },
        "http://attacker.example/",
      );
      assert.equal(absoluteTarget.status, 400);

      const backslashTarget = await get(
        gatewayPort,
        { host: "127.0.0.1:3211" },
        `/\\\\127.0.0.1:${roguePort}/escaped`,
      );
      assert.equal(backslashTarget.status, 400);
      assert.deepEqual(rogueRequests, []);
    } finally {
      await close(gateway);
      await close(upstream);
      await close(rogue);
    }
  });
});
