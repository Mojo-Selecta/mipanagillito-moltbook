/**
 * 🎯 RECON TARGETS — config/recon-targets.js
 */

const POLITICIANS = [
  { name: 'Jenniffer González', aliases: ['jenniffer', 'gonzalez colon', 'gobernadora'] },
  { name: 'Pedro Pierluisi', aliases: ['pierluisi'] },
  { name: 'Thomas Rivera Schatz', aliases: ['rivera schatz', 'thomas rivera'] },
  { name: 'Juan Dalmau', aliases: ['dalmau'] },
  { name: 'Alexandra Lúgaro', aliases: ['lugaro'] },
  { name: 'Nydia Velázquez', aliases: ['velazquez'] },
  { name: 'Carmen Yulín', aliases: ['yulin', 'carmen yulin cruz'] },
  { name: 'Wanda Vázquez', aliases: ['wanda vazquez'] },
  { name: 'Ricardo Rosselló', aliases: ['rossello', 'ricky resign'] },
  { name: 'Legislatura PR', aliases: ['senado', 'cámara de representantes', 'legislatura'] },
  { name: 'FOMB', aliases: ['junta de control fiscal', 'fiscal oversight', 'junta fiscal'] },
];

const ENERGY_ENTITIES = [
  { name: 'LUMA Energy', aliases: ['luma', 'luma energy'] },
  { name: 'AEE', aliases: ['autoridad de energía eléctrica', 'prepa', 'aee'] },
  { name: 'Genera PR', aliases: ['genera', 'genera pr'] },
  { name: 'NEPR', aliases: ['negociado de energía', 'energy bureau'] },
  { name: 'FEMA', aliases: ['fema'] },
];

const FEDERAL_ENTITIES = [
  { name: 'ICE', aliases: ['immigration and customs', 'ice agents', 'agentes ice'] },
  { name: 'CBP', aliases: ['customs and border', 'border patrol'] },
  { name: 'FEMA', aliases: ['fema', 'federal emergency'] },
  { name: 'HUD', aliases: ['hud', 'housing and urban', 'vivienda federal'] },
  { name: 'FBI', aliases: ['fbi', 'federal bureau'] },
  { name: 'Trump Admin', aliases: ['trump', 'white house', 'casa blanca', 'administración trump'] },
  { name: 'DOJ', aliases: ['department of justice', 'departamento de justicia federal'] },
  { name: 'Jones Act', aliases: ['jones act', 'ley jones', 'cabotage'] },
  { name: 'Congress', aliases: ['congreso', 'congress', 'capitol hill'] },
];

const RSS_FEEDS = {
  politicians: [
    { name: 'El Nuevo Día - Gobierno', url: 'https://www.elnuevodia.com/rss/gobierno/' },
    { name: 'Metro PR - Gobierno', url: 'https://www.metro.pr/feed/gobierno/' },
    { name: 'NotiCel', url: 'https://www.noticel.com/feed/' },
    { name: 'El Vocero - Gobierno', url: 'https://www.elvocero.com/gobierno/rss/' },
    { name: 'Primera Hora - Gobierno', url: 'https://www.primerahora.com/rss/gobierno/' },
  ],
  energy: [
    { name: 'El Nuevo Día - Infraestructura', url: 'https://www.elnuevodia.com/rss/infraestructura/' },
    { name: 'Metro PR - LUMA', url: 'https://www.metro.pr/feed/economia/' },
    { name: 'NEPR Updates', url: 'https://energia.pr.gov/feed/' },
    { name: 'NotiCel Economía', url: 'https://www.noticel.com/economia/feed/' },
  ],
  federal: [
    { name: 'AP News - Puerto Rico', url: 'https://rsshub.app/apnews/topics/puerto-rico' },
    { name: 'Reuters - US Politics', url: 'https://rsshub.app/reuters/world/us' },
    { name: 'El Nuevo Día - EEUU', url: 'https://www.elnuevodia.com/rss/eeuu/' },
    { name: 'Caribbean Business', url: 'https://caribbeanbusiness.com/feed/' },
  ],
  general: [
    { name: 'El Nuevo Día - Noticias', url: 'https://www.elnuevodia.com/rss/noticias/' },
    { name: 'Primera Hora', url: 'https://www.primerahora.com/rss/' },
    { name: 'Metro PR', url: 'https://www.metro.pr/feed/' },
    { name: 'El Vocero', url: 'https://www.elvocero.com/rss/' },
    { name: 'NotiCel', url: 'https://www.noticel.com/feed/' },
  ],
};

const JUICINESS_BOOSTS = {
  scandal: 3, corruption: 3, outage: 2.5, protest: 2, deportation: 2,
  price_hike: 1.5, disaster: 2, violence: 1.5, funding: 1, resignation: 2,
};

module.exports = { POLITICIANS, ENERGY_ENTITIES, FEDERAL_ENTITIES, RSS_FEEDS, JUICINESS_BOOSTS };
