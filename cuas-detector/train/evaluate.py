"""Avaliação: mAP, latência de inferência e recall por tamanho de alvo.

    python train/evaluate.py --weights best.pt --data data/dataset.yaml
    python train/evaluate.py --weights best.pt --data data/dataset.yaml --split test --sahi

O número que importa neste domínio é o recall em alvos pequenos — mAP global
esconde exatamente a faixa onde o sistema mais precisa funcionar. Este script
segmenta o recall por bucket de tamanho do alvo em pixels (√área da bbox),
o que aproxima a curva de alcance (recall × distância).
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

import numpy as np
import yaml
from ultralytics import YOLO

# buckets por √área da ground-truth em pixels
SIZE_BUCKETS = [(0, 16), (16, 32), (32, 64), (64, 128), (128, float("inf"))]


def load_split_images(data_yaml: str, split: str) -> list[Path]:
    with open(data_yaml, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    root = Path(data.get("path", Path(data_yaml).parent))
    split_dir = data.get(split)
    if split_dir is None:
        raise SystemExit(f"split {split!r} não definido em {data_yaml}")
    images = sorted(
        p for p in (root / split_dir).rglob("*")
        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".bmp"}
    )
    if not images:
        raise SystemExit(f"nenhuma imagem em {root / split_dir}")
    return images


def load_labels(image_path: Path) -> np.ndarray:
    """Labels YOLO (cls cx cy w h normalizados) -> array [n, 5]."""
    label_path = Path(str(image_path).replace("/images/", "/labels/")).with_suffix(".txt")
    if not label_path.exists():
        return np.zeros((0, 5))
    rows = [line.split() for line in label_path.read_text().splitlines() if line.strip()]
    return np.array(rows, dtype=np.float64) if rows else np.zeros((0, 5))


def xywhn_to_xyxy(labels: np.ndarray, w: int, h: int) -> np.ndarray:
    cx, cy, bw, bh = labels[:, 1] * w, labels[:, 2] * h, labels[:, 3] * w, labels[:, 4] * h
    return np.stack([cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2], axis=1)


def recall_by_size(weights: str, data_yaml: str, split: str, imgsz: int, conf: float, iou_thr: float) -> None:
    from src.track import iou_matrix  # reaproveita a IoU do tracker

    model = YOLO(weights)
    images = load_split_images(data_yaml, split)

    matched = {b: 0 for b in SIZE_BUCKETS}
    total = {b: 0 for b in SIZE_BUCKETS}

    for image_path in images:
        result = model.predict(image_path, imgsz=imgsz, conf=conf, verbose=False)[0]
        h, w = result.orig_shape
        gt = load_labels(image_path)
        if not len(gt):
            continue
        gt_xyxy = xywhn_to_xyxy(gt, w, h)
        pred_xyxy = result.boxes.xyxy.cpu().numpy() if len(result.boxes) else np.zeros((0, 4))

        hit = np.zeros(len(gt_xyxy), dtype=bool)
        if len(pred_xyxy):
            hit = iou_matrix(gt_xyxy, pred_xyxy).max(axis=1) >= iou_thr

        sizes = np.sqrt((gt_xyxy[:, 2] - gt_xyxy[:, 0]) * (gt_xyxy[:, 3] - gt_xyxy[:, 1]))
        for size, ok in zip(sizes, hit):
            for bucket in SIZE_BUCKETS:
                if bucket[0] <= size < bucket[1]:
                    total[bucket] += 1
                    matched[bucket] += int(ok)
                    break

    print(f"\nRecall por tamanho do alvo (√área em px, IoU ≥ {iou_thr}):")
    for bucket in SIZE_BUCKETS:
        hi = "∞" if bucket[1] == float("inf") else int(bucket[1])
        if total[bucket]:
            print(f"  [{bucket[0]:>3}–{hi:>3}) px : {matched[bucket] / total[bucket]:.3f}  ({matched[bucket]}/{total[bucket]})")
        else:
            print(f"  [{bucket[0]:>3}–{hi:>3}) px : sem amostras")


def benchmark_latency(weights: str, imgsz: int, device: str | None, n: int = 50) -> None:
    model = YOLO(weights)
    dummy = np.random.randint(0, 255, (imgsz, imgsz, 3), dtype=np.uint8)
    model.predict(dummy, imgsz=imgsz, device=device, verbose=False)  # warmup
    times = []
    for _ in range(n):
        t0 = time.monotonic()
        model.predict(dummy, imgsz=imgsz, device=device, verbose=False)
        times.append((time.monotonic() - t0) * 1000)
    times.sort()
    print(
        f"\nLatência de inferência (imgsz={imgsz}, n={n}): "
        f"p50={times[n // 2]:.1f}ms p95={times[int(n * 0.95)]:.1f}ms "
        f"→ ~{1000 / times[n // 2]:.0f} FPS teórico"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Avaliação do detector")
    parser.add_argument("--weights", required=True)
    parser.add_argument("--data", required=True, help="dataset.yaml")
    parser.add_argument("--split", default="val", choices=["val", "test"])
    parser.add_argument("--imgsz", type=int, default=1280)
    parser.add_argument("--conf", type=float, default=0.25)
    parser.add_argument("--iou-match", type=float, default=0.5, help="IoU para casar pred × GT no recall por tamanho")
    parser.add_argument("--device", default=None)
    parser.add_argument("--skip-map", action="store_true")
    parser.add_argument("--skip-size", action="store_true")
    parser.add_argument("--skip-latency", action="store_true")
    args = parser.parse_args()

    if not args.skip_map:
        model = YOLO(args.weights)
        metrics = model.val(data=args.data, split=args.split, imgsz=args.imgsz, device=args.device)
        print(f"\nmAP@0.5      = {metrics.box.map50:.4f}")
        print(f"mAP@0.5:0.95 = {metrics.box.map:.4f}")
        print(f"precision    = {metrics.box.mp:.4f}")
        print(f"recall       = {metrics.box.mr:.4f}")

    if not args.skip_size:
        recall_by_size(args.weights, args.data, args.split, args.imgsz, args.conf, args.iou_match)

    if not args.skip_latency:
        benchmark_latency(args.weights, args.imgsz, args.device)


if __name__ == "__main__":
    main()
