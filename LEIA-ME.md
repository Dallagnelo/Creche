# Notificações no celular/computador (push)

O sininho 🔔 do site funciona só com o passo 1. Os passos 2 a 6 ligam as notificações no aparelho
(chegam mesmo com o site fechado).

## 1. Banco
Rode `supabase/migracao-notificacoes.sql` no **SQL Editor**. Pode rodar de novo sem quebrar.

## 2. Gerar o par de chaves (uma vez)
No terminal do StackBlitz, rode:

```
npx web-push generate-vapid-keys
```

Ele mostra uma **Public Key** e uma **Private Key**. Guarde as duas.
A Private Key é secreta: ela vai **só** nos Secrets do Supabase (passo 3), nunca no código nem na Vercel.

## 3. Segredos da função (Supabase > Edge Functions > Secrets)
- `VAPID_PUBLIC_KEY`: a Public Key
- `VAPID_PRIVATE_KEY`: a Private Key
- `VAPID_SUBJECT`: `mailto:` + o seu e-mail (ex.: `mailto:fulano@gmail.com`)
- `PUSH_WEBHOOK_SECRET`: invente uma senha comprida (só letras e números). Ela vai também no passo 5.

## 4. Publicar a função
1. **Edge Functions > Deploy a new function > Via Editor**.
2. Nome: `send-push` (exatamente assim).
3. Apague o código de exemplo, cole todo o conteúdo de `index.ts` e clique em **Deploy**.
4. Em **Details**, **desligue o Verify JWT** (quem chama é o banco, e a função confere a senha do passo 3).

## 5. Ligar o banco na função (Database Webhook)
**Database > Webhooks > Create a new hook** (se pedir, clique em "Enable webhooks"):
- Name: `push`
- Table: `notifications`
- Events: marque só **Insert**
- Type: **Supabase Edge Functions**, escolha `send-push`, método `POST`
- HTTP Headers: adicione `x-webhook-secret` com a senha do `PUSH_WEBHOOK_SECRET`
- Salve.

## 6. Chave pública no site
Na **Vercel > Settings > Environment Variables**, crie `VITE_VAPID_PUBLIC_KEY` com a **Public Key**
e faça um novo deploy. (No `.env` do StackBlitz também, se quiser testar por lá.)

## Testar
Em **Configurações > Notificações**, ligue "Notificações neste aparelho" e toque em **Mandar um teste**.
- iPhone/iPad: só funciona com o app instalado na Tela de Início (Safari > Compartilhar > Adicionar à Tela de Início), abrindo pelo ícone.
- Se o teste aparece no sininho mas não no aparelho: confira os passos 3 a 5. Em **Edge Functions > send-push > Logs** aparece o motivo.
