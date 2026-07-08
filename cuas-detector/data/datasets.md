# Datasets públicos

Ponto de partida para as Fases 0–1. Verifique a licença de cada um antes de
uso comercial.

| Dataset | O que tem | Link |
|---|---|---|
| Drone-vs-Bird Detection Challenge | Desenhado exatamente para a discriminação drone × pássaro | https://wosdetc2023.wordpress.com/ (edições anuais do workshop WOSDETC) |
| Anti-UAV / Anti-UAV410 | Sequências RGB + térmico; bom para tracking e teste noturno | https://github.com/ZhaoJ9014/Anti-UAV |
| DUT Anti-UAV | Detecção + tracking de UAV | https://github.com/wangdongdut/DUT-Anti-UAV |
| Det-Fly | Drone visto de outro drone (ar-ar) | https://github.com/Jake-WU/Det-Fly |
| MAV-VID | Vídeos de MAVs anotados | https://bitbucket.org/alejodosr/mav-vid-dataset |
| Roboflow Universe | Dezenas de datasets de drone já anotados, export em formato YOLO | https://universe.roboflow.com/search?q=drone |

## Formato esperado

`train/train.py` espera um `data/dataset.yaml` no formato Ultralytics:

```yaml
path: /caminho/para/dataset
train: images/train
val: images/val
test: images/test
names:
  0: drone
  1: bird
```

## Regras de split

- Split **rígido**: nada do teste vaza para treino/val. Definições fixas em
  `data/splits/` (um arquivo .txt por split, listando os frames).
- Split por **sequência de vídeo**, nunca por frame — frames vizinhos do mesmo
  vídeo em splits diferentes é vazamento.

## Dados próprios (Fase 2)

- Voar drone comum (ex.: DJI Mini) em campo aberto, seguindo regras da ANAC.
- Gravar deliberadamente os casos que quebram o modelo: pássaros, contraluz,
  entardecer, nuvens, múltiplos alvos, distância crescente.
- Anotar em Roboflow/CVAT com classes `drone` e `bird` explícitas.
- Registrar metadados por gravação: distância estimada, condição de luz, fundo
  (permite segmentar métricas depois).
