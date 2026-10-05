# Chat Firebase — conversas individuais e em grupo com push

Aplicativo de chat em **React Native + TypeScript (Expo)** com **Firebase** como backend. Usuários autenticados
por **e-mail e senha** trocam mensagens em tempo real, em conversas individuais e em grupos com limite configurável
de integrantes, e recebem **notificações push** conforme uma política definida pelo proprietário de cada grupo.
O envio das notificações é feito por uma **API própria**, publicada na Vercel.

## Integrantes

- RM555573 — Leonardo Correa de Mello
- RM556931 — Felipe Soares Xavier
- RM556630 — Pedro Visconti Guidotte
- RM555701 — Herbert de Sousa Vilela
- RM556476 — Gabriel Ferreira Flora

## Links

| Item | Valor |
|---|---|
| Repositório | <https://github.com/gabrielfe1202/chat-firebase-cp2> (privado: adicione o professor como colaborador ou torne-o público) |
| API publicada | <https://chat-firebase-api.vercel.app> |
| Health check | `GET <URL da API>/health` → `{"status":"ok","timestamp":...}` |

## Tecnologias

| Camada | Tecnologia |
|---|---|
| App | React Native 0.88 (release candidate do SDK 58), **Expo SDK 58**, TypeScript estrito, React Navigation 7 |
| Backend de dados | Firebase Authentication, Realtime Database, Cloud Firestore |
| Push | Firebase Cloud Messaging (Android) e Expo Push Service (iOS), `expo-notifications` |
| API | Node.js 20+, Express 5, TypeScript, Firebase Admin SDK, Zod — hospedada na Vercel |
| Fotos | Cloudinary (upload *unsigned*) — apenas a URL é salva no Firestore |
| Testes | `node:test` + `tsx` (API) |

> O SDK 58 está na tag `next` do npm (o `latest` ainda é o 57) e usa um release candidate do React Native. O
> arquivo `.npmrc` (`legacy-peer-deps=true`) é necessário porque o `async-storage` fixado pelo SDK não aceita o
> peer de React Native em pré-lançamento.

## Responsabilidade de cada serviço

| Serviço | Uso no projeto |
|---|---|
| **Authentication** | Cadastro, login, persistência da sessão (AsyncStorage), identificação por `uid` e logout. Somente e-mail/senha. |
| **Realtime Database** | **Mensagens** (`messages/{conversa}/{id}`), listeners em tempo real e o espelho de acesso (`members/`, `groupMeta/`) usado pelas regras. |
| **Cloud Firestore** | Perfis (`users`, `publicProfiles`), grupos e integrantes (`groups`), limite máximo (`memberLimit`), política de notificações, conversas individuais (`directConversations`) e tokens (`users/{uid}/devices`). |
| **Cloud Messaging** | Entrega dos push, inclusive com o app em segundo plano ou fechado; o payload traz `conversationId` e `conversationType`. |
| **API própria** | Validação do ID token, cálculo dos destinatários, idempotência, envio do push e validações que cruzam os dois bancos. |

### Decisões de estrutura (além da sugerida no enunciado)

- **`publicProfiles/{uid}`** (nome e foto) separado de **`users/{uid}`** (e-mail, celular, nascimento). A lista de
  usuários precisa mostrar todos os cadastrados, mas os dados cadastrais só podem ser vistos por quem compartilha
  conversa ou grupo. Assim o primeiro é legível por qualquer autenticado e o segundo é restrito.
- **Espelho de acesso no Realtime Database.** As regras do RTDB não leem o Firestore. Por isso cada conversa tem
  `members/{conversaId}/{uid}: true`, e cada grupo tem `groupMeta/{grupoId}/ownerId`, que define quem pode alterar
  esses membros. O Firestore continua sendo a fonte da verdade; o espelho é mantido junto com cada alteração, com
  compensação (desfaz a primeira escrita) se a segunda falhar, já que os dois bancos não compartilham transação.
- **Validações que dependem dos dois serviços ficam na API**, como o enunciado orienta: confirmar que a mensagem
  existe no RTDB e que o remetente é o usuário autenticado, e cruzar com participantes/política no Firestore.

## Estrutura do projeto

```text
.
├── App.tsx                     # providers, ErrorBoundary e handler de notificações
├── firebaseConfig.json         # configuração do SDK cliente (sem segredos)
├── firestore.rules             # regras do Cloud Firestore
├── database.rules.json         # regras do Realtime Database
├── firebase.json / .firebaserc / firestore.indexes.json
├── eas.json                    # perfis de build (development, preview)
├── src/
│   ├── components/             # Avatar, ChatMessage, ChatInput, ConversationItem, GroupMemberItem, Loading, ...
│   ├── contexts/AuthContext.tsx
│   ├── hooks/                  # useAuth, useChat, useConversation(s), useGroup, useUsers, useNotifications, ...
│   ├── navigation/RootNavigator.tsx
│   ├── screens/                # Login, Register, Conversations, Users, GroupForm, GroupMembers, Chat, Profile
│   ├── services/               # firebase, auth, user, chat, group, notification, image, apiClient, pushApi, converters
│   ├── types/                  # user, chat, group, notification, navigation
│   └── utils/                  # conversationId, groupValidation, validation, parsers, messageMapper, ...
└── server/                     # API de notificações (Vercel)
    ├── api/index.ts            # entrada serverless
    ├── vercel.json
    └── src/
        ├── app.ts              # rotas, autenticação e tratamento de erros
        ├── middleware/authenticate.ts
        ├── routes/             # notifications, profiles, devices
        └── services/           # firebaseAdmin, recipientResolver, notificationProcessor, notificationSender, firebasePorts
```

## Como executar o aplicativo

Pré-requisitos: Node.js 20+, uma conta Expo (para o build) e um projeto Firebase (abaixo).

```bash
npm install
cp .env.example .env        # preencha EXPO_PUBLIC_API_URL e as variáveis do Cloudinary
npx expo start --dev-client
```

Scripts úteis: `npm run typecheck`, `npm run lint`.

O push **não funciona no Expo Go**. Gere um *development build* (Android):

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

Instale o APK no aparelho e abra-o com `npx expo start --dev-client`.

## Configuração do Firebase

1. Crie um projeto em <https://console.firebase.google.com>.
2. **Authentication → Sign-in method:** habilite somente **E-mail/senha**.
3. Crie o **Cloud Firestore** e o **Realtime Database** (anote a `databaseURL`).
4. **Configurações do projeto → Seus apps:** registre um app **Android** com o pacote `com.example.chatfirebase`
   (ou o definido em `app.json`) e baixe o `google-services.json` para a raiz do projeto. Ele fica fora do Git.
   Para iOS, baixe também o `GoogleService-Info.plist`.
5. Preencha o [`firebaseConfig.json`](firebaseConfig.json) com os valores do app web (`apiKey`, `authDomain`,
   `databaseURL`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`). Esse arquivo contém **apenas** a
   configuração do SDK cliente e está versionado.
6. Publique regras e índices (ajuste o ID em `.firebaserc`):

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore,database
```

## Fotos de perfil e de grupo

As imagens são enviadas ao **Cloudinary** (upload *unsigned*) e **só a URL final** é gravada no Firestore. Nunca
há Base64 nos bancos. Para configurar:

1. Crie uma conta gratuita em <https://cloudinary.com> e anote o **Cloud name**.
2. **Settings → Upload → Upload presets:** crie um preset com *Signing mode: Unsigned*.
3. Informe no `.env`: `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` e `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

Se a foto não existir ou falhar ao carregar, o `Avatar` mostra a inicial do nome como imagem padrão.

## Notificações push

- **Android:** o app obtém o token FCM nativo (`getDevicePushTokenAsync`) e o registra em
  `users/{uid}/devices/{deviceId}`. É preciso o `google-services.json` e um development build. O canal de
  notificação se chama `messages`.
- **iOS:** o FCM não aceita o token APNs cru, então o app usa o **Expo Push Token**, e a API envia pelo Expo Push
  Service. Isso exige um projeto EAS (`eas init`, que grava `extra.eas.projectId` no `app.json`) e uma chave APNs
  (conta Apple Developer paga). Sem isso o app funciona normalmente no iOS, mas não recebe push.
- O push é sempre testado em **aparelho físico**.
- Permissão negada, aparelho sem token ou erro de registro aparecem como aviso na tela de conversas, com o botão
  adequado (ativar, abrir ajustes ou tentar novamente).
- Ao tocar na notificação, o app abre a conversa indicada em `conversationId`/`conversationType`, inclusive quando
  estava fechado.
- No logout o token do aparelho é removido. Além disso, `POST /devices` retira o mesmo token de qualquer outra
  conta, para que um aparelho que troca de usuário não receba as notificações do anterior.

### Política de notificações

Definida por grupo pelo proprietário (`notificationPolicy`) e aplicada **no servidor**:

| Política | Quem recebe push |
|---|---|
| `all_group_messages` | Todos os integrantes, exceto o remetente, em qualquer mensagem do grupo (geral ou direcionada). |
| `mentioned_members` | Somente os integrantes mencionados ou selecionados como destinatário (`mentionedUserIds` e `target.memberId`). |
| `direct_messages_only` | Mensagens de grupo não geram push. |
| `disabled` | Nenhuma mensagem do grupo gera push. |

Conversas individuais sempre notificam o outro participante. Regras gerais: o remetente nunca é notificado; só
participantes atuais da conversa podem receber; tokens inválidos são removidos; o corpo da notificação **não
contém o texto da mensagem**.

## API de notificações (`server/`)

Node.js + Express + TypeScript, publicada na **Vercel** (HTTPS). O app **nunca** envia push diretamente e nenhuma
credencial administrativa existe no aplicativo ou no repositório.

### Endpoints

Todos, exceto o health check, exigem `Authorization: Bearer <Firebase ID token>`.

| Método e rota | Descrição |
|---|---|
| `GET /health` | Disponibilidade da API (sem autenticação). |
| `POST /notifications/messages` | Corpo `{ "conversationId", "messageId" }`. Valida o token, confere a mensagem no RTDB e o remetente, lê a conversa no Firestore, calcula os destinatários pela política e envia o push. Resposta: `{status:"sent",recipients,delivered}`, `{status:"skipped"}` ou `{status:"duplicate"}`. |
| `GET /users/:uid/profile` | Perfil completo, somente do próprio usuário ou de quem compartilha conversa individual ou grupo. |
| `POST /devices` | Corpo `{ deviceId, token, platform }`. Registra o aparelho no usuário autenticado e remove o token de outras contas. |

A API **não confia em lista de destinatários vinda do app**: o corpo traz só os IDs, e o resto é derivado dos
bancos (campos extras são ignorados).

**Idempotência:** antes de enviar, a mensagem é reservada por transação em `notificationLogs/{conversa__mensagem}`.
Repetir a chamada (ou chamadas concorrentes) devolve `duplicate` sem reenviar. Se o envio falha, a reserva é
liberada para uma nova tentativa.

### Executar localmente

```bash
cd server
npm install
cp .env.example .env        # preencha as 4 variáveis (valores reais, apenas na sua máquina)
npm run dev                 # http://localhost:3000
npm test                    # 44 testes
```

### Publicar na Vercel

1. Crie uma conta de serviço no Firebase (**Configurações → Contas de serviço → Gerar nova chave privada**) e
   guarde o JSON **fora do repositório**.
2. Na Vercel: **Add New → Project**, importe o repositório e defina **Root Directory = `server`**.
3. Em **Settings → Environment Variables** cadastre:

| Variável | Conteúdo |
|---|---|
| `FIREBASE_PROJECT_ID` | `project_id` do JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` do JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` do JSON (com as quebras `\n`) |
| `FIREBASE_DATABASE_URL` | URL do Realtime Database |

4. Faça o deploy e confirme `GET <URL>/health` em uma aba anônima. Se a Vercel responder 401, desative o
   *Deployment Protection* em **Settings → Deployment Protection**.
5. Informe a URL em `EXPO_PUBLIC_API_URL` no `.env` do app.

Somente os **nomes** das variáveis estão no repositório (`server/.env.example`); os valores ficam apenas nas
variáveis secretas da hospedagem.

## Limite de integrantes e concorrência

Cada grupo tem `memberLimit` (inteiro, de 2 a 50, incluindo o proprietário), definido na criação e alterável pelo
proprietário, **nunca abaixo da quantidade atual de integrantes**. A interface mostra "n de L integrantes" e as
vagas disponíveis, mas isso é só conveniência — a proteção real tem três camadas:

1. **Transação do Firestore** (`addMember` em [`groupService.ts`](src/services/groupService.ts)): lê o grupo,
   confere proprietário e vagas e grava, tudo dentro de `runTransaction`. Se duas adições concorrentes lerem o mesmo
   estado, o Firestore refaz a transação perdedora com o estado atualizado, que então falha por falta de vaga.
2. **Regra do Firestore:** toda gravação em `groups/{id}` exige `memberIds.size() <= memberLimit`, `memberLimit`
   entre 2 e 50 e integrantes sem repetição. Um cliente adulterado não consegue estourar o limite.
3. **Novo limite validado dentro da transação**, contra os integrantes lidos naquele momento.

## Regras de segurança

Versionadas em [`firestore.rules`](firestore.rules) e [`database.rules.json`](database.rules.json); nenhuma é
aberta ao público.

**Firestore**
- `users/{uid}`: leitura pelo próprio usuário ou por quem tem conversa individual com ele; colegas de grupo acessam
  pela API (as regras não conseguem provar "algum grupo em comum"). O e-mail gravado deve ser o do token.
- `publicProfiles/{uid}`: qualquer autenticado lê; só o dono grava.
- `users/{uid}/devices/*`: só o dono lê e grava; tokens nunca ficam públicos.
- `directConversations/{id}`: só os dois participantes; o ID deve ser `uidA_uidB` ordenado e incluir quem cria.
- `groups/{id}`: só integrantes leem; só o proprietário altera ou apaga; dono e `createdAt` imutáveis; limite
  revalidado a cada gravação.
- Tudo o mais (ex.: `notificationLogs`) é negado ao cliente; a API usa o Admin SDK.

**Realtime Database**
- `messages/{conversa}`: lê e grava só quem está em `members/{conversa}/{uid}`; `senderId` deve ser `auth.uid`,
  `createdAt` deve ser `now`, texto de 1 a 1000 caracteres, destinatário e menções devem ser membros; mensagens
  não são editáveis nem apagáveis.
- `members/{conversa}/{uid}`: em conversa individual, gravável por um dos dois participantes; em grupo, só pelo
  `ownerId` registrado em `groupMeta/`. Remover alguém corta a leitura imediatamente.
- `groupMeta/{grupo}/ownerId`: criado uma única vez; IDs com `_` são proibidos para ninguém reivindicar o nó de
  uma conversa individual.

**Limitações conhecidas (documentadas por transparência)**
- Firestore e RTDB não compartilham transação; a consistência entre eles é por compensação.
- Um usuário removido de um grupo perde também o acesso ao histórico antigo.
- O espelho `members/` de uma conversa individual não consegue confirmar a existência do documento do Firestore;
  alguém poderia criar uma sala `eu_alvo`, mas ela não gera push (a API só notifica conversas existentes no
  Firestore).
- Não há limite de requisições por usuário na API (em serverless um contador em memória não seria confiável); a
  idempotência por mensagem é a proteção atual.

## Testes e verificações

```bash
npm run typecheck && npm run lint        # app: TypeScript estrito, sem any
cd server && npm test                    # API: 44 testes
```

Os testes da API cobrem as quatro políticas e o remetente excluído, a idempotência (inclusive chamadas
concorrentes), a liberação da reserva em caso de falha, a remoção de tokens inválidos, as respostas 400/401/403/404 e
a ignorância de destinatários enviados pelo cliente. Usam portas falsas, sem acesso ao Firebase.

> ⚠️ As regras de segurança e o teste de concorrência do limite **ainda não foram executados no emulador do
> Firebase** (exige Java). _PREENCHER aqui o resultado quando forem rodados, ou remover esta nota._

## Telas

> ⚠️ **PREENCHER:** adicione os prints em `docs/prints/` e referencie-os abaixo.

| Tela | Print |
|---|---|
| Login e cadastro | _PREENCHER_ |
| Conversas | _PREENCHER_ |
| Usuários (busca) | _PREENCHER_ |
| Criação/edição de grupo | _PREENCHER_ |
| Chat individual | _PREENCHER_ |
| Chat em grupo (menção) | _PREENCHER_ |
| Integrantes do grupo | _PREENCHER_ |
| Perfil | _PREENCHER_ |

## Evidência de notificação recebida

> ⚠️ **PREENCHER:** print ou vídeo de um push recebido em aparelho físico (app em segundo plano ou fechado) e do
> toque abrindo a conversa correta, para cada política, se possível.

## Funcionalidades

- Cadastro com nome, e-mail, senha (com confirmação), celular, data de nascimento e foto; login; sessão recuperada;
  logout que remove listeners e o token do aparelho.
- Conversas individuais com exatamente dois participantes, sem conversa consigo mesmo e sem duplicidade (ID
  determinístico + transação). A foto abre o perfil; a foto do grupo abre a lista de integrantes.
- Grupos: criação e edição, foto, integrantes, limite, vagas, política de notificações, adicionar e remover
  integrantes (somente o proprietário).
- Mensagens no Realtime Database com atualização em tempo real, autor identificado em grupos, mensagem geral ou
  direcionada a um integrante, e feedback de falha de envio e de falta de conexão.
- Estados de carregando, erro, vazio, grupo sem vagas, permissão de push negada e aparelho sem token.
