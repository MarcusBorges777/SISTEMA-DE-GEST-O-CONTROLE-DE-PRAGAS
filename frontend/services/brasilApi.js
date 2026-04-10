// Servico centralizado de chamadas a Brasil API
// Base URL: https://brasilapi.com.br/api
// Endpoints: CNPJ, CEP, DDD, IBGE Municipios, Feriados

const BASE_URL = 'https://brasilapi.com.br/api';

// Cache em memoria para evitar chamadas repetidas na mesma sessao
const memoryCache = {};

function getCacheKey(endpoint) {
  return `brasilapi_${endpoint}`;
}

function getFromSessionCache(key) {
  const cached = memoryCache[key];
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hora
    return cached.data;
  }
  return null;
}

function setSessionCache(key, data) {
  memoryCache[key] = { data, timestamp: Date.now() };
}

/**
 * Buscar dados de empresa por CNPJ
 * @param {string} cnpj - CNPJ com ou sem formatacao (14 digitos)
 * @returns {Promise<Object>} Dados da empresa
 */
export async function buscarCNPJ(cnpj) {
  const cnpjLimpo = cnpj.replace(/[^\d]/g, '');
  if (cnpjLimpo.length !== 14) {
    throw new Error('CNPJ deve conter 14 dígitos');
  }

  const cacheKey = getCacheKey(`cnpj_${cnpjLimpo}`);
  const cached = getFromSessionCache(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${BASE_URL}/cnpj/v1/${cnpjLimpo}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error('CNPJ não encontrado');
    throw new Error(`Erro ao consultar CNPJ: ${response.status}`);
  }

  const data = await response.json();

  // Mapear para formato do sistema com todos os campos
  const result = {
    raw: data,
    nome: data.razao_social || '',
    fantasia: data.nome_fantasia || '',
    cnpj: data.cnpj || cnpjLimpo,
    // Endereco completo formatado
    endereco: montarEndereco(data),
    // Campos de endereco separados para preenchimento de formularios
    logradouro: data.logradouro || '',
    numero: data.numero || '',
    complemento: data.complemento || '',
    bairro: data.bairro || '',
    municipio: data.municipio || '',
    uf: data.uf || '',
    cep: data.cep ? String(data.cep) : '',
    // Atividade / CNAE
    atividade: montarAtividade(data),
    cnae_fiscal: data.cnae_fiscal || '',
    cnae_descricao: data.cnae_fiscal_descricao || '',
    // Contato
    email: data.email || '',
    telefone: data.ddd_telefone_1 || '',
    telefone2: data.ddd_telefone_2 || '',
    // Info empresa
    porte: data.porte || '',
    natureza_juridica: data.natureza_juridica || '',
    capital_social: data.capital_social || 0,
    situacao_cadastral: data.descricao_situacao_cadastral || '',
    data_situacao_cadastral: data.data_situacao_cadastral || '',
    data_inicio_atividade: data.data_inicio_atividade || '',
    // Socios
    qsa: data.qsa || [],
  };

  setSessionCache(cacheKey, result);
  return result;
}

function montarEndereco(data) {
  const parts = [];
  if (data.logradouro) parts.push(data.logradouro);
  if (data.numero) parts.push(`Nº ${data.numero}`);
  if (data.complemento) parts.push(data.complemento);
  if (data.bairro) parts.push(`- ${data.bairro}`);
  if (data.municipio) parts.push(`- ${data.municipio}`);
  if (data.uf) parts.push(`/${data.uf}`);
  if (data.cep) parts.push(`CEP ${data.cep}`);
  return parts.join(' ');
}

function montarAtividade(data) {
  // cnae_fiscal e descricao vem no campo principal
  if (data.cnae_fiscal && data.cnae_fiscal_descricao) {
    return `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}`;
  }
  // Fallback para cnaes_secundarios
  if (data.cnaes_secundarios && data.cnaes_secundarios.length > 0) {
    const cnae = data.cnaes_secundarios[0];
    return `${cnae.codigo} - ${cnae.descricao}`;
  }
  return '';
}

/**
 * Buscar endereco por CEP
 * @param {string} cep - CEP com ou sem formatacao (8 digitos)
 * @returns {Promise<Object>} Dados do endereco
 */
export async function buscarCEP(cep) {
  const cepLimpo = cep.replace(/[^\d]/g, '');
  if (cepLimpo.length !== 8) {
    throw new Error('CEP deve conter 8 dígitos');
  }

  const cacheKey = getCacheKey(`cep_${cepLimpo}`);
  const cached = getFromSessionCache(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${BASE_URL}/cep/v2/${cepLimpo}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error('CEP não encontrado');
    throw new Error(`Erro ao consultar CEP: ${response.status}`);
  }

  const data = await response.json();
  const result = {
    cep: data.cep || cepLimpo,
    rua: data.street || '',
    bairro: data.neighborhood || '',
    cidade: data.city || '',
    estado: data.state || '',
    endereco: [data.street, data.neighborhood, `${data.city}/${data.state}`].filter(Boolean).join(' - ')
  };

  setSessionCache(cacheKey, result);
  return result;
}

/**
 * Buscar cidades por DDD
 * @param {number} ddd - Codigo DDD (ex: 37)
 * @returns {Promise<Object>} Estado e lista de cidades
 */
export async function buscarDDD(ddd) {
  const cacheKey = getCacheKey(`ddd_${ddd}`);
  const cached = getFromSessionCache(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${BASE_URL}/ddd/v1/${ddd}`);
  if (!response.ok) {
    throw new Error(`Erro ao consultar DDD: ${response.status}`);
  }

  const data = await response.json();
  setSessionCache(cacheKey, data);
  return data;
}

/**
 * Buscar municipios de MG via IBGE
 * @returns {Promise<Array>} Lista de municipios com nome e codigo_ibge
 */
export async function buscarMunicipiosMG() {
  const cacheKey = getCacheKey('ibge_mg');
  const cached = getFromSessionCache(cacheKey);
  if (cached) return cached;

  const response = await fetch(`${BASE_URL}/ibge/municipios/v1/MG?providers=dados-abertos-br,gov`);
  if (!response.ok) {
    throw new Error(`Erro ao consultar municípios: ${response.status}`);
  }

  const data = await response.json();
  setSessionCache(cacheKey, data);
  return data;
}

/**
 * Buscar feriados nacionais do ano
 * @param {number} ano - Ano (ex: 2026)
 * @returns {Promise<Array>} Lista de feriados com date, name, type
 */
export async function buscarFeriados(ano = 2026) {
  const cacheKey = getCacheKey(`feriados_${ano}`);
  const cached = getFromSessionCache(cacheKey);
  if (cached) return cached;

  // Tenta buscar da API, com fallback para lista estatica
  try {
    const response = await fetch(`${BASE_URL}/feriados/v1/${ano}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    setSessionCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn('Falha ao buscar feriados da API, usando lista estática:', err.message);
    // Feriados nacionais fixos de 2026
    const fallback = [
      { date: `${ano}-01-01`, name: "Confraternização Universal", type: "national" },
      { date: `${ano}-02-16`, name: "Carnaval", type: "national" },
      { date: `${ano}-02-17`, name: "Carnaval", type: "national" },
      { date: `${ano}-04-03`, name: "Sexta-feira Santa", type: "national" },
      { date: `${ano}-04-21`, name: "Tiradentes", type: "national" },
      { date: `${ano}-05-01`, name: "Dia do Trabalho", type: "national" },
      { date: `${ano}-06-04`, name: "Corpus Christi", type: "national" },
      { date: `${ano}-09-07`, name: "Independência do Brasil", type: "national" },
      { date: `${ano}-10-12`, name: "Nossa Senhora Aparecida", type: "national" },
      { date: `${ano}-11-02`, name: "Finados", type: "national" },
      { date: `${ano}-11-15`, name: "Proclamação da República", type: "national" },
      { date: `${ano}-12-25`, name: "Natal", type: "national" }
    ];
    setSessionCache(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Verificar se uma data eh feriado
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @param {Array} feriados - Lista de feriados carregada
 * @returns {Object|null} Feriado encontrado ou null
 */
export function verificarFeriado(dateStr, feriados) {
  if (!dateStr || !feriados || feriados.length === 0) return null;
  return feriados.find(f => f.date === dateStr) || null;
}

/**
 * Carregar cidades da regiao de Divinopolis (DDDs 31, 32, 37)
 * @returns {Promise<string[]>} Lista unificada de cidades
 */
export async function carregarCidadesRegiao() {
  const ddds = [31, 32, 37];
  const cacheKey = getCacheKey('cidades_regiao');
  const cached = getFromSessionCache(cacheKey);
  if (cached) return cached;

  try {
    const results = await Promise.allSettled(ddds.map(ddd => buscarDDD(ddd)));
    const allCities = new Set();
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.cities) {
        r.value.cities.forEach(city => allCities.add(city));
      }
    });
    const cities = [...allCities].sort();
    setSessionCache(cacheKey, cities);
    return cities;
  } catch {
    return [];
  }
}
