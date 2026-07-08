# cuas-detector — Detecção de Drones por Visão Computacional

Camada de **percepção** de um sistema C-UAS: recebe vídeo (EO/IR) e responde, em
tempo real, *"há um drone no campo de visão? onde? é drone ou pássaro?"*.

A saída é **detecção + rastreamento + classificação + alerta** (bbox, track ID,
trajetória, confiança) via log estruturado e callbacks.

## Escopo e limites

Este sistema **não inclui e não incluirá** mecanismo de disparo, controle de
gatilho, atuador, fire control ou integração a efetuadores (jammer, arma etc.).
Ele é a camada de percepção — dual-use por natureza (vigilância de perímetro,
proteção de infraestrutura, aeroportos, eventos) — projetada para **informar a
decisão de um operador humano, não substituí-la**.

## Arquitetura

```
[Câmera EO/IR] → [Ingest] → [Detector] → [Tracker] → [Classificador temporal] → [Alerta/Saída]
                    │           │            │                │                       │
                 buffer      YOLO +       ByteTrack        drone vs pássaro       log JSONL +
                 de frames    SAHI                         (movimento)            callbacks
```

- **Ingest** (`src/ingest.py`) — captura RTSP/USB/arquivo, leitura em thread,
  buffer circular com política drop-oldest para tempo real.
- **Detector** (`src/detect.py`) — YOLOv11 (Ultralytics); modo SAHI (inferência
  em tiles) para alvos pequenos/distantes.
- **Tracker** (`src/track.py`) — ByteTrack (nativo Ultralytics) no modo rápido;
  tracker IoU próprio no modo SAHI. IDs persistentes + histórico de trajetória.
- **Classificador temporal** (`src/classify_temporal.py`) — features de
  trajetória (velocidade, curvatura, hover) para discriminar drone × pássaro.
- **Alerta** (`src/alert.py`) — regra de confirmação (track vivo por N frames
  com confiança média ≥ limiar), log JSONL para after-action review.
- **Pipeline** (`src/pipeline.py`) — orquestra os estágios, CLI.

## Quickstart

```bash
pip install -r requirements.txt

# Fase 0 — baseline: YOLO pré-treinado (COCO não tem classe "drone";
# use pesos fine-tunados ou um dataset público para o primeiro treino)
python -m src.pipeline --source video.mp4 --weights yolo11n.pt --show

# Pipeline completo com SAHI (alvo pequeno) e gravação anotada
python -m src.pipeline --source rtsp://... --weights runs/detect/train/weights/best.pt \
    --sahi --tile-size 640 --save out.mp4 --log alerts.jsonl

# Treino (Fase 1) — edite configs/train.yaml antes
python train/train.py --config configs/train.yaml

# Avaliação: mAP + latência + recall por tamanho de alvo
python train/evaluate.py --weights runs/detect/train/weights/best.pt --data data/dataset.yaml
```

## Estrutura

```
cuas-detector/
├── configs/            # model.yaml (inferência), train.yaml (treino)
├── data/               # datasets.md (links/licenças), splits/ (fixos)
├── src/                # pipeline de inferência
├── train/              # train.py, evaluate.py
├── tests/adversarial/  # baterias do Estágio D
└── deploy/             # export TensorRT/ONNX, scripts Jetson
```

## Status das fases

- [x] Fase 0 — pipeline ponta-a-ponta (vídeo entra, bbox + track sai)
- [x] Fase 1 — treino/fine-tune, SAHI, ByteTrack, avaliação com mAP + latência
- [ ] Fase 2 — classificador temporal treinado com dados próprios (heurística
      inicial já implementada em `classify_temporal.py`)
- [ ] Fase 3 — export TensorRT + deploy Jetson (script de export pronto)
- [ ] Fase 4 — fusão acústico/radar, térmico, enxame

## Legal

Voos de coleta de dados seguem as regras da ANAC (cadastro, altura, área).
Datasets públicos: ver `data/datasets.md` para links e licenças.
