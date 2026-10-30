import type { Account, Category, Rule } from './types';

type CategorySeed = Pick<Category, 'id' | 'kind' | 'color' | 'icon'>;

const SEEDS: CategorySeed[] = [
  { id: 'groceries', kind: 'expense', color: '#34c759', icon: '🛒' },
  { id: 'restaurants', kind: 'expense', color: '#ff9500', icon: '🍽️' },
  { id: 'transport', kind: 'expense', color: '#5ac8fa', icon: '🚆' },
  { id: 'fuel', kind: 'expense', color: '#8e8e93', icon: '⛽' },
  { id: 'rent', kind: 'expense', color: '#af52de', icon: '🏠' },
  { id: 'utilities', kind: 'expense', color: '#ffcc00', icon: '💡' },
  { id: 'subscriptions', kind: 'expense', color: '#ff2d55', icon: '🔁' },
  { id: 'health', kind: 'expense', color: '#ff6b6b', icon: '💊' },
  { id: 'shopping', kind: 'expense', color: '#0a84ff', icon: '🛍️' },
  { id: 'leisure', kind: 'expense', color: '#bf5af2', icon: '🎬' },
  { id: 'travel', kind: 'expense', color: '#64d2ff', icon: '✈️' },
  { id: 'cash', kind: 'expense', color: '#a2845e', icon: '💶' },
  { id: 'fees', kind: 'expense', color: '#636366', icon: '🏦' },
  { id: 'other', kind: 'both', color: '#98989d', icon: '📦' },
  { id: 'salary', kind: 'income', color: '#30d158', icon: '💼' },
  { id: 'otherIncome', kind: 'income', color: '#66d4cf', icon: '➕' },
];

export const DEFAULT_CATEGORIES: Category[] = SEEDS.map((s) => ({ ...s, builtin: true }));

const RULE_SEEDS: Array<[string, string[]]> = [
  [
    'groceries',
    ['esselunga', 'coop', 'conad', 'carrefour', 'lidl', 'eurospin', 'supermercato', 'mercadona'],
  ],
  [
    'restaurants',
    ['ristorante', 'pizzeria', 'trattoria', 'osteria', 'mcdonald', 'bar ', 'restaurante'],
  ],
  ['transport', ['trenitalia', 'italo', 'atm ', 'metro', 'taxi', 'uber', 'flixbus']],
  ['fuel', ['eni station', 'q8', 'tamoil', 'ip station', 'benzina', 'carburante']],
  ['rent', ['affitto', 'locazione', 'alquiler']],
  ['utilities', ['enel', 'a2a', 'hera', 'vodafone', 'tim ', 'wind tre', 'iliad', 'bolletta']],
  ['subscriptions', ['netflix', 'spotify', 'disney', 'prime video', 'icloud', 'youtube premium']],
  ['health', ['farmacia', 'ospedale', 'medico', 'dentista']],
  ['shopping', ['amazon', 'zara', 'h&m', 'ikea', 'zalando']],
  ['leisure', ['cinema', 'teatro', 'steam', 'playstation']],
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

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'bbva', name: 'BBVA', bank: 'bbva' },
  { id: 'intesa', name: 'Intesa Sanpaolo', bank: 'intesa' },
];
