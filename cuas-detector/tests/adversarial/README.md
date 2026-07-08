# Bateria adversarial (Estágio D)

Casos que quebram o sistema, um diretório por caso. Cada caso é um conjunto de
vídeos + gabarito (quantos drones, quando aparecem) e roda pelo pipeline com
log JSONL, comparando alertas emitidos contra o gabarito.

Casos a cobrir (gravar na coleta de dados própria, Fase 2):

- `birds/` — pássaros isolados e em bando, sem drone (mede FP/hora)
- `backlight/` — alvo em contraluz
- `dusk/` — entardecer / baixa luz
- `clouds/` — céu com nuvens em movimento (fundo dinâmico)
- `multi_target/` — 2+ drones simultâneos (mede fragmentação de track ID)
- `swarm/` — enxame
- `range/` — drone se afastando a distância crescente (curva de alcance)

Métricas por caso: falsos positivos/hora, recall de alerta, fragmentação de
IDs, latência até o primeiro alerta CONFIRMED.
