"""Tracker: associa detecções entre frames e mantém IDs + trajetórias.

O tracking é o principal redutor de falso positivo: uma detecção isolada de
1 frame é ruído; um track consistente é sinal. Também alimenta o classificador
temporal (histórico de centros por track).

Implementação: tracker por associação IoU com predição linear de movimento e
associação em dois estágios ao estilo ByteTrack (primeiro detecções de alta
confiança, depois as de baixa — alvos pequenos "piscam" e a segunda passada
resgata tracks que sumiriam). Sem dependência de APIs internas da Ultralytics,
funciona igualmente para o caminho direto e para o SAHI.

No modo rápido sem SAHI também é possível usar o ByteTrack nativo da
Ultralytics via ``model.track``; este módulo existe para manter o pipeline
único e desacoplado do detector.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .detect import Detection


def iou_matrix(boxes_a: np.ndarray, boxes_b: np.ndarray) -> np.ndarray:
    """IoU entre dois conjuntos de boxes xyxy. Retorna matriz [len(a), len(b)]."""
    a = boxes_a[:, None, :]  # [n, 1, 4]
    b = boxes_b[None, :, :]  # [1, m, 4]
    inter_w = np.clip(np.minimum(a[..., 2], b[..., 2]) - np.maximum(a[..., 0], b[..., 0]), 0, None)
    inter_h = np.clip(np.minimum(a[..., 3], b[..., 3]) - np.maximum(a[..., 1], b[..., 1]), 0, None)
    inter = inter_w * inter_h
    area_a = (a[..., 2] - a[..., 0]) * (a[..., 3] - a[..., 1])
    area_b = (b[..., 2] - b[..., 0]) * (b[..., 3] - b[..., 1])
    union = area_a + area_b - inter
    return np.where(union > 0, inter / union, 0.0)


@dataclass
class Track:
    track_id: int
    xyxy: np.ndarray
    conf: float
    cls_id: int
    cls_name: str
    hits: int = 1                 # frames com detecção associada
    age: int = 1                  # frames desde a criação
    time_since_update: int = 0    # frames desde a última associação
    velocity: np.ndarray = field(default_factory=lambda: np.zeros(2, dtype=np.float32))
    history: list[tuple[int, float, float]] = field(default_factory=list)  # (frame, cx, cy)
    conf_history: list[float] = field(default_factory=list)

    @property
    def center(self) -> np.ndarray:
        return np.array([(self.xyxy[0] + self.xyxy[2]) / 2, (self.xyxy[1] + self.xyxy[3]) / 2])

    @property
    def mean_conf(self) -> float:
        return float(np.mean(self.conf_history)) if self.conf_history else self.conf

    def predict_box(self) -> np.ndarray:
        """Box deslocada pela velocidade estimada (predição linear simples)."""
        shift = np.tile(self.velocity, 2)
        return self.xyxy + shift

    def update(self, det: Detection, frame_index: int) -> None:
        new_center = np.array([(det.xyxy[0] + det.xyxy[2]) / 2, (det.xyxy[1] + det.xyxy[3]) / 2])
        gap = self.time_since_update + 1
        self.velocity = ((new_center - self.center) / gap).astype(np.float32)
        self.xyxy = det.xyxy
        self.conf = det.conf
        self.cls_id = det.cls_id
        self.cls_name = det.cls_name
        self.hits += 1
        self.time_since_update = 0
        self.history.append((frame_index, float(new_center[0]), float(new_center[1])))
        self.conf_history.append(det.conf)

    def mark_missed(self) -> None:
        self.time_since_update += 1
        self.xyxy = self.predict_box()  # coasting: segue pela inércia


def _greedy_match(iou: np.ndarray, threshold: float) -> tuple[list[tuple[int, int]], set[int], set[int]]:
    """Associação gulosa por maior IoU (iou não-vazia). Retorna (pares, tracks_livres, dets_livres)."""
    matches: list[tuple[int, int]] = []
    iou = iou.copy()
    while True:
        i, j = np.unravel_index(np.argmax(iou), iou.shape)
        if iou[i, j] < threshold:
            break
        matches.append((int(i), int(j)))
        iou[i, :] = -1
        iou[:, j] = -1
    free_t = set(range(iou.shape[0])) - {i for i, _ in matches}
    free_d = set(range(iou.shape[1])) - {j for _, j in matches}
    return matches, free_t, free_d


class ByteIoUTracker:
    """Tracker IoU com associação em dois estágios (estilo ByteTrack)."""

    def __init__(
        self,
        iou_threshold: float = 0.3,
        max_age: int = 30,
        min_hits: int = 3,
        high_conf: float = 0.5,
        min_new_track_conf: float = 0.4,
    ):
        self.iou_threshold = iou_threshold
        self.max_age = max_age
        self.min_hits = min_hits
        self.high_conf = high_conf
        self.min_new_track_conf = min_new_track_conf
        self.tracks: list[Track] = []
        self._next_id = 1

    def update(self, detections: list[Detection], frame_index: int) -> list[Track]:
        """Atualiza com as detecções do frame; retorna tracks ativos confirmados."""
        for t in self.tracks:
            t.age += 1

        high = [d for d in detections if d.conf >= self.high_conf]
        low = [d for d in detections if d.conf < self.high_conf]

        # Estágio 1: detecções de alta confiança contra todos os tracks.
        unmatched_high = self._associate(high, list(range(len(self.tracks))), frame_index)

        # Estágio 2: detecções de baixa confiança resgatam tracks ainda sem par.
        remaining = [i for i in range(len(self.tracks)) if self._missed_this_frame(i, frame_index)]
        self._associate(low, remaining, frame_index)

        # Tracks sem detecção neste frame: coasting.
        for t in self.tracks:
            if not t.history or t.history[-1][0] != frame_index:
                t.mark_missed()

        # Novos tracks apenas de detecções de alta confiança não associadas.
        for det in unmatched_high:
            if det.conf >= self.min_new_track_conf:
                self._start_track(det, frame_index)

        # Remove tracks perdidos há tempo demais.
        self.tracks = [t for t in self.tracks if t.time_since_update <= self.max_age]

        return [t for t in self.tracks if t.hits >= self.min_hits and t.time_since_update == 0]

    def _missed_this_frame(self, idx: int, frame_index: int) -> bool:
        t = self.tracks[idx]
        return not t.history or t.history[-1][0] != frame_index

    def _associate(self, dets: list[Detection], track_indices: list[int], frame_index: int) -> list[Detection]:
        """Associa dets aos tracks indicados; retorna detecções sem par."""
        if not dets or not track_indices:
            return list(dets)
        track_boxes = np.stack([self.tracks[i].predict_box() for i in track_indices])
        det_boxes = np.stack([d.xyxy for d in dets])
        iou = iou_matrix(track_boxes, det_boxes)
        matches, _, free_d = _greedy_match(iou, self.iou_threshold)
        for ti, dj in matches:
            self.tracks[track_indices[ti]].update(dets[dj], frame_index)
        return [dets[j] for j in free_d]

    def _start_track(self, det: Detection, frame_index: int) -> None:
        track = Track(
            track_id=self._next_id,
            xyxy=det.xyxy,
            conf=det.conf,
            cls_id=det.cls_id,
            cls_name=det.cls_name,
        )
        cx, cy = track.center
        track.history.append((frame_index, float(cx), float(cy)))
        track.conf_history.append(det.conf)
        self._next_id += 1
        self.tracks.append(track)
