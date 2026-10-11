// Thin JSON client for the Splitter API. Throws an Error carrying the server's message on failure.
export async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `request failed (${res.status})`);
  return data;
}
