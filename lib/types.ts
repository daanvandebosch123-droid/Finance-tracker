export interface Profile {
  id: string
  name: string
  household_id: string | null
  created_at: string
}

export interface Household {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface Transaction {
  id: string
  household_id: string
  user_id: string
  amount: number
  type: 'expense' | 'income'
  category: string
  description: string | null
  date: string
  created_at: string
  profiles?: { name: string } | null
}
