'use server'

import { createClient } from '@/lib/supabase/server'

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

export interface TrialBalanceRow {
  account_id: string
  code: string
  name: string
  account_type: string
  fund_type: string | null
  total_debits: number
  total_credits: number
  balance: number
}

export interface FundBalance {
  fund_type: 'admin' | 'capital_works'
  opening_balance: number
  total_receipts: number
  total_payments: number
  closing_balance: number
}

export interface IncomeStatementCategory {
  category_id: string
  code: string
  name: string
  fund_type: string | null
  total: number
}

export interface IncomeStatement {
  admin: {
    income: IncomeStatementCategory[]
    expenses: IncomeStatementCategory[]
    total_income: number
    total_expenses: number
    net: number
  }
  capital_works: {
    income: IncomeStatementCategory[]
    expenses: IncomeStatementCategory[]
    total_income: number
    total_expenses: number
    net: number
  }
  combined: {
    total_income: number
    total_expenses: number
    net: number
  }
}

/**
 * Trial Balance: for each account, SUM debits and credits from transaction_lines.
 * Verifies total debits = total credits.
 */
export async function getTrialBalance(schemeId: string, asAtDate?: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Get all transaction lines for this scheme's transactions
  let txnQuery = supabase
    .from('transactions')
    .select('id')
    .eq('scheme_id', schemeId)
    .is('deleted_at', null)

  if (asAtDate) {
    txnQuery = txnQuery.lte('transaction_date', asAtDate)
  }

  const { data: txns, error: txnError } = await txnQuery
  if (txnError) return { error: txnError.message }
  if (!txns || txns.length === 0) {
    return { data: { rows: [] as TrialBalanceRow[], totalDebits: 0, totalCredits: 0, isBalanced: true } }
  }

  const txnIds = txns.map(t => t.id)

  const { data: lines, error: linesError } = await supabase
    .from('transaction_lines')
    .select(`
      account_id, line_type, amount,
      chart_of_accounts:account_id(id, code, name, account_type, fund_type)
    `)
    .in('transaction_id', txnIds)

  if (linesError) return { error: linesError.message }

  // Aggregate by account
  const accountMap = new Map<string, TrialBalanceRow>()

  lines?.forEach(line => {
    const acct = line.chart_of_accounts as unknown as { id: string; code: string; name: string; account_type: string; fund_type: string | null }
    if (!acct) return

    if (!accountMap.has(acct.id)) {
      accountMap.set(acct.id, {
        account_id: acct.id,
        code: acct.code,
        name: acct.name,
        account_type: acct.account_type,
        fund_type: acct.fund_type,
        total_debits: 0,
        total_credits: 0,
        balance: 0,
      })
    }

    const row = accountMap.get(acct.id)!
    if (line.line_type === 'debit') {
      row.total_debits += line.amount
    } else {
      row.total_credits += line.amount
    }
  })

  // Calculate balances and round
  const rows = Array.from(accountMap.values())
    .map(row => ({
      ...row,
      total_debits: Math.round(row.total_debits * 100) / 100,
      total_credits: Math.round(row.total_credits * 100) / 100,
      balance: Math.round((row.total_debits - row.total_credits) * 100) / 100,
    }))
    .sort((a, b) => a.code.localeCompare(b.code))

  const totalDebits = Math.round(rows.reduce((sum, r) => sum + r.total_debits, 0) * 100) / 100
  const totalCredits = Math.round(rows.reduce((sum, r) => sum + r.total_credits, 0) * 100) / 100

  return {
    data: {
      rows,
      totalDebits,
      totalCredits,
      isBalanced: totalDebits === totalCredits,
    },
  }
}

/**
 * Fund Balance Summary: opening balance, receipts, payments, closing balance per fund.
 */
export async function getFundBalanceSummary(
  schemeId: string,
  dateRange?: { startDate: string; endDate: string },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Get opening balances from the current financial year
  const { data: currentFY } = await supabase
    .from('financial_years')
    .select('admin_opening_balance, capital_opening_balance')
    .eq('scheme_id', schemeId)
    .eq('is_current', true)
    .maybeSingle()

  const adminOpening = currentFY?.admin_opening_balance ?? 0
  const capitalOpening = currentFY?.capital_opening_balance ?? 0

  // Get transaction totals by fund_type and type
  let txnQuery = supabase
    .from('transactions')
    .select('transaction_type, fund_type, amount')
    .eq('scheme_id', schemeId)
    .is('deleted_at', null)

  if (dateRange?.startDate) {
    txnQuery = txnQuery.gte('transaction_date', dateRange.startDate)
  }
  if (dateRange?.endDate) {
    txnQuery = txnQuery.lte('transaction_date', dateRange.endDate)
  }

  const { data: txns, error: txnError } = await txnQuery
  if (txnError) return { error: txnError.message }

  const funds: Record<string, { receipts: number; payments: number }> = {
    admin: { receipts: 0, payments: 0 },
    capital_works: { receipts: 0, payments: 0 },
  }

  txns?.forEach(txn => {
    const fund = txn.fund_type as string
    if (txn.transaction_type === 'receipt') {
      funds[fund].receipts += txn.amount
    } else if (txn.transaction_type === 'payment') {
      funds[fund].payments += txn.amount
    }
  })

  const balances: FundBalance[] = [
    {
      fund_type: 'admin',
      opening_balance: adminOpening,
      total_receipts: Math.round(funds.admin.receipts * 100) / 100,
      total_payments: Math.round(funds.admin.payments * 100) / 100,
      closing_balance: Math.round((adminOpening + funds.admin.receipts - funds.admin.payments) * 100) / 100,
    },
    {
      fund_type: 'capital_works',
      opening_balance: capitalOpening,
      total_receipts: Math.round(funds.capital_works.receipts * 100) / 100,
      total_payments: Math.round(funds.capital_works.payments * 100) / 100,
      closing_balance: Math.round((capitalOpening + funds.capital_works.receipts - funds.capital_works.payments) * 100) / 100,
    },
  ]

  return { data: balances }
}

/**
 * Income Statement: income vs expenses grouped by category, split by fund.
 */
export async function getIncomeStatement(
  schemeId: string,
  dateRange: { startDate: string; endDate: string },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: txns, error: txnError } = await supabase
    .from('transactions')
    .select(`
      transaction_type, fund_type, amount,
      chart_of_accounts:category_id(id, code, name, fund_type)
    `)
    .eq('scheme_id', schemeId)
    .is('deleted_at', null)
    .in('transaction_type', ['receipt', 'payment'])
    .gte('transaction_date', dateRange.startDate)
    .lte('transaction_date', dateRange.endDate)

  if (txnError) return { error: txnError.message }

  // Group by category and fund_type
  const categoryMap = new Map<string, IncomeStatementCategory & { type: 'income' | 'expenses'; txn_fund: string }>()

  txns?.forEach(txn => {
    const acct = txn.chart_of_accounts as unknown as { id: string; code: string; name: string; fund_type: string | null }
    if (!acct) return

    const key = `${acct.id}-${txn.fund_type}`
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        category_id: acct.id,
        code: acct.code,
        name: acct.name,
        fund_type: acct.fund_type,
        total: 0,
        type: txn.transaction_type === 'receipt' ? 'income' : 'expenses',
        txn_fund: txn.fund_type,
      })
    }

    categoryMap.get(key)!.total += txn.amount
  })

  const categories = Array.from(categoryMap.values()).map(c => ({
    ...c,
    total: Math.round(c.total * 100) / 100,
  }))

  const buildFundSection = (fund: string) => {
    const income = categories
      .filter(c => c.type === 'income' && c.txn_fund === fund)
      .sort((a, b) => a.code.localeCompare(b.code))
    const expenses = categories
      .filter(c => c.type === 'expenses' && c.txn_fund === fund)
      .sort((a, b) => a.code.localeCompare(b.code))

    const totalIncome = Math.round(income.reduce((sum, c) => sum + c.total, 0) * 100) / 100
    const totalExpenses = Math.round(expenses.reduce((sum, c) => sum + c.total, 0) * 100) / 100

    return {
      income: income.map(({ type: _t, txn_fund: _f, ...rest }) => rest),
      expenses: expenses.map(({ type: _t, txn_fund: _f, ...rest }) => rest),
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net: Math.round((totalIncome - totalExpenses) * 100) / 100,
    }
  }

  const admin = buildFundSection('admin')
  const capitalWorks = buildFundSection('capital_works')

  const statement: IncomeStatement = {
    admin,
    capital_works: capitalWorks,
    combined: {
      total_income: Math.round((admin.total_income + capitalWorks.total_income) * 100) / 100,
      total_expenses: Math.round((admin.total_expenses + capitalWorks.total_expenses) * 100) / 100,
      net: Math.round((admin.net + capitalWorks.net) * 100) / 100,
    },
  }

  return { data: statement }
}

/**
 * Drill-down: get all transactions for a specific GL category.
 */
export async function getTransactionsByCategory(
  schemeId: string,
  categoryId: string,
  dateRange?: { startDate: string; endDate: string },
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  let query = supabase
    .from('transactions')
    .select(`
      *,
      chart_of_accounts:category_id(id, code, name),
      lots:lot_id(id, lot_number, unit_number)
    `)
    .eq('scheme_id', schemeId)
    .eq('category_id', categoryId)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })

  if (dateRange?.startDate) {
    query = query.gte('transaction_date', dateRange.startDate)
  }
  if (dateRange?.endDate) {
    query = query.lte('transaction_date', dateRange.endDate)
  }

  const { data: transactions, error } = await query

  if (error) return { error: error.message }

  const total = Math.round(
    (transactions?.reduce((sum, t) => sum + t.amount, 0) ?? 0) * 100,
  ) / 100

  return { data: { transactions, total } }
}

/**
 * Calculate the ledger balance for a specific fund's trust account.
 * SUM(debits) - SUM(credits) for account 1100 (admin) or 1200 (capital_works).
 */
export async function getLedgerBalance(
  schemeId: string,
  fundType: 'admin' | 'capital_works',
  asAtDate?: string,
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const trustCode = fundType === 'admin' ? '1100' : '1200'

  // Find the trust account
  const { data: trustAccount, error: trustError } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('code', trustCode)
    .or(`scheme_id.eq.${schemeId},scheme_id.is.null`)
    .order('scheme_id', { ascending: true, nullsFirst: false })
    .limit(1)
    .single()

  if (trustError) return { error: `Trust account ${trustCode} not found` }

  // Get transaction IDs in scope
  let txnQuery = supabase
    .from('transactions')
    .select('id')
    .eq('scheme_id', schemeId)
    .is('deleted_at', null)

  if (asAtDate) {
    txnQuery = txnQuery.lte('transaction_date', asAtDate)
  }

  const { data: txns, error: txnError } = await txnQuery
  if (txnError) return { error: txnError.message }

  if (!txns || txns.length === 0) {
    return { data: { balance: 0, trustAccountId: trustAccount.id } }
  }

  const txnIds = txns.map(t => t.id)

  const { data: lines, error: linesError } = await supabase
    .from('transaction_lines')
    .select('line_type, amount')
    .eq('account_id', trustAccount.id)
    .in('transaction_id', txnIds)

  if (linesError) return { error: linesError.message }

  let balance = 0
  lines?.forEach(line => {
    if (line.line_type === 'debit') balance += line.amount
    else balance -= line.amount
  })

  return {
    data: {
      balance: Math.round(balance * 100) / 100,
      trustAccountId: trustAccount.id,
    },
  }
}
