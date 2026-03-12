const supabase = require('./supabase');
const { getNewChapters } = require('./mangadex');
const log = require('./logger');

/**
 * Busca todos os mangás cadastrados no Supabase.
 */
async function getAllMangas() {
  const { data, error } = await supabase
    .from('mangas')
    .select('mangadex_id, title')
    .order('title');

  if (error) throw new Error(`Erro ao buscar mangás: ${error.message}`);
  return data || [];
}

/**
 * Busca os IDs de capítulos já salvos para um mangá.
 * Retorna um Set para lookup O(1).
 */
async function getSavedChapterIds(mangadexId) {
  const { data, error } = await supabase
    .from('manga_chapters')
    .select('id')
    .eq('manga_mangadex_id', mangadexId);

  if (error) throw new Error(`Erro ao buscar capítulos salvos: ${error.message}`);
  return new Set((data || []).map(c => c.id));
}

/**
 * Salva novos capítulos no Supabase via upsert.
 */
async function saveChapters(chapters) {
  const { error } = await supabase
    .from('manga_chapters')
    .upsert(chapters, { onConflict: 'id' });

  if (error) throw new Error(`Erro ao salvar capítulos: ${error.message}`);
}

/**
 * Processa um único mangá: verifica e salva novos capítulos.
 * Retorna o número de capítulos novos adicionados.
 */
async function processManga(manga) {
  const { mangadex_id, title } = manga;

  try {
    log.manga(`Verificando: ${title} (${mangadex_id})`);

    const savedIds = await getSavedChapterIds(mangadex_id);
    const { newChapters, ptCount, enCount } = await getNewChapters(mangadex_id, savedIds);

    if (newChapters.length === 0) {
      log.info(`  └── Já atualizado. Salvos: ${savedIds.size} | MangaDex: PT=${ptCount} EN=${enCount}`);
      return 0;
    }

    await saveChapters(newChapters);

    // Agrupa por idioma pra logar melhor
    const ptNew = newChapters.filter(c => c.translated_language?.startsWith('pt')).length;
    const enNew = newChapters.filter(c => c.translated_language === 'en').length;

    log.new(`  └── ${title}: +${newChapters.length} novos! (PT: ${ptNew} | EN: ${enNew})`);
    return newChapters.length;

  } catch (err) {
    log.error(`  └── Falha em "${title}": ${err.message}`);
    return 0;
  }
}

/**
 * Ciclo completo de verificação de todos os mangás.
 * Chamado pelo cron job.
 */
async function runWatcherCycle() {
  log.title('🔍 Iniciando ciclo de verificação');

  const startTime = Date.now();
  let totalNew = 0;
  let errors = 0;

  try {
    const mangas = await getAllMangas();

    if (mangas.length === 0) {
      log.warn('Nenhum mangá cadastrado no banco.');
      return;
    }

    log.info(`${mangas.length} mangás encontrados. Verificando...`);

    for (let i = 0; i < mangas.length; i++) {
      const manga = mangas[i];
      log.info(`[${i + 1}/${mangas.length}] ${manga.title}`);

      const added = await processManga(manga);
      totalNew += added;
      if (added < 0) errors++;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    log.title('📊 Ciclo concluído');
    log.success(`Resultado: ${totalNew} novos capítulos em ${mangas.length} mangás (${elapsed}s)`);
    if (errors > 0) log.warn(`${errors} erro(s) durante o ciclo.`);

  } catch (err) {
    log.error(`Ciclo abortado: ${err.message}`);
  }
}

module.exports = { runWatcherCycle };
