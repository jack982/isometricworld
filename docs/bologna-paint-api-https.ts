/** The only real HTTP transport. Imported by the live CLI only after offline validation/approval. */
import { Agent, request } from "node:https";
import { CLIENT, ENDPOINT } from "./bologna-paint-api-core.ts";
import { AttemptError, type Transport } from "./bologna-paint-api-attempt.ts";

export function oneRequestTransport(): Transport {
  let calls = 0;
  return async (body, key) => {
    if (++calls !== 1) throw new AttemptError("REQUEST_CAP_REACHED");
    return new Promise((resolve, reject) => {
      // A private agent: no SDK, reused connection, global proxy agent, redirect or retry machinery.
      const agent = new Agent({ keepAlive: false, maxSockets: 1 });
      let settled = false;
      const finish = (error?: AttemptError, result?: Awaited<ReturnType<Transport>>) => {
        if (settled) return; settled = true; clearTimeout(timer); agent.destroy();
        if (error) reject(error); else resolve(result!);
      };
      const req = request(ENDPOINT, { method: "POST", agent, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Content-Length": body.length, Connection: "close" } }, res => {
        const chunks: Buffer[] = []; let bytes = 0;
        res.on("data", chunk => {
          bytes += chunk.length;
          if (bytes > CLIENT.responseByteLimit) { finish(new AttemptError("RESPONSE_TOO_LARGE")); req.destroy(); }
          else chunks.push(Buffer.from(chunk));
        });
        res.on("aborted", () => finish(new AttemptError("NETWORK_DISCONNECT")));
        res.on("error", () => finish(new AttemptError("NETWORK_DISCONNECT")));
        res.on("end", () => finish(undefined, { status: res.statusCode || 0, contentType: String(res.headers["content-type"] || ""), requestId: res.headers["x-request-id"], body: Buffer.concat(chunks) }));
      });
      const timer = setTimeout(() => { finish(new AttemptError("TIMEOUT")); req.destroy(); }, CLIENT.timeoutMs);
      req.on("error", () => finish(new AttemptError("NETWORK_DISCONNECT")));
      req.end(body); // exactly one application write, no follow-up upload, URL fetch or polling
    });
  };
}
