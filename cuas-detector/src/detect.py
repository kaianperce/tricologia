"""Detector: wrapper YOLO (Ultralytics) com modo SAHI opcional para alvo pequeno.

Dois caminhos de inferência:
- direto: uma passada do YOLO no frame inteiro (rápido; use imgsz alto).
- SAHI:   frame fatiado em tiles com sobreposição, inferência por tile,
          boxes recompostas. Ganho grande de recall em alvos de poucos
          pixels, custo em latência.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class Detection:
    xyxy: np.ndarray  # [x1, y1, x2, y2] em pixels do frame original
    conf: float
    cls_id: int
    cls_name: str


class Detector:
    def __init__(
        self,
        weights: str,
        imgsz: int = 1280,
        conf: float = 0.25,
        iou: float = 0.45,
        device: str | None = None,
        sahi: bool = False,
        tile_size: int = 640,
        tile_overlap: float = 0.2,
    ):
        from ultralytics import YOLO  # import adiado: permite usar Detection sem ultralytics

        self.weights = weights
        self.imgsz = imgsz
        self.conf = conf
        self.iou = iou
        self.device = device
        self.sahi = sahi

        self.model = YOLO(weights)
        self.names: dict[int, str] = self.model.names

        self._sahi_model = None
        if sahi:
            # import adiado: sahi é dependência opcional
            from sahi import AutoDetectionModel
            from sahi.predict import get_sliced_prediction

            self._get_sliced_prediction = get_sliced_prediction
            self._sahi_model = AutoDetectionModel.from_pretrained(
                model_type="ultralytics",
                model_path=weights,
                confidence_threshold=conf,
                device=device or None,
            )
            self.tile_size = tile_size
            self.tile_overlap = tile_overlap

    def __call__(self, image: np.ndarray) -> list[Detection]:
        return self._detect_sahi(image) if self.sahi else self._detect_direct(image)

    def _detect_direct(self, image: np.ndarray) -> list[Detection]:
        result = self.model.predict(
            image,
            imgsz=self.imgsz,
            conf=self.conf,
            iou=self.iou,
            device=self.device,
            verbose=False,
        )[0]
        detections = []
        for box in result.boxes:
            cls_id = int(box.cls.item())
            detections.append(
                Detection(
                    xyxy=box.xyxy[0].cpu().numpy(),
                    conf=float(box.conf.item()),
                    cls_id=cls_id,
                    cls_name=self.names.get(cls_id, str(cls_id)),
                )
            )
        return detections

    def _detect_sahi(self, image: np.ndarray) -> list[Detection]:
        result = self._get_sliced_prediction(
            image,
            self._sahi_model,
            slice_height=self.tile_size,
            slice_width=self.tile_size,
            overlap_height_ratio=self.tile_overlap,
            overlap_width_ratio=self.tile_overlap,
            verbose=0,
        )
        detections = []
        for pred in result.object_prediction_list:
            x1, y1, x2, y2 = pred.bbox.to_xyxy()
            detections.append(
                Detection(
                    xyxy=np.array([x1, y1, x2, y2], dtype=np.float32),
                    conf=float(pred.score.value),
                    cls_id=int(pred.category.id),
                    cls_name=pred.category.name,
                )
            )
        return detections
