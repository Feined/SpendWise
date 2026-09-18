import {
  UtensilsCrossed,
  ShoppingBag,
  Car,
  Film,
  HeartPulse,
  Package
} from 'lucide-react';

export const CATEGORIES = [
  {
    id: 'food',
    name: 'Food',
    icon: UtensilsCrossed,
    emoji: '🍔',
    color: '#0d9488', // teal-600
    bgLight: 'bg-teal-50',
    borderLight: 'border-teal-200',
    textColor: 'text-teal-700',
    description: 'Groceries, dining out, food delivery, chai & coffee'
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: ShoppingBag,
    emoji: '🛍',
    color: '#0284c7', // sky-600
    bgLight: 'bg-sky-50',
    borderLight: 'border-sky-200',
    textColor: 'text-sky-700',
    description: 'Goods, clothes, Amazon orders, gadgets & household extras'
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: Car,
    emoji: '🚕',
    color: '#d97706', // amber-600
    bgLight: 'bg-amber-50',
    borderLight: 'border-amber-200',
    textColor: 'text-amber-700',
    description: 'Metro, fuel, auto-rickshaw, ride-hailing & transit'
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: Film,
    emoji: '🎬',
    color: '#9333ea', // purple-600
    bgLight: 'bg-purple-50',
    borderLight: 'border-purple-200',
    textColor: 'text-purple-700',
    description: 'Movies, outings, hobbies & events'
  },
  {
    id: 'health',
    name: 'Health',
    icon: HeartPulse,
    emoji: '💊',
    color: '#e11d48', // rose-600
    bgLight: 'bg-rose-50',
    borderLight: 'border-rose-200',
    textColor: 'text-rose-700',
    description: 'Pharmacy, personal wellness, doctor visits & care'
  },
  {
    id: 'other',
    name: 'Other',
    icon: Package,
    emoji: '📦',
    color: '#64748b', // slate-500
    bgLight: 'bg-slate-50',
    borderLight: 'border-slate-200',
    textColor: 'text-slate-700',
    description: 'Variable discretionary expenses that do not fit elsewhere'
  }
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat])
);

export function getCategoryById(id) {
  return CATEGORY_MAP[id] || CATEGORY_MAP.other;
}
