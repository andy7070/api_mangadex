require('dotenv').config();
const cron = require('node-cron');
const { runWatcherCycle } = require('./watcher');
const log = require('./logger');

// ──────────────────────────────────────────────
//  CONFIGURAÇÃO
// ──────────────────────────────────────────────

// Intervalo padrão: a cada 6 horas
// Exemplos:
//   "0 */6 * * *"  → a cada 6h
//   "0 */3 * * *"  → a cada 3h
//   "0 * * * *"    → a cada 1h
//   "*/30 * * * *" → a cada 30 min (pesado, use com cuidado)
const CRON_SCHEDULE = process.env.CHECK_INTERVAL || '0 */6 * * *';

// ──────────────────────────────────────────────
//  BANNER
// ──────────────────────────────────────────────

function printBanner() {
  console.log('\n');
  console.log('\x1b[33m╔══════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[33m║      🍥  MANGA CHAPTER WATCHER  🍥       ║\x1b[0m');
  console.log('\x1b[33m║  Auto-sync MangaDex → Supabase           ║\x1b[0m');
  console.log('\x1b[33m╚══════════════════════════════════════════╝\x1b[0m');
  console.log('\n');
}

// ──────────────────────────────────────────────
//  INICIALIZAÇÃO
// ──────────────────────────────────────────────

async function main() {
  printBanner();

  log.info(`Agendamento: ${CRON_SCHEDULE}`);
  log.info(`Delay entre requests: ${process.env.MANGADEX_DELAY_MS || 1200}ms`);
  log.info('Conectado ao Supabase ✓');
  console.log('');

  // ── Executa imediatamente na inicialização ──
  log.info('Executando primeira verificação agora...');
  await runWatcherCycle();

  // ── Agenda o cron job ──
  if (!cron.validate(CRON_SCHEDULE)) {
    log.error(`CRON inválido: "${CRON_SCHEDULE}". Verifique o .env`);
    process.exit(1);
  }

  cron.schedule(CRON_SCHEDULE, async () => {
    log.info('Cron disparado. Iniciando novo ciclo...');
    await runWatcherCycle();
  });

  log.success(`Watcher rodando! Próxima verificação agendada (${CRON_SCHEDULE})`);
  log.info('Pressione Ctrl+C para encerrar.\n');
}

// ──────────────────────────────────────────────
//  GRACEFUL SHUTDOWN
// ──────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\n');
  log.warn('Encerrando watcher...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  log.error(`Erro não capturado: ${err.message}`);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  log.error(`Promise rejeitada: ${reason}`);
});

// ──────────────────────────────────────────────

main();
