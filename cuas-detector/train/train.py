"""Fine-tune YOLO em dataset de drones (Fase 0/1).

    python train/train.py --config configs/train.yaml
    python train/train.py --config configs/train.yaml --epochs 5   # smoke test

Chaves do YAML não tratadas aqui são repassadas direto ao Ultralytics, então o
train.yaml aceita qualquer hiperparâmetro válido de `YOLO.train()`.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import yaml
from ultralytics import YOLO


def main() -> None:
    parser = argparse.ArgumentParser(description="Treino do detector de drones")
    parser.add_argument("--config", default="configs/train.yaml")
    parser.add_argument("--model", default=None, help="pesos base (sobrepõe o YAML)")
    parser.add_argument("--data", default=None, help="dataset.yaml (sobrepõe o YAML)")
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch", type=int, default=None)
    parser.add_argument("--imgsz", type=int, default=None)
    parser.add_argument("--device", default=None)
    args = parser.parse_args()

    with open(args.config, encoding="utf-8") as f:
        cfg: dict = yaml.safe_load(f)

    for key in ("model", "data", "epochs", "batch", "imgsz", "device"):
        value = getattr(args, key)
        if value is not None:
            cfg[key] = value

    base_weights = cfg.pop("model")
    data = cfg.pop("data")
    if not Path(data).exists():
        raise SystemExit(
            f"dataset não encontrado: {data}\n"
            "Baixe um dataset público (ver data/datasets.md) e aponte a chave "
            "'data' do train.yaml para o dataset.yaml dele."
        )

    model = YOLO(base_weights)
    model.train(data=data, **cfg)

    # validação final no split de val com os melhores pesos
    metrics = model.val(data=data)
    print(f"\nmAP@0.5      = {metrics.box.map50:.4f}")
    print(f"mAP@0.5:0.95 = {metrics.box.map:.4f}")
    print(f"precision    = {metrics.box.mp:.4f}")
    print(f"recall       = {metrics.box.mr:.4f}")


if __name__ == "__main__":
    main()
