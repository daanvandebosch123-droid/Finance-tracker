'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/lib/useCategories'
import { Profile } from '@/lib/types'

interface Props {
  onClose: () => void
  onSuccess: () => void
  householdId: string
  userId: string
}

export default function AddTransactionModal({ onClose, onSuccess, householdId, userId }: Props) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedUserId, setSelectedUserId] = useState(userId)
  const [members, setMembers] = useState<Profile[]>([])
  const [shared, setShared] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const newCategoryInputRef = useRef<HTMLInputElement>(null)

  const { categories, refetch } = useCategories(householdId, type)
  const [category, setCategory] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('household_id', householdId)
      .then(({ data }) => { if (data) setMembers(data as Profile[]) })
  }, [householdId])

  useEffect(() => {
    if (categories.length > 0 && !category) setCategory(categories[0])
  }, [categories, category])

  useEffect(() => {
    setCategory('')
    setShared(false)
    setAddingCategory(false)
    setNewCategoryName('')
  }, [type])

  useEffect(() => {
    if (addingCategory) newCategoryInputRef.current?.focus()
  }, [addingCategory])

  function handleCategorySelect(value: string) {
    if (value === '__new__') {
      setAddingCategory(true)
    } else {
      setCategory(value)
    }
  }

  async function confirmNewCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    await supabase.from('categories').upsert(
      { household_id: householdId, name, type },
      { onConflict: 'household_id,name,type' }
    )
    await refetch()
    setCategory(name)
    setAddingCategory(false)
    setNewCategoryName('')
  }

  function cancelNewCategory() {
    setAddingCategory(false)
    setNewCategoryName('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('transactions').insert({
      household_id: householdId,
      user_id: selectedUserId,
      amount: amountNum,
      type,
      category,
      description: description.trim() || null,
      date,
      shared: type === 'expense' ? shared : false,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Add transaction</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Expense / Income toggle */}
        <div className="flex border border-slate-200 rounded-lg p-1 mb-5">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              type === 'expense' ? 'bg-rose-500 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              type === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Income
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Paid by */}
          {members.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Paid by</label>
              <div className="flex border border-slate-200 rounded-lg p-1">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedUserId(m.id)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      selectedUserId === m.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.id === userId ? `${m.name} (you)` : m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (€)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            {addingCategory ? (
              <div className="flex gap-2">
                <input
                  ref={newCategoryInputRef}
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); confirmNewCategory() }
                    if (e.key === 'Escape') cancelNewCategory()
                  }}
                  placeholder="Category name"
                  className="flex-1 border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={confirmNewCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={cancelNewCategory}
                  className="px-3 py-2 text-slate-500 rounded-lg text-sm hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <select
                value={category}
                onChange={(e) => handleCategorySelect(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option disabled>──────────</option>
                <option value="__new__">+ New category...</option>
              </select>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Groceries at Albert Heijn"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Shared toggle — expenses only */}
          {type === 'expense' && (
            <button
              type="button"
              onClick={() => setShared((s) => !s)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                shared
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Shared expense</span>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${shared ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${shared ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          )}

          {error && <p className="text-rose-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || addingCategory || !category}
            className={`w-full text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition-colors ${
              type === 'expense' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {loading ? 'Adding...' : `Add ${type}`}
          </button>
        </form>
      </div>
    </div>
  )
}
