# POKESTREAMS

**Até 5 lives (Twitch e Kick) em uma janela só, para o bônus de lives do Poke Idle World.**

Ferramenta da guild **FREE TO WIN [F2W]**, com o código aberto para qualquer pessoa conferir.

> ⚠️ Projeto independente, sem ligação com o Poke Idle World, a Twitch ou a Kick. Use por sua conta e risco.

---

## O que é

O jogo dá **+15%** de XP Treinador e XP Pokémon por assistir **1 live oficial**, e **+2,5%** por live a mais, até 5 (máximo **+25%**). Ele te encontra **pelo chat da live**, com você **logado** na plataforma.

O POKESTREAMS só **organiza isso**: abre as lives em grade, mantém os chats conectados e mostra quais estão no ar. Ele **não automatiza** a Twitch, a Kick nem o jogo.

## Instalação

**Você precisa de:** Windows, macOS ou Linux · **Node.js 22.12 ou mais novo** (versão LTS) · internet na primeira vez.

### Windows

1. Instale o **Node.js LTS** em <https://nodejs.org> (pode deixar as opções padrão).
2. Baixe o arquivo `pokestreams-v2.0.0.zip` na aba **[Releases](../../releases)** deste repositório.
3. *(Recomendado)* Confira o hash do arquivo, veja [Como verificar](#como-verificar-o-que-você-baixou).
4. Extraia numa pasta só dele (por exemplo `Documentos\pokestreams-v2.0.0`). Se tinha uma versão antiga, **apague a pasta velha antes**.
5. Dê dois cliques em **`iniciar.bat`**. Na primeira vez ele instala o necessário (alguns minutos) e abre sozinho. Nas próximas, abre direto.

### macOS / Linux

1. Instale o Node.js LTS.
2. Baixe e extraia o `.zip` da aba Releases.
3. No terminal, dentro da pasta, rode: `bash iniciar.sh`

### Sobre antivírus e avisos do Windows

Não existe um `.exe` do POKESTREAMS. O que roda é o **Electron oficial** (baixado na primeira vez que você abre o app) executando os **arquivos de texto** desta pasta, que você pode abrir e ler. Se algum antivírus reclamar, confira os detalhes antes de ignorar o aviso, e veja a seção de verificação abaixo.

## Primeiro uso

1. Clique em **Entrar na Twitch** e entre com a **mesma conta vinculada ao jogo**. A janela é a página oficial da Twitch e fecha sozinha quando você entra. Uma vez basta.
2. *(Opcional)* Clique em **Entrar na Kick**. Abre o site da Kick: clique em **Entrar**, faça o login e, depois, **feche a janela**.
3. Em cada quadro, escolha **Twitch** ou **Kick**, digite o **nome do canal** (ou cole o link) e clique em **Abrir live**. Para trocar depois, clique no nome do canal no topo do quadro.
4. Arraste a janela para o monitor que quiser e aperte **F11** para tela cheia. A posição fica salva.
5. No jogo, abra a tela de bônus de lives e espere alguns minutos pela conferência.

## A tela

- **Disposição** (botões ao lado de "Opções"):
  - **Centro** (padrão): 4 lives em grade 2×2 e o **quadro 1 flutuando no meio**.
  - **3 + 2** e **2 + 3**.
  - Com menos quadros ligados, a grade se ajusta sozinha.
- **Barra de cada quadro:** status (Ao vivo / Offline / Carregando), trocar canal e plataforma, mostrar o chat, recarregar, expandir (duplo clique; **Esc** volta) e desligar o quadro.
- **Bônus no topo:** conta só os quadros que estão **ao vivo**.
- **Opções:** ligar/desligar quadros, qualidade (160p por padrão), volume inicial (5%), largura do chat, recarga automática e **Sair das contas**.

## Para o bônus contar

- **O chat de cada live fica sempre carregado e conectado**, mesmo oculto. O botão de chat só mostra ou esconde.
- **Não fica mudo:** começa com volume baixo (5%).
- O player nunca fica menor que 400 px de largura.
- Só valem os **canais oficiais** que aparecem no bônus do jogo.
- Use **só a sua conta**. Várias contas para inflar audiência é viewbot e pode dar ban na plataforma.
- Pode desligar a tela, mas não deixe o PC entrar em suspensão.

## Privacidade e segurança (resumo)

- **A senha é digitada só na página oficial** da Twitch/Kick. O app não injeta nada nessa janela e não lê nem guarda senha.
- **O app não envia dados para nenhum servidor**: não tem telemetria, não tem atualização automática e o código dele não faz nenhuma requisição própria. Só as páginas oficiais da Twitch e da Kick carregam dentro dos quadros.
- **O que fica no seu PC:** um `config.json` (canais, disposição, qualidade, volume, posição da janela) e a sessão da Twitch/Kick, como num navegador.
- Links fora da Twitch/Kick abrem no seu navegador. Câmera, microfone, localização e notificações ficam bloqueados.
- **Opções → Sair das contas** apaga a sessão do app.

Os detalhes, o que o app faz de "diferente" e os hashes dos arquivos auditados estão em **[SECURITY.md](SECURITY.md)**.

## Como verificar o que você baixou

Cada versão publicada traz o **SHA-256** do `.zip` na descrição da Release. Compare com o do seu arquivo:

```powershell
# Windows (PowerShell)
Get-FileHash .\pokestreams-v2.0.0.zip -Algorithm SHA256
```
```bash
# Linux
sha256sum pokestreams-v2.0.0.zip
# macOS
shasum -a 256 pokestreams-v2.0.0.zip
```

Se o hash for **diferente**, não abra o arquivo.

Outras formas de conferir:

- **VirusTotal:** envie o `.zip` em <https://www.virustotal.com>. Alguns antivírus podem dar alerta genérico em qualquer app feito com Electron; o importante é entender o motivo do alerta.
- **Ler o código:** são só 4 arquivos de código (`main.js`, `preload.js`, `webview-preload.js` e `index.html`).
- **Ver as conexões:** abra o *TCPView* (Sysinternals) ou o Monitor de Recursos do Windows e confira que o `electron.exe` só conversa com domínios da Twitch e da Kick (e as CDNs deles).

## Atualizações

Não há atualização automática. **Toda versão nova** é anunciada no Discord da guild e vem com changelog ([CHANGELOG.md](CHANGELOG.md)) e hash. Se alguém te mandar um "update" por outro caminho, **não instale**.

## Problemas comuns

| Problema | O que fazer |
|---|---|
| "Node.js não encontrado" | Instale o Node.js LTS, feche a janela e rode o `iniciar` de novo. |
| "Falha ao instalar" | Confira a internet e se o Node é 22.12 ou mais novo (`node -v`). Apague a pasta `node_modules` e tente de novo. |
| A Twitch não deixa entrar | Use o botão **Entrar na Twitch** do app (não o login dentro do quadro) e conclua o login na janela que abrir. |
| A Kick pede login de novo | Clique em **Entrar na Kick**, faça login e feche a janela. |
| Aparece "Ao vivo", mas o bônus não conta | Confira: canal **oficial**, conta **igual à do jogo**, chat **conectado** (não feche o quadro) e espere alguns minutos. |
| Quadro preto ou travado | Clique em **Atualizar tudo**. O app também recarrega sozinho quadros que travam. |
| Quero desinstalar | Apague a pasta do app. Os dados ficam na pasta de dados do Electron (normalmente `%APPDATA%\pokestreams` no Windows). |

## Para desenvolvedores

```bash
git clone https://github.com/Niroorin96/poke-streams.git
cd poke-streams
npm ci        # instala exatamente as versões do package-lock.json
npm start
```

| Arquivo | Função |
|---|---|
| `main.js` | Processo principal: janela, login, sessão, permissões, configuração |
| `preload.js` | Ponte segura entre a janela e o `main.js` (só expõe funções específicas) |
| `webview-preload.js` | Roda dentro dos players/chats: ajusta qualidade/volume/tema e informa se a live está no ar |
| `index.html` | Interface (grade, barra, opções) |

Cada quadro tem dois `<webview>` na mesma sessão (`persist:twitch`): o player e o chat. Pull requests são bem-vindos e passam por revisão antes de entrar.

## Créditos e licença

Inspirado no [PokeGrid](https://github.com/soufoka/PokeGrid-source). Licença **MIT**, veja [LICENSE](LICENSE).

Dúvidas e sugestões: Discord da guild **FREE TO WIN** · ([Entrar no Discord](https://discord.gg/ryhuqdzW8))
