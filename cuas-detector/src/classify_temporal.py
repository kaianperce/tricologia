"""Classificador temporal: discrimina drone × pássaro pelo padrão de movimento.

Quando o alvo tem poucos pixels, a aparência isolada engana; a assinatura de
movimento separa melhor. Drones fazem hover (pairam), voam em segmentos retos
com velocidade quase constante e mudam de direção em "cantos"; pássaros têm
trajetória ondulada (batida de asa), curvatura contínua e raramente ficam
parados no ar.

Fase 2 (estado atual): extração de features implementada + classificador
heurístico por regras. O vetor de features já está pronto para virar entrada
de um modelo treinado (ex.: gradient boosting ou uma GRU pequena) quando
houver dados próprios rotulados.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .track import Track


@dataclass
class TrajectoryFeatures:
    n_points: int
    mean_speed: float       # px/frame
    std_speed: float
    mean_accel: float       # px/frame²
    mean_curvature: float   # variação média de direção por passo (rad)
    hover_ratio: float      # fração do tempo quase parado
    straightness: float     # deslocamento líquido / caminho percorrido (0..1)

    def as_vector(self) -> np.ndarray:
        return np.array(
            [self.mean_speed, self.std_speed, self.mean_accel,
             self.mean_curvature, self.hover_ratio, self.straightness],
            dtype=np.float32,
        )


def extract_features(track: Track, window: int = 60, hover_speed_px: float = 1.5) -> TrajectoryFeatures | None:
    """Features da trajetória recente do track. None se histórico insuficiente."""
    pts = track.history[-window:]
    if len(pts) < 8:
        return None

    frames = np.array([p[0] for p in pts], dtype=np.float64)
    xy = np.array([[p[1], p[2]] for p in pts], dtype=np.float64)

    dt = np.diff(frames)
    dt[dt == 0] = 1.0
    step = np.diff(xy, axis=0)
    vel = step / dt[:, None]
    speed = np.linalg.norm(vel, axis=1)

    accel = np.diff(speed) / dt[1:] if len(speed) > 1 else np.zeros(1)

    heading = np.arctan2(vel[:, 1], vel[:, 0])
    # menor diferença angular entre passos consecutivos
    dh = np.diff(heading)
    curvature = np.abs(np.arctan2(np.sin(dh), np.cos(dh))) if len(heading) > 1 else np.zeros(1)

    path_len = float(np.sum(np.linalg.norm(step, axis=1)))
    net_disp = float(np.linalg.norm(xy[-1] - xy[0]))

    return TrajectoryFeatures(
        n_points=len(pts),
        mean_speed=float(np.mean(speed)),
        std_speed=float(np.std(speed)),
        mean_accel=float(np.mean(np.abs(accel))),
        mean_curvature=float(np.mean(curvature)),
        hover_ratio=float(np.mean(speed < hover_speed_px)),
        straightness=net_disp / path_len if path_len > 1e-6 else 1.0,
    )


class TemporalClassifier:
    """Combina a classe do detector com evidência de movimento.

    Retorna (label, score) onde score ∈ [0, 1] é a confiança de que o alvo é
    um drone. Heurística inicial — substituir por modelo treinado na Fase 2.
    """

    def __init__(self, window: int = 60):
        self.window = window

    def classify(self, track: Track) -> tuple[str, float]:
        feats = extract_features(track, window=self.window)
        if feats is None:
            # sem trajetória suficiente, confia na aparência
            return track.cls_name, track.mean_conf

        drone_evidence = 0.0
        # hover é a assinatura mais forte de multirrotor
        drone_evidence += min(feats.hover_ratio / 0.3, 1.0) * 0.45
        # voo retilíneo com velocidade estável
        if feats.straightness > 0.85 and feats.std_speed < 0.35 * max(feats.mean_speed, 1e-6):
            drone_evidence += 0.30
        # curvatura contínua alta sugere pássaro
        drone_evidence += (1.0 - min(feats.mean_curvature / 0.5, 1.0)) * 0.25

        appearance = track.mean_conf if track.cls_name == "drone" else 1.0 - track.mean_conf
        score = 0.5 * appearance + 0.5 * drone_evidence
        return ("drone" if score >= 0.5 else "bird"), float(score)
