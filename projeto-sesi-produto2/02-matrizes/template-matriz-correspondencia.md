# Matriz de correspondência — instruções de preenchimento

Um CSV por etapa. Cada linha = um cruzamento entre uma referência da BNCC, o que a
matriz SESI já prevê e o que a Política de IC exige. As linhas de exemplo nos CSVs
mostram o padrão de escrita e devem ser substituídas pelo levantamento real.

## Colunas

| Coluna | Preenchimento |
|---|---|
| `etapa_ano` | Ex.: `EI-03 (4-5a)`, `EF-2º ano`, `EM-1ª série`, `EJA-EF-AF` |
| `eixo` | `ciencias` / `matematica` / `engenharia-tecnologia` / `transversal-ic` |
| `ref_bncc` | Código ou nome (ex.: `EF02CI04`, `Campo: Espaços, tempos...`, `CNT competência 3`) |
| `bncc_resumo` | Resumo de 1 linha do que a BNCC prevê |
| `matriz_sesi` | O que a matriz SESI já contém no ponto correspondente (`—` se nada) |
| `exigencia_ic` | Código da exigência da Política de IC (lista do Passo 2 da metodologia) |
| `situacao` | `contemplado` / `parcial` / `lacuna` |
| `recomendacao` | **O quê** incluir na matriz (item curricular), vazio se contemplado |
| `prioridade` | `alta` / `media` / `baixa` |
| `fonte` | Documento e página/seção que justificam a recomendação |

## Regras

1. `recomendacao` descreve item de currículo (objetivo, habilidade, eixo, descritor) —
   nunca metodologia, atividade ou plano de aula.
2. Toda `lacuna` e todo `parcial` exigem `recomendacao` e `fonte` preenchidas.
3. Prioridade `alta` = exigido pela Política de IC ou pela BNCC e ausente na matriz;
   `media` = parcial ou exigência institucional SESI; `baixa` = oportunidade de melhoria.
4. Ao final de cada etapa, criar as linhas de **transição** (eixo `transversal-ic`)
   verificando a ponte com a etapa seguinte.

## Arquivos

- `matriz-educacao-infantil.csv`
- `matriz-fundamental-anos-iniciais.csv`
- `matriz-fundamental-anos-finais.csv`
- `matriz-ensino-medio.csv`
- `matriz-eja.csv`
