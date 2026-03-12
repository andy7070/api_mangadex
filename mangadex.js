require('dotenv').config();
const log = require('./logger');

const MANGADEX_API = 'https://api.mangadex.org';
const DELAY_MS = parseInt(process.env.MANGADEX_DELAY_MS || '1200');
const BATCH_SIZE = 500;

// ---------- helpers ----------

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        // Rate limited — espera 10s e tenta de novo
        log.warn(`Rate limit atingido. Aguardando 10s... (tentativa ${attempt}/${retries})`);
        await sleep(10_000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      log.warn(`Erro na request (tentativa ${attempt}/${retries}): ${err.message}`);
      await sleep(3_000);
    }
  }
}

// ---------- busca capítulos de um idioma (paginado) ----------

async function fetchChaptersForLanguage(mangadexId, language) {
  const allChapters = [];
  let offset = 0;

  while (true) {
    const url =
      `${MANGADEX_API}/manga/${mangadexId}/feed` +
      `?translatedLanguage[]=${language}` +
      `&limit=${BATCH_SIZE}&offset=${offset}` +
      `&order[chapter]=asc` +
      `&includes[]=scanlation_group` +
      `&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`;

    await sleep(DELAY_MS);
    const json = await fetchJSON(url);

    if (json.result !== 'ok' || !json.data?.length) break;

    allChapters.push(...json.data);
    if (json.total <= offset + BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return allChapters;
}

// ---------- escolhe o melhor capítulo por número ----------

function getBestChaptersPerNumber(publications) {
  const groups = new Map();

  for (const chap of publications) {
    const num = chap.attributes.chapter;
    if (!num) continue;
    if (!groups.has(num)) groups.set(num, []);
    groups.get(num).push(chap);
  }

  const best = [];
  for (const [, chapList] of groups) {
    const winner = chapList.reduce((a, b) => {
      const pA = a.attributes.pages || 0;
      const pB = b.attributes.pages || 0;
      if (pB > pA) return b;
      if (pB === pA) return new Date(b.attributes.createdAt) > new Date(a.attributes.createdAt) ? b : a;
      return a;
    });
    best.push(winner);
  }

  return best;
}

// ---------- normaliza um capítulo pro formato do banco ----------

function normalizeChapter(chap, mangadexId) {
  const scanGroup = chap.relationships.find(r => r.type === 'scanlation_group');
  return {
    id: chap.id,
    manga_mangadex_id: mangadexId,
    title: chap.attributes.title || null,
    chapter_number: chap.attributes.chapter || 'N/A',
    pages: chap.attributes.pages,
    translated_language: chap.attributes.translatedLanguage,
    created_at_mangadex: chap.attributes.createdAt,
    scanlation_group_name: scanGroup?.attributes?.name || null,
  };
}

// ---------- função principal: busca novos capítulos ----------

/**
 * Busca todos os capítulos disponíveis no MangaDex (PT-BR + EN)
 * e retorna apenas os que ainda NÃO existem no banco.
 *
 * @param {string} mangadexId
 * @param {Set<string>} savedIds  — IDs de capítulos já salvos no Supabase
 * @returns {{ newChapters: object[], totalFetched: number }}
 */
async function getNewChapters(mangadexId, savedIds) {
  // Busca PT-BR e EN em paralelo
  let [ptBrChaps, enChaps] = await Promise.all([
    fetchChaptersForLanguage(mangadexId, 'pt-br'),
    fetchChaptersForLanguage(mangadexId, 'en'),
  ]);

  // Fallback: alguns grupos usam 'pt' em vez de 'pt-br'
  if (ptBrChaps.length === 0) {
    await sleep(DELAY_MS);
    ptBrChaps = await fetchChaptersForLanguage(mangadexId, 'pt');
  }

  const bestPt = getBestChaptersPerNumber(ptBrChaps);
  const bestEn = getBestChaptersPerNumber(enChaps);
  const allBest = [...bestPt, ...bestEn];

  // Filtra apenas os que NÃO estão no banco
  const newChapters = allBest
    .filter(chap => !savedIds.has(chap.id))
    .map(chap => normalizeChapter(chap, mangadexId));

  return {
    newChapters,
    totalFetched: allBest.length,
    ptCount: bestPt.length,
    enCount: bestEn.length,
  };
}

module.exports = { getNewChapters };
