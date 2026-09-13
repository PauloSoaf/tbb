# Estrategia de Storage (Uploads)

## Regra atual
O NutriOpus usa a abstracao `src/lib/storage/storage-provider.ts`.

Providers disponiveis:
- `local`: salva em `public/uploads`. Use apenas em desenvolvimento.
- `vercel-blob`: salva no Vercel Blob e retorna URL publica persistente. Use em producao.

## Por que `/uploads/...` quebra em producao
URLs como `/uploads/profiles/arquivo.png` sao geradas pelo provider `local`.

Em Vercel/ambiente serverless, esse arquivo nao fica persistido no deploy publico. O banco pode guardar a URL, mas o arquivo nao existe no servidor de producao depois do deploy/restart, causando 404.

## Configuracao recomendada em producao
No painel da Vercel, configurar:

```env
STORAGE_PROVIDER=vercel-blob
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

Se `BLOB_READ_WRITE_TOKEN` existir e `STORAGE_PROVIDER` nao estiver definido, o app escolhe `vercel-blob` automaticamente.

## Desenvolvimento local
Use:

```env
STORAGE_PROVIDER=local
```

Isso salva arquivos em `public/uploads`.

## Imagens antigas quebradas
Registros que ja estao no banco com `/uploads/profiles/...` nao sao migrados automaticamente.

Para corrigir:
1. Reenviar a imagem pela tela de configuracoes em producao depois de ativar Vercel Blob.
2. Ou atualizar manualmente `profileImageUrl` no banco para uma URL valida do Blob.

## Supabase
O projeto nao usa Supabase Storage neste fluxo. Para usar Supabase, seria necessario criar um novo provider implementando `StorageProvider`.
