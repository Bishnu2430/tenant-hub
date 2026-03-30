export type ApiError = {
  status: number;
  detail: string;
};

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:8000"
  );
}

async function parseError(resp: Response): Promise<ApiError> {
  const status = resp.status;
  let detail = resp.statusText;
  try {
    const body: unknown = await resp.json();
    if (body && typeof body === "object") {
      const obj = body as Record<string, unknown>;
      const d = obj["detail"];
      const m = obj["message"];
      if (typeof d === "string") detail = d;
      else if (Array.isArray(d)) detail = JSON.stringify(d);
      else if (typeof m === "string") detail = m;
      else detail = JSON.stringify(obj);
    } else {
      detail = JSON.stringify(body);
    }
  } catch {
    // ignore
  }
  return { status, detail };
}

export async function apiGet<T>(
  path: string,
  opts?: { token?: string },
): Promise<T> {
  const resp = await fetch(`${getBaseUrl()}${path}`, {
    method: "GET",
    headers: {
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    cache: "no-store",
  });
  if (!resp.ok) throw await parseError(resp);
  return (await resp.json()) as T;
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  opts?: { token?: string },
): Promise<T> {
  const resp = await fetch(`${getBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw await parseError(resp);
  return (await resp.json()) as T;
}
