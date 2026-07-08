# Deploy no Jetson (Fase 3)

Roteiro para NVIDIA Jetson Orin (Nano/NX — uma câmera; AGX — múltiplas):

1. JetPack ≥ 6.0 (inclui TensorRT e CUDA).
2. `pip install ultralytics opencv-python` (rodas do índice NVIDIA quando necessário).
3. Exporte o engine **no próprio Jetson** (TensorRT engines não são portáveis
   entre GPUs): `python deploy/export_tensorrt.py --weights best.pt --half`
4. Rode o pipeline apontando para o engine:
   `python -m src.pipeline --source rtsp://... --weights best.engine`
5. Meça FPS/latência com a saída do próprio pipeline; meta ≥ 30 FPS.
6. Se usar INT8, valide o recall de alvo pequeno antes de adotar.
