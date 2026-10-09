"""Single-stream decode speed on a code prompt (thinking off), median of 3."""
import json, sys, time, urllib.request, statistics
model = sys.argv[1] if len(sys.argv) > 1 else "qwen3-coder"
prompt = "Write a complete Python module implementing an LRU cache with TTL expiry, thread safety, and a pytest test suite covering eviction order, expiry and concurrency."
rates = []
for _ in range(3):
    body = {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 800, "temperature": 0, "stream": True,
            "stream_options": {"include_usage": True}, "chat_template_kwargs": {"enable_thinking": False}}
    t0 = time.time(); first = None; n = 0
    r = urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8000/v1/chat/completions", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=600)
    for line in r:
        line = line.decode().strip()
        if not line.startswith("data:") or line == "data: [DONE]": continue
        d = json.loads(line[5:])
        if d.get("usage"): n = d["usage"]["completion_tokens"]
        if d["choices"] and d["choices"][0]["delta"].get("content") and first is None: first = time.time()
    rates.append(n / (time.time() - first)); ttft = first - t0
print(f"{model}: decode {statistics.median(rates):.1f} tok/s (runs {[round(x,1) for x in rates]}), ttft {ttft*1000:.0f} ms, {n} tokens")
