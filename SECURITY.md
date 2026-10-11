# Segurança e transparência

O F2WSTREAMS existe para ser **verificável**. Este documento diz o que o app faz, o que ele não faz, como conferir e como reportar um problema.

## O que o app NÃO faz

- ❌ **Não lê nem guarda senha.** O login é feito na página oficial da Twitch/Kick, numa janela sem nenhum script injetado pelo app.
- ❌ **Não envia dados para servidor nenhum.** Não há telemetria, relatório de erros nem atualização automática. O código do app não faz requisições próprias.
- ❌ **Não acessa a conta do jogo.** Ele nem fala com o Poke Idle World; o jogo te encontra pelo chat da live.
- ❌ **Não executa código remoto.** Não há `eval`, `new Function`, `child_process`, download de scripts nem código ofuscado.
- ❌ **Não acessa câmera, microfone, localização ou notificações** (bloqueados).
- ❌ **Não navega para fora da Twitch/Kick** dentro do app. Links externos abrem no seu navegador.

## O que o app faz (e que merece transparência)

1. **Lê uma pequena parte dos cookies da sessão**, só dentro do seu PC e só para mostrar quem está logado: o cookie `login` da Twitch (o nome de usuário) e, na Kick, apenas **se existe** um cookie de sessão (sim/não). Nada disso sai do computador. Está em `main.js`, função `checkLogin`.
2. **Remove "Electron" do User-Agent.** A Twitch costuma recusar o login em navegadores que se identificam como Electron. O User-Agent passa a ser o do Chromium real. Isso não esconde nada de você; apenas permite o login.
3. **Grava preferências no armazenamento dos players** (`webview-preload.js`): qualidade, volume, tema escuro do chat e `mature=true`, que **pula o aviso de conteúdo adulto** da Twitch. Se isso não for adequado para você, remova essa linha do arquivo.
4. **Mantém a sessão logada** num perfil local do Electron (como um navegador). **Opções → Sair das contas** apaga tudo.
5. **Grava um `config.json` local** com canais, disposição, qualidade, volume, largura do chat, recarga automática e posição da janela.
6. **Na primeira execução**, o `iniciar` instala as dependências pelo `npm` e baixa o Electron oficial (registro do npm e releases do Electron no GitHub). É o único momento em que o app precisa de internet além das lives.

## Como o app se protege

- Os `<webview>` rodam **sem Node.js** e com **isolamento de contexto**.
- A janela do app só enxerga **9 funções específicas** (`preload.js`), sem acesso genérico ao sistema.
- Só endereços da **Twitch, Kick e suas CDNs** abrem dentro dos quadros; qualquer outra navegação é bloqueada e vai para o navegador padrão.
- As entradas do usuário (nome de canal, opções) são **validadas** antes de virar URL ou configuração.
- A única dependência direta é o **Electron** (`package.json`), com versões e hashes de integridade travados no `package-lock.json`.
- Não existe `.exe` do app: roda o Electron oficial executando arquivos de texto legíveis.

## Auditoria

| | |
|---|---|
| **Data** | 11/10/2026 |
| **Quem** | Revisão assistida por IA (Claude, da Anthropic) |
| **Como** | Leitura de todos os arquivos + busca automática por padrões de risco (rede, execução dinâmica, ofuscação, cookies, armazenamento) |
| **Resultado** | Nenhuma conexão de rede, execução remota ou envio de dados feitos pelo código do app. Comportamentos listados na seção "O que o app faz". |
  | **Dependências** | `npm audit` em 11/10/2026: 0 vulnerabilidades |
  | **Não coberto** | Revisão por IA é triagem e **não substitui** revisão humana. |
| **Revisão da comunidade** | [pendente / nome de quem revisou] |

### Hashes SHA-256 dos arquivos auditados

Compare com os seus. Se mudar qualquer arquivo, este quadro deve ser atualizado.

```
b093388a6135f33dba10f4cefacbd6fe98d5bfef14607037bede4ff4a77756f4  main.js
fbb0c74f4adaf0eaf5dccbf9f501a13e131eb2bbfd80f0966ad87d6968497511  preload.js
b6971b3fe0e1fd7c467931a6a40aa4220de50b43d22d63858abde354254037cc  webview-preload.js
f655274cc115200d45d639a938768b115316bc4b0c9409d3f216da36742ec1a8  index.html
3ded21a6ff521a8f22e4016c8ea14db8f71d485a4dbccab2c607d5067c6229e3  package.json
3a93c89aa1ef451fedb445d30fdf388d05f3d1a09545c54ba26f309af3fc772b  package-lock.json
2baa1b87ada906e2a74b57a10d53f118bf73a069c941b16da91148d6e0e88586  iniciar.bat
6fafcd0cc6d191e4a974b07e0e486ddf0f52c3efc03c96be525dffa851255149  iniciar.sh
```

Para calcular no Windows: `Get-FileHash .\main.js -Algorithm SHA256`

## Como verificar por conta própria

1. **Hash do download** contra o publicado na Release (veja o [README](README.md#como-verificar-o-que-você-baixou)).
2. **VirusTotal** com o `.zip` da Release.
3. **Leia o código**: `main.js`, `preload.js`, `webview-preload.js` e `index.html`.
4. **Observe as conexões** do `electron.exe` com o TCPView (Sysinternals) ou o Monitor de Recursos.
5. **Teste isolado:** rode no **Windows Sandbox** ou numa máquina virtual antes de usar na sua máquina principal.

## Boas práticas para quem usa

- Ative a **verificação em duas etapas** na Twitch e na Kick.
- **Nunca** baixe o app de outro lugar que não seja a aba **Releases** deste repositório.
- Desconfie de qualquer "versão atualizada" enviada por mensagem privada.
- Ninguém da guild vai pedir sua senha, token ou dados da conta do jogo.

## Como reportar um problema de segurança

- Aqui no GitHub: aba **Security → Report a vulnerability** (relato privado).
- Ou no Discord da guild, canal de suporte, ou direto para um dos administradores.

Pedimos que você **não divulgue publicamente** antes de a gente ter tido chance de corrigir. Todo relato será respondido.
