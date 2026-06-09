'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/lib/useCategories'
import { Profile, Transaction } from '@/lib/types'

interface Props {
  onClose: () => void
  onSuccess: () => void
  householdId: string
  userId: string
  transaction?: Transaction
}

export default function AddTransactionModal({ onClose, onSuccess, householdId, userId, transaction }: Props) {
  const editing = !!transaction
  const [type, setType] = useState<'expense' | 'income'>(transaction?.type ?? 'expense')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [date, setDate] = useState(transaction?.date ?? new Date().toISOString().split('T')[0])
  const [selectedUserId, setSelectedUserId] = useState(transaction?.user_id ?? userId)
  const [members, setMembers] = useState<Profile[]>([])
  const [shared, setShared] = useState(transaction?.shared ?? false)
  const [reimbursable, setReimbursable] = useState(transaction?.reimbursement_amount != null)
  const [reimbursementAmount, setReimbursementAmount] = useState(
    transaction?.reimbursement_amount != null ? String(transaction.reimbursement_amount) : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const newCategoryInputRef = useRef<HTMLInputElement>(null)
  const isFirstRender = useRef(true)

  const { categories, refetch } = useCategories(householdId, type)
  const [category, setCategory] = useState(transaction?.category ?? '')

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
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setCategory('')
    setShared(false)
    setReimbursable(false)
    setReimbursementAmount('')
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
    const reimbNum = reimbursable ? parseFloat(reimbursementAmount) : null
    if (reimbursable && (isNaN(reimbNum!) || reimbNum! <= 0 || reimbNum! >= amountNum)) {
      setError('Reimbursement must be greater than 0 and less than the total amount')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      user_id: selectedUserId,
      amount: amountNum,
      type,
      category,
      description: description.trim() || null,
      date,
      shared: type === 'expense' ? shared : false,
      reimbursement_amount: type === 'expense' ? (reimbNum ?? null) : null,
    }

    const { error: err } = editing
      ? await supabase.from('transactions').update(payload).eq('id', transaction!.id)
      : await supabase.from('transactions').insert({
          ...payload,
          household_id: householdId,
          reimbursement_received: false,
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
          <h2 className="text-lg font-semibold text-slate-900">
            {editing ? 'Edit transaction' : 'Add transaction'}
          </h2>
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

          {/* Reimbursement — expenses only */}
          {type === 'expense' && (
            <div>
              <button
                type="button"
                onClick={() => { setReimbursable((r) => !r); setReimbursementAmount('') }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                  reimbursable
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                  </svg>
                  <span className="text-sm font-medium">Friends will pay me back</span>
                </div>
                <div className={`w-9 h-5 rounded-full transition-colors relative ${reimbursable ? 'bg-amber-500' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${reimbursable ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>

              {reimbursable && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Amount they owe you (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={reimbursementAmount}
                      onChange={(e) => setReimbursementAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      autoFocus
                    />
                  </div>
                  {amount && reimbursementAmount && (
                    <div className="text-right shrink-0 mt-4">
                      <p className="text-xs text-slate-400">Your net cost</p>
                      <p className="text-sm font-semibold text-slate-700">
                        €{(parseFloat(amount) - parseFloat(reimbursementAmount)).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-rose-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || addingCategory || !category}
            className={`w-full text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition-colors ${
              type === 'expense' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {loading ? (editing ? 'Saving...' : 'Adding...') : (editing ? 'Save changes' : `Add ${type}`)}
          </button>
        </form>
      </div>
    </div>
  )
}
