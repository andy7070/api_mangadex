# 🍥 Manga Chapter Watcher

Auto-sync de capítulos novos do **MangaDex** direto pro seu **Supabase**.  
Roda em background no seu PC e verifica automaticamente se saiu capítulo novo — sem precisar fazer nada.

---

## 📁 Estrutura

```
manga-watcher/
├── src/
│   ├── index.js      ← Entry point + cron scheduler
│   ├── watcher.js    ← Lógica principal do ciclo
│   ├── mangadex.js   ← Integração com a API do MangaDex
│   ├── supabase.js   ← Cliente Supabase
│   └── logger.js     ← Logs coloridos no terminal
├── .env              ← Suas credenciais
├── package.json
└── README.md
```

---

## 🚀 Instalação e uso

```bash
# 1. Entra na pasta
cd manga-watcher

# 2. Instala as dependências
npm install

# 3. (opcional) Edita o .env para ajustar o intervalo
#    CHECK_INTERVAL define de quantas em quantas horas verifica

# 4. Roda em modo dev (com nodemon — reinicia automaticamente se você editar algo)
npm run dev

# 5. Ou roda normal
npm start
```

---

## ⚙️ Configuração (.env)

| Variável | Padrão | Descrição |
|---|---|---|
| `SUPABASE_URL` | — | URL do seu projeto Supabase |
| `SUPABASE_SERVICE_KEY` | — | Service role key do Supabase |
| `CHECK_INTERVAL` | `0 */6 * * *` | Cron de quanto em quanto tempo verifica |
| `MANGADEX_DELAY_MS` | `1200` | Delay entre requests pra não tomar ban do MangaDex |

### Exemplos de intervalo (cron)

```
0 */6 * * *   → a cada 6 horas  ✅ (recomendado)
0 */3 * * *   → a cada 3 horas
0 * * * *     → a cada 1 hora
0 8,20 * * *  → às 8h e 20h todos os dias
```

---

## 🔄 O que ele faz

1. **Na inicialização**: roda uma verificação imediata
2. **A cada ciclo**:
   - Busca todos os mangás na tabela `mangas` do Supabase
   - Para cada mangá, busca os capítulos já salvos na tabela `manga_chapters`
   - Consulta a API do MangaDex buscando capítulos em **PT-BR** e **EN**
   - Compara: se tem capítulo novo → salva no banco
   - Se não tem nada novo → pula e continua
3. **Só adiciona se for novo** — usa `upsert` com conflito no `id` pra não duplicar

---

## 📊 Tabelas usadas

| Tabela | O que usa |
|---|---|
| `mangas` | Lê `mangadex_id` e `title` de todos os mangás |
| `manga_chapters` | Lê IDs existentes + insere capítulos novos |

---

## 🛑 Para rodar como serviço (opcional, Windows)

Se quiser que rode mesmo com o terminal fechado, use o **PM2**:

```bash
npm install -g pm2
pm2 start src/index.js --name manga-watcher
pm2 save
pm2 startup  # configura pra iniciar com o Windows
```

---

## 🧪 Exemplo de saída no terminal

```
╔══════════════════════════════════════════╗
║      🍥  MANGA CHAPTER WATCHER  🍥       ║
║  Auto-sync MangaDex → Supabase           ║
╚══════════════════════════════════════════╝

[21/03/2025 08:00:01] ℹ  Agendamento: 0 */6 * * *
[21/03/2025 08:00:01] ✅ Conectado ao Supabase ✓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔍 Iniciando ciclo de verificação
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[21/03/2025 08:00:01] ℹ  42 mangás encontrados. Verificando...
[21/03/2025 08:00:01] ℹ  [1/42] One Piece
[21/03/2025 08:00:02] 📖 Verificando: One Piece (...)
[21/03/2025 08:00:04] ℹ     └── Já atualizado. Salvos: 1096 | MangaDex: PT=1096 EN=1096
[21/03/2025 08:00:04] ℹ  [2/42] Jujutsu Kaisen
[21/03/2025 08:00:05] 📖 Verificando: Jujutsu Kaisen (...)
[21/03/2025 08:00:07] 🆕  └── Jujutsu Kaisen: +2 novos! (PT: 1 | EN: 1)
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 Ciclo concluído
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[21/03/2025 08:02:33] ✅ Resultado: 8 novos capítulos em 42 mangás (152.3s)
```
