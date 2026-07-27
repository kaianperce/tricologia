# Produto 2 — Texto Integrador de Alinhamento Curricular (Rede SESI)

Projeto de apoio à elaboração do **Produto 2** do contrato SESI DN (SC 228195):
*Documento técnico-pedagógico demonstrando a integração prática dos novos escopos da
Política Nacional de Iniciação Científica às matrizes curriculares da Rede Educacional SESI.*

**Recorte do trabalho:** diagnóstico, alinhamento e recomendações curriculares — dizer
**o que** incluir nas matrizes (educação científica, ciências, engenharia, matemática),
não **como** implementar. Fora de escopo: planos de aula, sequências didáticas, materiais
instrucionais e formação docente.

## Estrutura do projeto

| Pasta | Conteúdo |
|---|---|
| `00-fontes/` | Checklist de documentos a solicitar ao SESI DN e fontes normativas públicas |
| `01-metodologia/` | Método de análise em 5 passos + referencial compacto da BNCC por etapa |
| `02-matrizes/` | Templates da matriz de correspondência (coração do produto), um CSV por etapa |
| `03-produto/` | Esqueleto comentado do documento final (sumário + orientação de escrita por seção) |
| `04-gestao/` | Cronograma de 4 meses com marcos e delimitação de escopo para proposta |
| `instrucoes-claude-project.md` | Texto pronto para colar nas instruções de um Projeto do Claude |

## Como usar com o Claude

1. Crie um Projeto no claude.ai (ou use este repositório como contexto no Claude Code).
2. Cole o conteúdo de `instrucoes-claude-project.md` nas instruções do Projeto.
3. Suba como conhecimento do Projeto: a Política Nacional de IC (2025), as matrizes
   curriculares SESI (quando recebidas) e os arquivos deste repositório.
4. Trabalhe etapa por etapa: peça ao Claude para preencher a matriz de correspondência
   de uma etapa por vez, usando os CSVs de `02-matrizes/` como formato.

## Fluxo de trabalho

```
Fontes (00) → Método (01) → Matrizes preenchidas (02) → Documento final (03)
                                      ↑
                         Cronograma e escopo (04) governam tudo
```

O produto final que o SESI DN atesta é o documento de `03-produto/`; as matrizes de
`02-matrizes/` entram nele como núcleo técnico e evidência objetiva de entrega.
