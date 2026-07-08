"""Export do modelo para TensorRT/ONNX (Fase 3 — edge/Jetson).

    python deploy/export_tensorrt.py --weights best.pt --format engine --half
    python deploy/export_tensorrt.py --weights best.pt --format onnx

Atenção: quantização INT8 pode derrubar o recall de alvo pequeno — sempre rode
train/evaluate.py (em especial o recall por tamanho) antes e depois do export
e compare.
"""

from __future__ import annotations

import argparse

from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Export para edge")
    parser.add_argument("--weights", required=True)
    parser.add_argument("--format", default="engine", choices=["engine", "onnx"],
                        help="engine = TensorRT (requer GPU NVIDIA no host de export)")
    parser.add_argument("--imgsz", type=int, default=1280)
    parser.add_argument("--half", action="store_true", help="FP16")
    parser.add_argument("--int8", action="store_true", help="INT8 (validar recall de alvo pequeno!)")
    parser.add_argument("--device", default="0")
    args = parser.parse_args()

    model = YOLO(args.weights)
    path = model.export(
        format=args.format,
        imgsz=args.imgsz,
        half=args.half,
        int8=args.int8,
        device=args.device,
    )
    print(f"exportado: {path}")
    print("valide com: python train/evaluate.py --weights", path)


if __name__ == "__main__":
    main()
