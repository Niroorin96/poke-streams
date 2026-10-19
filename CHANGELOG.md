# Changelog

Todas as mudanças importantes do F2WSTREAMS ficam registradas aqui.
Cada versão publicada na aba **Releases** traz o SHA-256 do `.zip`.

## [Não lançado]

- Disposição **Auto**: cada quadro em 16:9, o maior possível, sem tarjas pretas
- **Lives guardadas**: toda live aberta entra numa lista com favoritos, status (ao vivo/offline) e botão **Usar**; cada quadro ganha um menu ▾ para trocar entre elas
- Checagem do status das lives guardadas por um quadro oculto (sem login, sem som), quando algum quadro cai ou com a lista aberta; pode ser desligada em Opções
- **Selo vermelho** na barra de tarefas (e janela piscando) quando uma live fica offline
- **Manter o PC acordado** (Opções, ligado por padrão); a tela ainda pode apagar
- Corrigido: expandir um quadro individual só funcionava no quadro do meio
- Corrigido: nome e status dos quadros de baixo ficavam escondidos pelo quadro do meio na disposição Centro
- Removido o botão de tela cheia ao lado de Opções (o **F11** continua funcionando)
- O `preload.js` passa a expor 13 funções (eram 9)

## [2.0.0] - [11/10/2026]

Primeira versão pública.

- Até 5 quadros, cada um com player e chat na mesma sessão
- Suporte a **Twitch** e **Kick**, com troca de plataforma por quadro
- Login em janela separada (página oficial), com botão para sair das contas
- Disposições: Centro (4 em grade + 1 flutuando), 3 + 2 e 2 + 3
- Status de cada quadro (Ao vivo / Offline / Carregando) e cálculo do bônus no topo
- Qualidade, volume inicial, largura do chat e recarga automática ajustáveis
- Recarga automática de quadros que travam
- Sem atualização automática e sem telemetria
