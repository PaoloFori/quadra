import type { Category, Rule } from './types';

type CategorySeed = Pick<Category, 'id' | 'kind' | 'color' | 'icon'>;

const SEEDS: CategorySeed[] = [
  { id: 'groceries', kind: 'expense', color: '#22c55e', icon: '🛒' },
  { id: 'restaurants', kind: 'expense', color: '#f97316', icon: '🍽️' },
  { id: 'transport', kind: 'expense', color: '#0ea5e9', icon: '🚆' },
  { id: 'fuel', kind: 'expense', color: '#94a3b8', icon: '⛽' },
  { id: 'rent', kind: 'expense', color: '#8b5cf6', icon: '🏠' },
  { id: 'utilities', kind: 'expense', color: '#f59e0b', icon: '💡' },
  { id: 'subscriptions', kind: 'expense', color: '#ec4899', icon: '🔁' },
  { id: 'health', kind: 'expense', color: '#ef4444', icon: '💊' },
  { id: 'shopping', kind: 'expense', color: '#3b82f6', icon: '🛍️' },
  { id: 'leisure', kind: 'expense', color: '#a855f7', icon: '🎬' },
  { id: 'travel', kind: 'expense', color: '#14b8a6', icon: '✈️' },
  { id: 'cash', kind: 'expense', color: '#a16207', icon: '💶' },
  { id: 'fees', kind: 'expense', color: '#78716c', icon: '🏦' },
  { id: 'other', kind: 'both', color: '#64748b', icon: '📦' },
  { id: 'salary', kind: 'income', color: '#84cc16', icon: '💼' },
  { id: 'otherIncome', kind: 'income', color: '#06b6d4', icon: '➕' },
];

/** Colori delle categorie predefinite fino alla versione 3 del database: servono solo a rinnovare quelle mai cambiate. */
export const LEGACY_CATEGORY_COLORS: Record<string, string> = {
  groceries: '#34c759',
  restaurants: '#ff9500',
  transport: '#5ac8fa',
  fuel: '#8e8e93',
  rent: '#af52de',
  utilities: '#ffcc00',
  subscriptions: '#ff2d55',
  health: '#ff6b6b',
  shopping: '#0a84ff',
  leisure: '#bf5af2',
  travel: '#64d2ff',
  cash: '#a2845e',
  fees: '#636366',
  other: '#98989d',
  salary: '#30d158',
  otherIncome: '#66d4cf',
};

export const DEFAULT_CATEGORIES: Category[] = SEEDS.map((s) => ({ ...s, builtin: true }));

const RULE_SEEDS: Array<[string, string[]]> = [
  [
    'groceries',
    [
      'esselunga',
      'coop',
      'conad',
      'carrefour',
      'lidl',
      'eurospin',
      'supermercato',
      'mercadona',
      'spesa',
      'auchan',
      'pingo',
      'continente',
      'corte ingles',
    ],
  ],
  [
    'restaurants',
    [
      'ristorante',
      'pizzeria',
      'trattoria',
      'osteria',
      'mcdonald',
      'bar ',
      'restaurante',
      'cena',
      'pranzo',
      'drink',
      'birra',
      'birre',
      'spritz',
      'gelato',
      'sushi',
      'aperitivo',
      'coca cola',
    ],
  ],
  ['transport', ['trenitalia', 'italo', 'atm ', 'metro', 'taxi', 'uber', 'flixbus', 'bolt']],
  ['fuel', ['eni station', 'q8', 'tamoil', 'ip station', 'benzina', 'carburante']],
  ['rent', ['affitto', 'locazione', 'alquiler']],
  [
    'utilities',
    ['enel', 'a2a', 'hera', 'vodafone', 'tim ', 'wind tre', 'iliad', 'bolletta', 'bollette'],
  ],
  ['subscriptions', ['netflix', 'spotify', 'disney', 'prime video', 'icloud', 'youtube premium']],
  ['health', ['farmacia', 'ospedale', 'medico', 'dentista', 'visita']],
  ['shopping', ['amazon', 'zara', 'h&m', 'ikea', 'zalando', 'tabacco']],
  ['leisure', ['cinema', 'teatro', 'steam', 'playstation', 'eurobet', 'palestra', 'giochi']],
  ['salary', ['stipendio', 'emolumenti', 'salario', 'nomina']],
  ['cash', ['prelievo', 'bancomat atm', 'reintegro']],
  ['fees', ['commissioni', 'canone conto', 'imposta di bollo']],
];

export const DEFAULT_RULES: Rule[] = RULE_SEEDS.flatMap(([categoryId, patterns]) =>
  patterns.map((pattern) => ({
    id: `seed-${categoryId}-${pattern.trim().replace(/\W+/g, '_')}`,
    pattern,
    categoryId,
    origin: 'user' as const,
  })),
);
