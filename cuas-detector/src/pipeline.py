"""Pipeline ponta-a-ponta: ingest → detector → tracker → classificador → alerta.

Uso:
    python -m src.pipeline --source video.mp4 --weights best.pt --show
    python -m src.pipeline --source rtsp://... --sahi --save out.mp4 --log alerts.jsonl
    python -m src.pipeline --source 0 --config configs/model.yaml

Flags de CLI têm precedência sobre o configs/model.yaml.
"""

from __future__ import annotations

import argparse
import time
from pathlib import Path

import cv2
import yaml

from .alert import AlertManager
from .classify_temporal import TemporalClassifier
from .detect import Detector
from .ingest import VideoSource
from .track import ByteIoUTracker, Track

COLOR_DRONE = (0, 0, 255)      # BGR: vermelho
COLOR_BIRD = (0, 200, 255)     # amarelo
COLOR_UNCONFIRMED = (160, 160, 160)


def draw_track(image, track: Track, label: str, score: float, confirmed: bool) -> None:
    x1, y1, x2, y2 = (int(v) for v in track.xyxy)
    color = COLOR_UNCONFIRMED if not confirmed else (COLOR_DRONE if label == "drone" else COLOR_BIRD)
    cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
    text = f"#{track.track_id} {label} {score:.2f}"
    cv2.putText(image, text, (x1, max(y1 - 6, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)
    # rastro da trajetória
    pts = track.history[-40:]
    for (_, ax, ay), (_, bx, by) in zip(pts, pts[1:]):
        cv2.line(image, (int(ax), int(ay)), (int(bx), int(by)), color, 1)


def load_config(path: str | None) -> dict:
    if not path or not Path(path).exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Pipeline de detecção de drones (percepção C-UAS)")
    p.add_argument("--source", required=True, help="arquivo, índice de câmera USB (ex.: 0) ou URL RTSP")
    p.add_argument("--config", default="configs/model.yaml", help="YAML de configuração")
    p.add_argument("--weights", default=None, help="pesos YOLO (.pt)")
    p.add_argument("--imgsz", type=int, default=None)
    p.add_argument("--conf", type=float, default=None)
    p.add_argument("--device", default=None, help='"cpu", "0", ...')
    p.add_argument("--sahi", action="store_true", help="inferência em tiles (alvo pequeno)")
    p.add_argument("--tile-size", type=int, default=None)
    p.add_argument("--tile-overlap", type=float, default=None)
    p.add_argument("--show", action="store_true", help="janela com vídeo anotado")
    p.add_argument("--save", default=None, help="grava vídeo anotado neste caminho")
    p.add_argument("--log", default=None, help="log JSONL de alertas")
    p.add_argument("--max-frames", type=int, default=None, help="processa no máximo N frames (debug)")
    return p


def main() -> None:
    args = build_parser().parse_args()
    cfg = load_config(args.config)
    sahi_cfg = cfg.get("sahi", {})
    tracker_cfg = cfg.get("tracker", {})
    alert_cfg = cfg.get("alert", {})

    detector = Detector(
        weights=args.weights or cfg.get("weights", "yolo11n.pt"),
        imgsz=args.imgsz or cfg.get("imgsz", 1280),
        conf=args.conf or cfg.get("conf", 0.25),
        iou=cfg.get("iou", 0.45),
        device=args.device or cfg.get("device"),
        sahi=args.sahi or sahi_cfg.get("enabled", False),
        tile_size=args.tile_size or sahi_cfg.get("tile_size", 640),
        tile_overlap=args.tile_overlap or sahi_cfg.get("overlap", 0.2),
    )
    tracker = ByteIoUTracker(
        iou_threshold=tracker_cfg.get("iou_threshold", 0.3),
        max_age=tracker_cfg.get("max_age", 30),
        min_hits=tracker_cfg.get("min_hits", 3),
    )
    classifier = TemporalClassifier()
    alerts = AlertManager(
        min_track_frames=alert_cfg.get("min_track_frames", 8),
        min_mean_conf=alert_cfg.get("min_mean_conf", 0.35),
        log_path=args.log,
    )
    alerts.on_alert(lambda e: print(
        f"[{e.event}] track #{e.track_id} {e.label} score={e.score:.2f} "
        f"bbox={e.bbox_xyxy} frame={e.frame_index}"
    ))

    writer = None
    n_frames = 0
    t_start = time.monotonic()
    latencies: list[float] = []

    with VideoSource(args.source) as source:
        if args.save:
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(args.save, fourcc, source.fps, (source.width, source.height))

        try:
            for frame in source:
                t0 = time.monotonic()
                detections = detector(frame.image)
                tracks = tracker.update(detections, frame.index)
                classifications = {t.track_id: classifier.classify(t) for t in tracks}
                events = alerts.process(tracks, classifications, frame.index)
                latencies.append((time.monotonic() - t0) * 1000)
                n_frames += 1

                if args.show or writer is not None:
                    confirmed_ids = {e.track_id for e in events} | alerts.confirmed_track_ids
                    for t in tracks:
                        label, score = classifications[t.track_id]
                        draw_track(frame.image, t, label, score, t.track_id in confirmed_ids)
                    if writer is not None:
                        writer.write(frame.image)
                    if args.show:
                        cv2.imshow("cuas-detector", frame.image)
                        if cv2.waitKey(1) & 0xFF == ord("q"):
                            break

                if args.max_frames and n_frames >= args.max_frames:
                    break
        finally:
            if writer is not None:
                writer.release()
            if args.show:
                cv2.destroyAllWindows()
            alerts.close()

    elapsed = time.monotonic() - t_start
    if n_frames:
        lat_sorted = sorted(latencies)
        p50 = lat_sorted[len(lat_sorted) // 2]
        p95 = lat_sorted[int(len(lat_sorted) * 0.95)]
        print(
            f"\n{n_frames} frames em {elapsed:.1f}s — {n_frames / elapsed:.1f} FPS | "
            f"latência por frame: p50={p50:.1f}ms p95={p95:.1f}ms"
        )


if __name__ == "__main__":
    main()
