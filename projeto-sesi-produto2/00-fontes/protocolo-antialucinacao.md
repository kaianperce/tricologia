# Protocolo antialucinação — regras de verificação de fontes

Este projeto usa IA como apoio de análise e redação. Para o produto final ser defensável
perante a fiscalização do SESI DN, **nenhuma citação normativa entra no documento sem
verificação contra a fonte primária**. Regras:

## 1. Hierarquia de confiança das fontes

| Nível | Fonte | Uso permitido |
|---|---|---|
| 1 | PDF oficial da BNCC (basenacionalcomum.mec.gov.br), resoluções/pareceres CNE no site do MEC, leis no Planalto | Única base válida para citação no documento final |
| 2 | Documentos internos SESI (Política de IC, matrizes) recebidos do contratante | Base válida para o cruzamento — citar versão e data do arquivo recebido |
| 3 | Portais educacionais (Nova Escola, ClassLine, Profez etc.) | Apenas para localizar rapidamente um código; nunca como fonte citada |
| 4 | Texto gerado por IA sem fonte anexada | Rascunho. Não entra no documento sem passar pelos níveis 1–2 |

## 2. Regras operacionais

1. **Toda habilidade BNCC citada** (código + texto) é conferida no PDF oficial antes de
   entrar no documento — texto literal entre aspas, unidade temática/campo e página.
2. **A IA só analisa documentos anexados.** No Projeto do Claude, suba os PDFs oficiais
   e peça análise "com base no documento anexado, citando página"; não pergunte de memória.
3. **Toda afirmação sobre a matriz SESI** transcreve o item real da matriz recebida
   (coluna `matriz_sesi` dos CSVs). Se o documento não foi recebido, a célula fica
   `[aguardando documento]` — nunca preenchida por suposição.
4. **Exigências da Política de IC** (códigos IC-xx) só são criadas a partir do texto real
   da Política de 2025, com seção/página. Os códigos hoje presentes nos CSVs são placeholders.
5. **Linhas de exemplo dos CSVs** estão marcadas com `[exemplo]` ou `[preencher]` e devem
   ser todas substituídas pelo levantamento real antes de qualquer entrega.
6. **Revisão humana linha a linha** antes de cada marco (M1–M4): o consultor confere
   códigos, textos e páginas. A IA acelera; a assinatura é sua.

## 3. Status de verificação dos códigos-exemplo (27/07/2026, fontes públicas nível 3)

Verificados e corrigidos para o texto oficial: EI03ET02, EI03ET07, EF02CI04, EF03CI04,
EF05MA24, EF06CI01, EF07CI11, EF08MA26, EM13CNT301, EM13MAT101.
Pendência: unidade temática do EF07CI11 — confirmar no PDF oficial da BNCC (nível 1)
antes de citar no documento final. Esta verificação usou portais educacionais; a
conferência final deve ser refeita contra o PDF do MEC (regra 1).
