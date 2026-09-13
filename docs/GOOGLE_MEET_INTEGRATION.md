# Google Meet — Integração NutriOpus

## Estado atual (MVP)

No MVP, a integração com Google Meet funciona via **link manual**: o nutricionista cria uma reunião em [meet.google.com](https://meet.google.com) e cola o link na sala do atendimento. O link é salvo em `googleMeetUri` e exibido para o paciente.

## Fluxo manual (disponível agora)

1. Nutricionista cria o atendimento com provider `GOOGLE_MEET`
2. (Opcionalmente) cola o link no formulário de criação
3. Na sala do atendimento, o componente `GoogleMeetRoom` exibe o link e um botão "Abrir Google Meet"
4. Ambos clicam no link e entram na reunião no Google Meet

O link pode ser alterado a qualquer momento pelo nutricionista dentro da sala.

## Configuração OAuth (futuro)

Para criação automática de reuniões via API, é necessário:

### 1. Console Google Cloud

1. Criar projeto em [console.cloud.google.com](https://console.cloud.google.com)
2. Ativar "Google Meet API" e "Google Calendar API"
3. Criar credenciais OAuth 2.0 (Web Application)
4. Adicionar redirect URI: `https://seuapp.com/api/auth/google/callback`

### 2. Variáveis de ambiente

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_MEET_ENABLED=true
GOOGLE_MEET_SCOPES=https://www.googleapis.com/auth/meetings.space.created
```

### 3. Scopes necessários

| Scope | Função |
|---|---|
| `meetings.space.created` | Criar espaços no Google Meet |
| `calendar.events` | Criar eventos com link Meet no Google Calendar |

### 4. Modelo de dados

Os campos do `CareSession` para Google Meet:

```prisma
googleMeetSpaceName    String?   // ID interno do espaço (ex: spaces/xxx)
googleMeetUri          String?   // Link da reunião (https://meet.google.com/...)
googleMeetMeetingCode  String?   // Código da reunião (ex: abc-defg-hij)
```

## Segurança

- Tokens OAuth são armazenados no `Nutritionist` (server-side apenas): `googleAccessToken`, `googleRefreshToken`, `googleTokenExpiresAt`
- Nunca expor tokens no client
- Validar `expiresAt` antes de usar o access token; renovar via refresh token se necessário

## Limitações MVP

- Apenas link manual (sem criação automática de reuniões)
- OAuth não implementado nesta sprint
- Sem expiração automática de reuniões
