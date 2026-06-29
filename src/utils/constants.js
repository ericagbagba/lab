export const CODES = {
  1:'A7K',    2:'X9LM',   3:'Q4ZTR',  4:'R2WXC',  5:'M7QAFJ',
  6:'T5K',    7:'V3LF',   8:'H9XCTR', 9:'J4MNB',  10:'C8TYQL',
  11:'N2Q',   12:'F7LPAR',13:'D5XA',  14:'K9RVTQ',15:'W8QKL',
  16:'Y4TZPX',17:'G2N',   18:'L7XMRQ',19:'U5M',   20:'E9QFAT',
  21:'Z3KD',  22:'A6TWPX',23:'P2ZXQV',24:'N5Q',   25:'H7KFAL',
  26:'T9X',   27:'B4MRLW',28:'J8QWXT',29:'F5TZ',  30:'X7KDMQ',
  31:'M3RVTA',32:'D8KFLT',33:'A2X',   34:'R7MQTL',
  35:'P9LVXC',36:'H2KFMP',37:'T7XCQL',38:'B5M',   39:'V9LPQA',
  40:'J3QWFT',41:'X2KDPL',42:'C7MNQX',43:'M5R',   44:'D9QFLT',
  45:'L8XQTR',46:'U2M',   47:'Y7KPLA',48:'E4WQXT',49:'Z5MR',
  50:'A8T',
  51:'R3XQFA',52:'P7L',   53:'N9KDMX',54:'T2QWLP',55:'B7MRXT',
  56:'J9LPQA',57:'F3Q',   58:'X8TZRM',59:'M7QFLT',60:'D4X',
  61:'K87MNQP',62:'U9RVTA',63:'Y2K',  64:'G7XKPL',65:'Z2WKFA',
  66:'A9PXT', 67:'P4MNQV',68:'N8X',   69:'H3TZRM',70:'T7Q',
  71:'B2KLPX',72:'J5MNQT',73:'F4X',   74:'X8RVTA',75:'M7QZLP',
  76:'D2TZ',  77:'K9XQFA',78:'U8MNQP',79:'Y5R',   80:'G2PLXT',
  81:'Z7QWLM'
};

export const MAX_CASES = Math.max(...Object.keys(CODES).map(Number));

export const AGENCY_STOCK_CATEGORIES = [
  'switch',
  'câble',
  'connecteur',
  'boîte',
  'fil_galva',
  'domino',
  'chatterton',
  'disjoncteur',
  'additionneuse',
  'autre'
];

export const GLOBAL_STOCK_CATEGORIES = [
  'routeur_mikrotik',
  ...AGENCY_STOCK_CATEGORIES
];

export const ROLES = {
  DIRECTEUR: 'directeur',
  CONTROLEUR: 'contrôleur',
  SUPERVISEUR: 'superviseur',
  CHEF_AGENCE: 'chef_agence',
  OPERATEUR: 'opérateur',
  TECHNICIEN: 'technicien',
  NONE: null
};

export const FAULT_STATUSES = {
  OUVERTE: 'ouverte',
  EN_COURS: 'en_cours',
  RESOLUE: 'résolue',
  ANNULEE: 'annulée'
};

export const STOCK_REQUEST_STATUSES = {
  EN_ATTENTE: 'en_attente',
  APPROUVEE: 'approuvée',
  REFUSEE: 'refusée'
};
