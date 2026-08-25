export class RpcError extends Error {
  constructor(method, error) {
    super(`${method}: RPC ${error.code}: ${error.message}`);
    this.name = "RpcError";
    this.method = method;
    this.rpcError = error;
  }
}

export class RpcClient {
  constructor(url, { fetchImpl = globalThis.fetch, retries = 4, timeoutMs = 15_000 } = {}) {
    this.url = url;
    this.fetchImpl = fetchImpl;
    this.retries = retries;
    this.timeoutMs = timeoutMs;
    this.id = 0;
  }

  async call(method, params = []) {
    const body = JSON.stringify({ jsonrpc: "2.0", id: ++this.id, method, params });
    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        const response = await this.fetchImpl(this.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (response.status === 429 || response.status >= 500) {
          const detail = await response.text();
          throw new Error(`HTTP ${response.status}: ${detail.slice(0, 300)}`);
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (payload.error) throw new RpcError(method, payload.error);
        return payload.result;
      } catch (error) {
        lastError = error;
        if (error instanceof RpcError || attempt === this.retries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 350 * 2 ** attempt));
      }
    }
    throw lastError;
  }

  async batch(calls) {
    const body = calls.map(({ method, params = [] }) => ({
      jsonrpc: "2.0",
      id: ++this.id,
      method,
      params,
    }));
    const response = await this.fetchImpl(this.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`RPC batch HTTP ${response.status}`);
    const payload = await response.json();
    const byId = new Map(payload.map((item) => [item.id, item]));
    return body.map((request) => {
      const item = byId.get(request.id);
      if (item?.error) throw new RpcError(request.method, item.error);
      return item?.result;
    });
  }
}

export function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}
