"""Captura de vídeo: RTSP, USB ou arquivo, com buffer circular em thread.

Para fontes ao vivo (RTSP/USB) a leitura roda numa thread própria e o buffer
descarta o frame mais antigo quando cheio (drop-oldest): o pipeline sempre
processa o frame mais recente possível em vez de acumular atraso. Para
arquivos, a leitura é síncrona — cada frame importa em avaliação offline.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class Frame:
    image: np.ndarray
    index: int
    timestamp: float  # time.monotonic() na captura


def _is_live_source(source: str) -> bool:
    return source.isdigit() or source.lower().startswith(("rtsp://", "rtmp://", "http://", "https://"))


class VideoSource:
    """Itera Frames de uma fonte de vídeo. Uso: ``for frame in VideoSource(src):``"""

    def __init__(self, source: str, buffer_size: int = 4):
        self.source = source
        self.live = _is_live_source(source)
        cap_source = int(source) if source.isdigit() else source
        self.cap = cv2.VideoCapture(cap_source)
        if not self.cap.isOpened():
            raise IOError(f"não foi possível abrir a fonte de vídeo: {source!r}")

        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        self._index = 0
        self._buffer: deque[Frame] = deque(maxlen=buffer_size)
        self._lock = threading.Lock()
        self._stopped = False
        self._thread: threading.Thread | None = None
        if self.live:
            self._thread = threading.Thread(target=self._reader, daemon=True)
            self._thread.start()

    def _reader(self) -> None:
        while not self._stopped:
            ok, image = self.cap.read()
            if not ok:
                self._stopped = True
                break
            frame = Frame(image=image, index=self._index, timestamp=time.monotonic())
            self._index += 1
            with self._lock:
                self._buffer.append(frame)  # deque(maxlen) descarta o mais antigo

    def _read_live(self) -> Frame | None:
        while True:
            with self._lock:
                if self._buffer:
                    return self._buffer.popleft()
            if self._stopped:
                return None
            time.sleep(0.002)

    def _read_file(self) -> Frame | None:
        ok, image = self.cap.read()
        if not ok:
            return None
        frame = Frame(image=image, index=self._index, timestamp=time.monotonic())
        self._index += 1
        return frame

    def __iter__(self):
        return self

    def __next__(self) -> Frame:
        frame = self._read_live() if self.live else self._read_file()
        if frame is None:
            raise StopIteration
        return frame

    def release(self) -> None:
        self._stopped = True
        if self._thread is not None:
            self._thread.join(timeout=1.0)
        self.cap.release()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.release()
