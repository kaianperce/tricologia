## Problema
Na tela do prontuário do cliente, a barra de abas (Visão geral, Anamnese, Tricoscopia, Fotos, Plano, Sessões, Relatórios, Termos) usa `flex-wrap`, o que impede scroll horizontal. Em telas estreitas / com o container do preview, as abas finais (Plano, Sessões, Relatórios, Termos) ficam inacessíveis — não dá pra arrastar lateralmente nem clicar.

## Correção
Arquivo: `src/routes/_authenticated/app/clientes/$id.tsx` (linha 82)

Trocar a `TabsList` para um contêiner de rolagem horizontal real em mobile/tablet, mantendo layout confortável no desktop:

- Remover `flex-wrap` (é ele que quebra o scroll horizontal).
- Envolver a `TabsList` num wrapper `overflow-x-auto` com `-mx-6 px-6` para permitir arrasto até a borda, `scrollbar-thin` e `snap-x` para uma sensação suave no toque.
- Aplicar `whitespace-nowrap` nos `TabsTrigger` e `shrink-0` para não comprimirem.
- Adicionar um pequeno gradiente à direita (mask) como dica visual de "há mais abas" em telas pequenas.
- Auto-scroll da aba ativa para o centro quando `tab` muda, usando `ref` + `scrollIntoView({ inline: 'center' })`, para que ao abrir com `#anamnese` ou trocar de aba a aba selecionada fique visível.

Nenhuma outra alteração de comportamento — só apresentação/navegação das abas.

## Verificação
- Redimensionar para ~375px, 768px e 1280px: todas as 8 abas devem ser alcançáveis via arrasto/scroll horizontal e clicáveis.
- Navegar com hash (`#relatorios`, `#termos`): aba entra em foco e rola até ficar visível.