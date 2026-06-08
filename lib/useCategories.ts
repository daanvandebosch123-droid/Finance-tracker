import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from './constants'

export function useCategories(householdId: string | null | undefined, type: 'expense' | 'income') {
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!householdId) return
    setLoading(true)

    const defaults = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

    const [hiddenRes, customRes] = await Promise.all([
      supabase
        .from('hidden_categories')
        .select('name')
        .eq('household_id', householdId)
        .eq('type', type),
      supabase
        .from('categories')
        .select('name')
        .eq('household_id', householdId)
        .eq('type', type)
        .order('name'),
    ])

    const hidden = new Set(hiddenRes.data?.map((h) => h.name) ?? [])
    const custom = customRes.data?.map((c) => c.name) ?? []

    setCategories([
      ...defaults.filter((c) => !hidden.has(c)),
      ...custom.filter((c) => !defaults.includes(c)),
    ])
    setLoading(false)
  }, [householdId, type])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { categories, loading, refetch: fetch }
}
