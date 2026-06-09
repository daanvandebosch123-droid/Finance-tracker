'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Navbar from '@/components/Navbar'
import AddTransactionModal from '@/components/AddTransactionModal'
import { Transaction, Profile } from '@/lib/types'
import { MONTHS, CATEGORY_COLORS, fmt } from '@/lib/constants'

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [fetching, setFetching] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
    if (!loading && user && !profile?.household_id) router.replace('/setup')
  }, [user, profile, loading, router])

  const fetchData = useCallback(async () => {
    if (!profile?.household_id) return
    setFetching(true)

    const start = new Date(year, month, 1).toISOString().split('T')[0]
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0]

    const [txnRes, membersRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, profiles(name)')
        .eq('household_id', profile.household_id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false }),
      supabase
        .from('profiles')
        .select('*')
        .eq('household_id', profile.household_id),
    ])

    if (txnRes.data) setTransactions(txnRes.data as Transaction[])
    if (membersRes.data) setMembers(membersRes.data as Profile[])
    setFetching(false)
  }, [profile, month, year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const expenses = transactions.filter((t) => t.type === 'expense')
  const personalExpenses = expenses.filter((t) => !t.shared)
  const sharedExpenses = expenses.filter((t) => t.shared)

  function effectiveAmount(t: Transaction) {
    return t.reimbursement_received && t.reimbursement_amount
      ? t.amount - t.reimbursement_amount
      : t.amount
  }

  const totalShared = sharedExpenses.reduce((sum, t) => sum + effectiveAmount(t), 0)
  const totalExpenses = expenses.reduce((sum, t) => sum + effectiveAmount(t), 0)
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const net = totalIncome - totalExpenses

  const pendingReimbursements = expenses.filter(
    (t) => t.reimbursement_amount != null && !t.reimbursement_received
  )
  const totalPendingReimbursement = pendingReimbursements.reduce(
    (sum, t) => sum + (t.reimbursement_amount ?? 0),
    0
  )

  const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + effectiveAmount(t)
    return acc
  }, {})
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

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
        {/* Month selector */}
        <div className="flex items-center justify-between mb-5 sm:mb-8">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-400 hover:text-slate-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-400 hover:text-slate-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl p-3 sm:p-5 border border-slate-200 shadow-sm">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 sm:mb-2">Income</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600">{fmt(totalIncome)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-5 border border-slate-200 shadow-sm">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 sm:mb-2">Expenses</p>
            <p className="text-lg sm:text-2xl font-bold text-rose-500">{fmt(totalExpenses)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-5 border border-slate-200 shadow-sm">
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 sm:mb-2">Net</p>
            <p className={`text-lg sm:text-2xl font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {fmt(net)}
            </p>
          </div>
        </div>

        {/* Pending reimbursements banner */}
        {totalPendingReimbursement > 0 && (
          <button
            onClick={() => router.push('/transactions')}
            className="w-full flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 sm:mb-5 hover:bg-amber-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
              </svg>
              <div className="text-left">
                <p className="text-sm font-medium text-amber-800">
                  Friends owe you {fmt(totalPendingReimbursement)}
                </p>
                <p className="text-xs text-amber-600">
                  {pendingReimbursements.length} pending reimbursement{pendingReimbursements.length !== 1 ? 's' : ''} · tap to mark received
                </p>
              </div>
            </div>
            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Spending per person */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-700 mb-4">Spent by</p>
            {totalExpenses === 0 ? (
              <p className="text-sm text-slate-400">No expenses this month</p>
            ) : (
              <div className="space-y-3">
                {members.map((m) => {
                  const spent = personalExpenses.filter((t) => t.user_id === m.id).reduce((sum, t) => sum + effectiveAmount(t), 0)
                  const pct = totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0
                  return (
                    <div key={m.id}>
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-slate-600">{m.name}</span>
                        <span className="font-medium text-slate-800">{fmt(spent)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {totalShared > 0 && (
                  <div>
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="flex items-center gap-1.5 text-slate-600">
                        Shared
                        <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium">
                          {sharedExpenses.length}
                        </span>
                      </span>
                      <span className="font-medium text-slate-800">{fmt(totalShared)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-indigo-300 h-1.5 rounded-full"
                        style={{ width: `${(totalShared / totalExpenses) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {members.length < 2 && (
                  <p className="text-xs text-slate-400 mt-1">Waiting for partner to join</p>
                )}
              </div>
            )}
          </div>

          {/* Top categories */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-700 mb-4">Top categories</p>
            {topCategories.length === 0 ? (
              <p className="text-sm text-slate-400">No expenses yet</p>
            ) : (
              <div className="space-y-3">
                {topCategories.slice(0, 4).map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {cat}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{fmt(amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700">Recent transactions</p>
            <button
              onClick={() => router.push('/transactions')}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              View all
            </button>
          </div>
          {fetching ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-500">No transactions this month</p>
              <p className="text-xs text-slate-400 mt-1">Tap + to add your first one</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 sm:px-5 py-3.5">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        CATEGORY_COLORS[t.category] ?? 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t.category}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-slate-800 truncate">
                          {t.description || t.category}
                        </p>
                        {t.shared && (
                          <span className="text-xs px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-medium shrink-0">
                            shared
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {(t.profiles as { name: string } | null)?.name} ·{' '}
                        {new Date(t.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold shrink-0 ml-3 ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                    {fmt(t.amount)}
                  </span>
                </div>
              ))}
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
