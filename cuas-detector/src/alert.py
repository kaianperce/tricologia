"""Alerta e saída: regra de confirmação, eventos estruturados e log JSONL.

Regra de confirmação: um alerta só é emitido quando um track existe por
``min_track_frames`` frames com confiança média ≥ ``min_mean_conf``. Isso
elimina a detecção-fantasma de 1 frame na origem.

Eventos emitidos por track: CONFIRMED (virou alerta), UPDATE (a cada
``update_every`` frames enquanto confirmado), LOST (sumiu). Todos vão para o
log JSONL (after-action review) e para os callbacks registrados — é por aqui
que uma UI/WebSocket ou um BMS externo consumiria os tracks.
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable

from .track import Track


@dataclass
class AlertEvent:
    event: str            # CONFIRMED | UPDATE | LOST
    track_id: int
    frame_index: int
    timestamp: float      # epoch
    label: str            # classe após o classificador temporal
    score: float          # confiança drone (classificador temporal)
    detector_class: str
    mean_conf: float
    bbox_xyxy: list[float]
    track_age_frames: int


class AlertManager:
    def __init__(
        self,
        min_track_frames: int = 8,
        min_mean_conf: float = 0.35,
        update_every: int = 30,
        log_path: str | None = None,
        alert_classes: tuple[str, ...] = ("drone",),
    ):
        self.min_track_frames = min_track_frames
        self.min_mean_conf = min_mean_conf
        self.update_every = update_every
        self.alert_classes = alert_classes
        self._confirmed: dict[int, int] = {}  # track_id -> frame da última emissão
        self._callbacks: list[Callable[[AlertEvent], None]] = []
        self._log_file = None
        if log_path:
            Path(log_path).parent.mkdir(parents=True, exist_ok=True)
            self._log_file = open(log_path, "a", encoding="utf-8")

    def on_alert(self, callback: Callable[[AlertEvent], None]) -> None:
        self._callbacks.append(callback)

    @property
    def confirmed_track_ids(self) -> set[int]:
        return set(self._confirmed)

    def process(
        self,
        tracks: list[Track],
        classifications: dict[int, tuple[str, float]],
        frame_index: int,
    ) -> list[AlertEvent]:
        """Avalia os tracks ativos do frame e emite eventos. Retorna os emitidos."""
        events: list[AlertEvent] = []
        active_ids = set()

        for track in tracks:
            active_ids.add(track.track_id)
            label, score = classifications.get(track.track_id, (track.cls_name, track.mean_conf))
            qualifies = (
                label in self.alert_classes
                and track.hits >= self.min_track_frames
                and track.mean_conf >= self.min_mean_conf
            )
            if not qualifies:
                continue
            if track.track_id not in self._confirmed:
                events.append(self._emit("CONFIRMED", track, label, score, frame_index))
            elif frame_index - self._confirmed[track.track_id] >= self.update_every:
                events.append(self._emit("UPDATE", track, label, score, frame_index))

        # tracks confirmados que não estão mais ativos
        for track_id in [tid for tid in self._confirmed if tid not in active_ids]:
            del self._confirmed[track_id]
            events.append(
                self._dispatch(
                    AlertEvent(
                        event="LOST", track_id=track_id, frame_index=frame_index,
                        timestamp=time.time(), label="", score=0.0, detector_class="",
                        mean_conf=0.0, bbox_xyxy=[], track_age_frames=0,
                    )
                )
            )
        return events

    def _emit(self, kind: str, track: Track, label: str, score: float, frame_index: int) -> AlertEvent:
        self._confirmed[track.track_id] = frame_index
        return self._dispatch(
            AlertEvent(
                event=kind,
                track_id=track.track_id,
                frame_index=frame_index,
                timestamp=time.time(),
                label=label,
                score=round(score, 4),
                detector_class=track.cls_name,
                mean_conf=round(track.mean_conf, 4),
                bbox_xyxy=[round(float(v), 1) for v in track.xyxy],
                track_age_frames=track.age,
            )
        )

    def _dispatch(self, event: AlertEvent) -> AlertEvent:
        if self._log_file:
            self._log_file.write(json.dumps(asdict(event), ensure_ascii=False) + "\n")
            self._log_file.flush()
        for cb in self._callbacks:
            cb(event)
        return event

    def close(self) -> None:
        if self._log_file:
            self._log_file.close()
            self._log_file = None
