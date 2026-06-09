'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import AddTransactionModal from '@/components/AddTransactionModal'
import { Transaction } from '@/lib/types'
import { MONTHS, CATEGORY_COLORS, fmt } from '@/lib/constants'

type Filter = 'all' | 'expense' | 'income'

export default function TransactionsPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [fetching, setFetching] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && user && !profile?.household_id) router.replace('/setup')
  }, [user, profile, loading, router])

  const fetchData = useCallback(async () => {
    if (!profile?.household_id) return
    setFetching(true)

    const start = new Date(year, month, 1).toISOString().split('T')[0]
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0]

    const { data } = await supabase
      .from('transactions')
      .select('*, profiles(name)')
      .eq('household_id', profile.household_id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })

    if (data) setTransactions(data as Transaction[])
    setFetching(false)
  }, [profile, month, year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    setDeleting(null)
  }

  async function toggleReimbursement(t: Transaction) {
    const next = !t.reimbursement_received
    await supabase
      .from('transactions')
      .update({ reimbursement_received: next })
      .eq('id', t.id)
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === t.id ? { ...tx, reimbursement_received: next } : tx))
    )
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const filtered = transactions.filter((t) => filter === 'all' || t.type === filter)

  function effectiveNet(txns: Transaction[]) {
    return txns.reduce((sum, t) => {
      if (t.type === 'expense') {
        const eff = t.reimbursement_received && t.reimbursement_amount
          ? t.amount - t.reimbursement_amount
          : t.amount
        return sum - eff
      }
      return sum + t.amount
    }, 0)
  }

  const totalShown = effectiveNet(filtered)

  const personalByUser = new Map<string, { name: string; txns: Transaction[] }>()
  const sharedTxns: Transaction[] = []
  for (const t of filtered) {
    if (t.shared) {
      sharedTxns.push(t)
    } else {
      if (!personalByUser.has(t.user_id)) {
        personalByUser.set(t.user_id, {
          name: (t.profiles as { name: string } | null)?.name ?? 'Unknown',
          txns: [],
        })
      }
      personalByUser.get(t.user_id)!.txns.push(t)
    }
  }
  const userOrder = [user!.id, ...Array.from(personalByUser.keys()).filter((id) => id !== user!.id)]
  const sections: { label: string; txns: Transaction[] }[] = [
    ...userOrder.flatMap((uid) => {
      const entry = personalByUser.get(uid)
      return entry ? [{ label: entry.name, txns: entry.txns }] : []
    }),
    ...(sharedTxns.length > 0 ? [{ label: 'Shared', txns: sharedTxns }] : []),
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-8 pb-24 sm:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Transactions</h1>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-400 hover:text-slate-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[110px] sm:min-w-[130px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-400 hover:text-slate-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex border border-slate-200 rounded-lg p-1 bg-white w-fit">
            {(['all', 'expense', 'income'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 sm:px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  filter === f ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {filtered.length > 0 && (
            <span
              className={`text-sm font-semibold ${
                totalShown >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}
            >
              {totalShown >= 0 ? '+' : ''}
              {fmt(totalShown)}
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {fetching ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-500">No transactions found</p>
              <p className="text-xs text-slate-400 mt-1">Tap + to add one</p>
            </div>
          ) : (
            <div>
              {sections.map(({ label, txns }, si) => {
                const net = effectiveNet(txns)
                return (
                  <div key={label} className={si > 0 ? 'border-t border-slate-200' : ''}>
                    <div className="px-4 sm:px-5 py-2 bg-slate-50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
                      <span className={`text-xs font-semibold ${net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {net >= 0 ? '+' : ''}{fmt(net)}
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {txns.map((t) => (
                        <div
                          key={t.id}
                          className="px-4 sm:px-5 py-3.5 group hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                                  CATEGORY_COLORS[t.category] ?? 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {t.category}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm text-slate-800 truncate">
                                  {t.description || t.category}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {new Date(t.date).toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <span
                                className={`text-sm font-semibold ${
                                  t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                                }`}
                              >
                                {t.type === 'income' ? '+' : '-'}
                                {fmt(t.amount)}
                              </span>
                              <button
                                onClick={() => handleDelete(t.id)}
                                disabled={deleting === t.id}
                                className="sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all disabled:opacity-50"
                              >
                                {deleting === t.id ? (
                                  <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Reimbursement row */}
                          {t.reimbursement_amount != null && (
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                                </svg>
                                <span className={`text-xs ${t.reimbursement_received ? 'text-emerald-600 line-through' : 'text-amber-600'}`}>
                                  {fmt(t.reimbursement_amount)} back from friends
                                </span>
                                {!t.reimbursement_received && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                                    pending
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => toggleReimbursement(t)}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                  t.reimbursement_received
                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                }`}
                              >
                                {t.reimbursement_received ? '✓ Received' : 'Mark received'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-10"
      >
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <AddTransactionModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            fetchData()
          }}
          householdId={profile!.household_id!}
          userId={user!.id}
        />
      )}
    </div>
  )
}
