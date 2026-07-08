# Splits fixos

Um arquivo por split (`train.txt`, `val.txt`, `test.txt`), cada linha um caminho
de imagem relativo à raiz do dataset. Gerados uma vez, versionados aqui, nunca
regenerados silenciosamente — o conjunto de teste é imutável.

Split por sequência de vídeo (não por frame) para evitar vazamento.
