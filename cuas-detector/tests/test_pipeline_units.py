"""Testes unitários dos estágios que não dependem de modelo/GPU.

    cd cuas-detector && python -m pytest tests/ -v
"""

from __future__ import annotations

import numpy as np
import pytest

from src.alert import AlertManager
from src.classify_temporal import TemporalClassifier, extract_features
from src.detect import Detection
from src.track import ByteIoUTracker, iou_matrix


def det(x1, y1, x2, y2, conf=0.8, cls_name="drone"):
    return Detection(xyxy=np.array([x1, y1, x2, y2], dtype=np.float32),
                     conf=conf, cls_id=0, cls_name=cls_name)


def moving_target_frames(n, start=(100, 100), size=20, step=(5, 0), conf=0.8):
    """Gera n frames de uma detecção andando em linha reta."""
    frames = []
    for i in range(n):
        x = start[0] + step[0] * i
        y = start[1] + step[1] * i
        frames.append([det(x, y, x + size, y + size, conf=conf)])
    return frames


class TestIoU:
    def test_identical_boxes(self):
        a = np.array([[0, 0, 10, 10]], dtype=np.float64)
        assert iou_matrix(a, a)[0, 0] == pytest.approx(1.0)

    def test_disjoint_boxes(self):
        a = np.array([[0, 0, 10, 10]], dtype=np.float64)
        b = np.array([[100, 100, 110, 110]], dtype=np.float64)
        assert iou_matrix(a, b)[0, 0] == 0.0


class TestTracker:
    def test_persistent_id_on_moving_target(self):
        tracker = ByteIoUTracker(min_hits=3)
        ids = set()
        for i, dets in enumerate(moving_target_frames(20)):
            for t in tracker.update(dets, i):
                ids.add(t.track_id)
        assert ids == {1}  # um único track, sem fragmentação

    def test_min_hits_suppresses_single_frame_ghost(self):
        tracker = ByteIoUTracker(min_hits=3)
        confirmed = tracker.update([det(0, 0, 20, 20)], 0)
        assert confirmed == []  # 1 frame não confirma
        confirmed = tracker.update([], 1)
        assert confirmed == []

    def test_track_survives_detection_gap(self):
        """Alvo pequeno 'pisca': o track deve sobreviver a frames sem detecção."""
        tracker = ByteIoUTracker(min_hits=3, max_age=10)
        frames = moving_target_frames(15)
        for i, dets in enumerate(frames):
            if i in (6, 7):  # duas falhas de detecção
                dets = []
            tracker.update(dets, i)
        active = tracker.update(frames[14], 15)
        assert len(active) == 1 and active[0].track_id == 1

    def test_low_conf_rescues_track_but_does_not_create(self):
        tracker = ByteIoUTracker(min_hits=2, high_conf=0.5)
        # track nasce com confiança alta
        for i, dets in enumerate(moving_target_frames(5, conf=0.8)):
            tracker.update(dets, i)
        # segue só com detecções fracas — associadas ao track existente
        weak = moving_target_frames(5, start=(125, 100), conf=0.2)
        for j, dets in enumerate(weak):
            active = tracker.update(dets, 5 + j)
        assert len(active) == 1
        # detecção fraca isolada em outro lugar não vira track novo
        tracker2 = ByteIoUTracker(min_hits=1)
        assert tracker2.update([det(500, 500, 520, 520, conf=0.2)], 0) == []


class TestTemporalClassifier:
    def _run_track(self, frames):
        tracker = ByteIoUTracker(min_hits=1)
        track = None
        for i, dets in enumerate(frames):
            active = tracker.update(dets, i)
            if active:
                track = active[0]
        return track

    def test_insufficient_history_returns_none(self):
        track = self._run_track(moving_target_frames(3))
        assert extract_features(track) is None

    def test_hover_scores_as_drone(self):
        # alvo parado (hover) por 30 frames — assinatura de multirrotor
        frames = moving_target_frames(30, step=(0, 0))
        track = self._run_track(frames)
        feats = extract_features(track)
        assert feats.hover_ratio > 0.9
        label, score = TemporalClassifier().classify(track)
        assert label == "drone" and score > 0.5

    def test_weaving_flight_scores_as_bird(self):
        # trajetória ondulada (batida de asa), aparência ambígua
        frames = []
        for i in range(40):
            x = 100 + 5 * i
            y = 200 + 8 * np.sin(i / 2.0)
            frames.append([det(x, y, x + 15, y + 15, conf=0.55, cls_name="bird")])
        track = self._run_track(frames)
        assert track is not None
        feats = extract_features(track)
        assert feats.mean_curvature > 0.1
        assert feats.hover_ratio == 0.0
        label, _ = TemporalClassifier().classify(track)
        assert label == "bird"


class TestAlertManager:
    def _confirmed_track(self, n_frames=10):
        tracker = ByteIoUTracker(min_hits=3)
        for i, dets in enumerate(moving_target_frames(n_frames)):
            tracks = tracker.update(dets, i)
        return tracks

    def test_confirmation_rule(self, tmp_path):
        alerts = AlertManager(min_track_frames=8, min_mean_conf=0.35,
                              log_path=str(tmp_path / "alerts.jsonl"))
        tracker = ByteIoUTracker(min_hits=3)
        events_seen = []
        alerts.on_alert(events_seen.append)

        for i, dets in enumerate(moving_target_frames(12)):
            tracks = tracker.update(dets, i)
            cls = {t.track_id: ("drone", 0.9) for t in tracks}
            alerts.process(tracks, cls, i)

        confirmed = [e for e in events_seen if e.event == "CONFIRMED"]
        assert len(confirmed) == 1
        assert confirmed[0].frame_index >= 7  # só após min_track_frames
        alerts.close()
        assert (tmp_path / "alerts.jsonl").read_text().count("CONFIRMED") == 1

    def test_bird_does_not_alert(self):
        alerts = AlertManager(min_track_frames=3, min_mean_conf=0.1)
        tracks = self._confirmed_track()
        cls = {t.track_id: ("bird", 0.2) for t in tracks}
        assert alerts.process(tracks, cls, 99) == []

    def test_lost_event_when_track_disappears(self):
        alerts = AlertManager(min_track_frames=3, min_mean_conf=0.1)
        tracks = self._confirmed_track()
        cls = {t.track_id: ("drone", 0.9) for t in tracks}
        alerts.process(tracks, cls, 10)
        events = alerts.process([], {}, 11)
        assert [e.event for e in events] == ["LOST"]
