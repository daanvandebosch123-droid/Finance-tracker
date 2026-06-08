export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Transport',
  'Housing',
  'Entertainment',
  'Shopping',
  'Health',
  'Utilities',
  'Other',
]

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Other']

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': 'bg-orange-100 text-orange-700',
  Transport: 'bg-blue-100 text-blue-700',
  Housing: 'bg-purple-100 text-purple-700',
  Entertainment: 'bg-pink-100 text-pink-700',
  Shopping: 'bg-yellow-100 text-yellow-700',
  Health: 'bg-green-100 text-green-700',
  Utilities: 'bg-slate-100 text-slate-700',
  Salary: 'bg-emerald-100 text-emerald-700',
  Freelance: 'bg-teal-100 text-teal-700',
  Gift: 'bg-indigo-100 text-indigo-700',
  Other: 'bg-slate-100 text-slate-700',
}

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function fmt(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount)
}
