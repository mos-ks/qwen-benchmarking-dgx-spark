# Serving each model on one DGX Spark

All models are served with vLLM's OpenAI-compatible server on port 8000 under the name
`qwen3-coder`, so the harness config never changes when the model behind it does. Weights live in
`/models/<name>` inside the container.

## Qwen3.6-35B-A3B (NVIDIA NVFP4) + MTP-3: the current pick

134.8 tok/s single stream, vision-capable. Flags follow NVIDIA's DGX Spark recommendation on the
model card; it needs a vLLM build recent enough to know `--moe-backend` (we used the
`vllm/vllm-openai:qwen38-flash-next` image).

```bash
docker run -d --name vllm_node --gpus all --ipc host --network host \
  -v "$MODELS":/models -e HF_HUB_OFFLINE=1 \
  --entrypoint vllm vllm/vllm-openai:qwen38-flash-next serve /models/qwen3.6-35b-a3b-nvfp4-nvidia \
  --served-model-name qwen3-coder --trust-remote-code \
  --kv-cache-dtype fp8 --attention-backend flashinfer --moe-backend marlin \
  --gpu-memory-utilization 0.6 --max-model-len 262144 --max-num-seqs 8 --max-num-batched-tokens 8192 \
  --enable-chunked-prefill --enable-prefix-caching \
  --speculative-config '{"method":"mtp","num_speculative_tokens":3,"moe_backend":"triton"}' \
  --reasoning-parser qwen3 --tool-call-parser qwen3_xml --enable-auto-tool-choice \
  --host 0.0.0.0 --port 8000
```

## Qwen3-Coder-Next (NVFP4, GB10-tuned build)

68.3 tok/s, text only. Checkpoint `saricles/Qwen3-Coder-Next-NVFP4-GB10` (compressed-tensors; do not
pass `--quantization`).

```bash
VLLM_NVFP4_GEMM_BACKEND=marlin VLLM_TEST_FORCE_FP8_MARLIN=1 VLLM_USE_FLASHINFER_MOE_FP4=0 VLLM_MARLIN_USE_ATOMIC_ADD=1 \
vllm serve saricles/Qwen3-Coder-Next-NVFP4-GB10 --served-model-name qwen3-coder \
  --kv-cache-dtype fp8 --max-model-len 262144 --attention-backend flashinfer \
  --enable-prefix-caching --enable-chunked-prefill --max-num-batched-tokens 8192 --max-num-seqs 64 \
  --gpu-memory-utilization 0.75 --tool-call-parser qwen3_coder --enable-auto-tool-choice
```

## Qwen3.8-27B (NVFP4, dense) + native MTP-3

20.2 tok/s. Use a build that does not quantize `lm_head` (we used `Inferact/Qwen3.8-27B-NVFP4`; a
build with `lm_head.weight_scale` fails to load). DFlash2 drafters are not supported by vLLM.

```bash
vllm serve /models/qwen3.8-27b-nvfp4-inferact --served-model-name qwen3-coder \
  --kv-cache-dtype fp8 --max-model-len 262144 --enable-prefix-caching --enable-chunked-prefill \
  --max-num-batched-tokens 8192 --max-num-seqs 32 --gpu-memory-utilization 0.75 \
  --speculative-config '{"method":"mtp","num_speculative_tokens":3}' \
  --tool-call-parser qwen3_coder --enable-auto-tool-choice --reasoning-parser qwen3
```

## Qwen3.8-Flash-Next (NVFP4, 125B / 6B active)

56.3 tok/s, vision-capable. Served with the single-Spark recipe from
[MiaAI-Lab/Qwen3.8-Flash-Next-Single-DGX-Spark](https://github.com/MiaAI-Lab/Qwen3.8-Flash-Next-Single-DGX-Spark)
(n-gram/PLE table memory-mapped from NVMe, MTP-3, FP8 KV, 262k context, a memory watchdog) on the
`local-inference-lab/Qwen3.8-Flash-Next-NVFP4` checkpoint, with these overrides:

```bash
IMAGE=vllm/vllm-openai:qwen38-flash-next TP1_MODEL_ID=local-inference-lab/Qwen3.8-Flash-Next-NVFP4 \
PORT=8000 SERVED_MODEL_NAME=qwen3-coder MAX_MODEL_LEN=262144 MTP_NUM_SPECULATIVE_TOKENS=3 \
KV_CACHE_DTYPE=fp8 KV_TARGET_GIB=6 HOST_RESERVE_GIB=36 MAMBA_SSM_CACHE_DTYPE=bfloat16 \
MAX_NUM_SEQS=4 MAX_NUM_BATCHED_TOKENS=2048 ./start.sh
```

The recipe's defaults (`KV_TARGET_GIB=20`, then 8 here) left too little host memory once agent
sessions with headless browsers ran beside the model, and its watchdog stopped the server. With
`KV_TARGET_GIB=6` (about 370k FP8 tokens, enough for a 262k context) and two sessions at a time it
stays up.

## Measuring speed

`scripts/speed.py`: an 800-token code answer, temperature 0, thinking off, median of 3.
