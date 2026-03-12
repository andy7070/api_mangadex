const COLORS = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  gray:   '\x1b[90m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  red:    '\x1b[31m',
  magenta:'\x1b[35m',
};

function timestamp() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

const log = {
  info:    (msg) => console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.cyan}ℹ${COLORS.reset}  ${msg}`),
  success: (msg) => console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.green}✅${COLORS.reset} ${msg}`),
  warn:    (msg) => console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.yellow}⚠️${COLORS.reset}  ${msg}`),
  error:   (msg) => console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.red}❌${COLORS.reset} ${msg}`),
  new:     (msg) => console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.magenta}🆕${COLORS.reset} ${COLORS.bold}${msg}${COLORS.reset}`),
  title:   (msg) => console.log(`\n${COLORS.bold}${COLORS.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}\n${COLORS.bold}${COLORS.blue}  ${msg}${COLORS.reset}\n${COLORS.bold}${COLORS.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`),
  manga:   (msg) => console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.yellow}📖${COLORS.reset} ${msg}`),
};

module.exports = log;
