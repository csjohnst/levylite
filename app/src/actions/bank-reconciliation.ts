'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createTransaction } from './transactions'
import type { TransactionFormData } from './transactions'

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' as const }
  return { user, supabase }
}

/**
 * Parse a CSV string into bank statement lines.
 * Handles common Australian bank formats:
 * - Dates as DD/MM/YYYY or YYYY-MM-DD
 * - Amounts with commas (e.g. 1,234.56)
 * - Expected columns: Date, Description, Debit, Credit, Balance
 */
function parseBankCSV(csvText: string): {
  lines: { line_date: string; description: string; debit_amount: number; credit_amount: number; running_balance: number | null }[]
  openingBalance: number | null
  closingBalance: number | null
} {
  const rows = csvText.trim().split('\n').map(r => r.trim()).filter(r => r.length > 0)
  if (rows.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row')
  }

  // Parse header to find column indices
  const header = parseCSVRow(rows[0]).map(h => h.toLowerCase().trim())
  const dateIdx = header.findIndex(h => h.includes('date'))
  const descIdx = header.findIndex(h => h.includes('description') || h.includes('narrative') || h.includes('details'))
  const debitIdx = header.findIndex(h => h.includes('debit') || h.includes('withdrawal'))
  const creditIdx = header.findIndex(h => h.includes('credit') || h.includes('deposit'))
  const balanceIdx = header.findIndex(h => h.includes('balance'))

  if (dateIdx === -1) throw new Error('CSV must have a Date column')
  if (descIdx === -1) throw new Error('CSV must have a Description column')
  if (debitIdx === -1 && creditIdx === -1) throw new Error('CSV must have Debit and/or Credit columns')

  const lines: { line_date: string; description: string; debit_amount: number; credit_amount: number; running_balance: number | null }[] = []

  for (let i = 1; i < rows.length; i++) {
    const cols = parseCSVRow(rows[i])
    if (cols.length <= dateIdx) continue // skip empty rows

    const dateStr = cols[dateIdx]?.trim()
    if (!dateStr) continue

    const parsedDate = parseAustralianDate(dateStr)
    if (!parsedDate) continue // skip unparseable rows

    lines.push({
      line_date: parsedDate,
      description: cols[descIdx]?.trim() ?? '',
      debit_amount: debitIdx >= 0 ? parseAmount(cols[debitIdx]) : 0,
      credit_amount: creditIdx >= 0 ? parseAmount(cols[creditIdx]) : 0,
      running_balance: balanceIdx >= 0 ? parseAmount(cols[balanceIdx]) : null,
    })
  }

  // Determine opening/closing balance from first/last lines
  const openingBalance = lines.length > 0 && lines[0].running_balance !== null
    ? lines[0].running_balance - lines[0].credit_amount + lines[0].debit_amount
    : null
  const closingBalance = lines.length > 0 ? lines[lines.length - 1].running_balance : null

  return { lines, openingBalance, closingBalance }
}

/** Parse a single CSV row, handling quoted fields */
function parseCSVRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const ch = row[i]
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/** Parse DD/MM/YYYY or YYYY-MM-DD into YYYY-MM-DD */
function parseAustralianDate(dateStr: string): string | null {
  // Try DD/MM/YYYY
  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  // Try YYYY-MM-DD
  const isoDate = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDate) return dateStr
  return null
}

/** Parse an amount string, removing commas and handling negatives */
function parseAmount(str: string | undefined): number {
  if (!str) return 0
  const cleaned = str.trim().replace(/[$,]/g, '').replace(/\((.+)\)/, '-$1')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : Math.round(Math.abs(val) * 100) / 100
}

/**
 * Upload and parse a bank statement CSV.
 */
export async function uploadBankStatement(
  schemeId: string,
  fundType: 'admin' | 'capital_works',
  statementDate: string,
  csvText: string,
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  // Parse CSV
  let parsed: ReturnType<typeof parseBankCSV>
  try {
    parsed = parseBankCSV(csvText)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to parse CSV' }
  }

  if (parsed.lines.length === 0) {
    return { error: 'No valid lines found in CSV' }
  }

  // Create bank_statement record
  const { data: statement, error: stmtError } = await supabase
    .from('bank_statements')
    .insert({
      scheme_id: schemeId,
      fund_type: fundType,
      statement_date: statementDate,
      opening_balance: parsed.openingBalance ?? 0,
      closing_balance: parsed.closingBalance ?? 0,
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (stmtError) return { error: stmtError.message }

  // Insert bank_statement_lines
  const lines = parsed.lines.map(line => ({
    bank_statement_id: statement.id,
    ...line,
  }))

  const { error: linesError } = await supabase
    .from('bank_statement_lines')
    .insert(lines)

  if (linesError) return { error: `Statement created but lines failed: ${linesError.message}` }

  revalidatePath(`/schemes/${schemeId}/trust-accounting/reconciliation`)
  return {
    data: {
      statement,
      linesImported: parsed.lines.length,
      openingBalance: parsed.openingBalance,
      closingBalance: parsed.closingBalance,
    },
  }
}

/**
 * List all uploaded bank statements for a scheme.
 */
export async function getBankStatements(schemeId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: statements, error } = await supabase
    .from('bank_statements')
    .select(`
      *,
      bank_statement_lines(count),
      reconciliations(id, status, reconciled_at)
    `)
    .eq('scheme_id', schemeId)
    .order('statement_date', { ascending: false })

  if (error) return { error: error.message }
  return { data: statements }
}

/**
 * Get a single bank statement with all its lines and match status.
 */
export async function getBankStatement(id: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: statement, error } = await supabase
    .from('bank_statements')
    .select(`
      *,
      bank_statement_lines(
        *,
        transactions:matched_transaction_id(id, transaction_date, description, amount, reference, transaction_type)
      ),
      reconciliations(id, status, reconciled_at, bank_balance, ledger_balance)
    `)
    .eq('id', id)
    .single()

  if (error) return { error: error.message }
  return { data: statement }
}

/**
 * Auto-match bank lines to unreconciled transactions.
 * Algorithm: exact amount match + date within +/- 3 days + reference substring.
 */
export async function autoMatchBankLines(bankStatementId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Get the statement and its unmatched lines
  const { data: statement, error: stmtError } = await supabase
    .from('bank_statements')
    .select('scheme_id, fund_type')
    .eq('id', bankStatementId)
    .single()

  if (stmtError) return { error: stmtError.message }

  const { data: unmatchedLines, error: linesError } = await supabase
    .from('bank_statement_lines')
    .select('*')
    .eq('bank_statement_id', bankStatementId)
    .eq('matched', false)

  if (linesError) return { error: linesError.message }
  if (!unmatchedLines || unmatchedLines.length === 0) {
    return { data: { autoMatched: 0, unmatched: 0 } }
  }

  // Get unreconciled transactions for this scheme + fund
  const { data: unreconciledTxns, error: txnError } = await supabase
    .from('transactions')
    .select('id, transaction_date, amount, reference, description, transaction_type')
    .eq('scheme_id', statement.scheme_id)
    .eq('fund_type', statement.fund_type)
    .eq('is_reconciled', false)
    .is('deleted_at', null)

  if (txnError) return { error: txnError.message }

  // Track which transactions have already been matched
  const matchedTxnIds = new Set<string>()
  let autoMatched = 0

  for (const line of unmatchedLines) {
    // Amount to match: bank credits = receipts, bank debits = payments
    const lineAmount = line.credit_amount > 0 ? line.credit_amount : line.debit_amount
    if (lineAmount === 0) continue

    // Find candidate transactions with exact amount match
    const candidates = unreconciledTxns?.filter(txn => {
      if (matchedTxnIds.has(txn.id)) return false
      if (Math.round(txn.amount * 100) !== Math.round(lineAmount * 100)) return false
      // Credits should match receipts, debits should match payments
      if (line.credit_amount > 0 && txn.transaction_type !== 'receipt') return false
      if (line.debit_amount > 0 && txn.transaction_type !== 'payment') return false
      return true
    }) ?? []

    if (candidates.length === 0) continue

    // Score candidates: date proximity + reference match
    let bestMatch = candidates[0]
    let bestScore = 0

    for (const candidate of candidates) {
      let score = 1 // base score for amount match
      // Date proximity: +2 if within 3 days
      const lineDate = new Date(line.line_date)
      const txnDate = new Date(candidate.transaction_date)
      const daysDiff = Math.abs((lineDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff <= 3) score += 2
      if (daysDiff === 0) score += 1

      // Reference/description match
      const lineDesc = (line.description ?? '').toLowerCase()
      const txnRef = (candidate.reference ?? '').toLowerCase()
      const txnDesc = (candidate.description ?? '').toLowerCase()
      if (txnRef && lineDesc.includes(txnRef)) score += 3
      if (txnDesc && lineDesc.includes(txnDesc)) score += 1

      if (score > bestScore) {
        bestScore = score
        bestMatch = candidate
      }
    }

    // Only auto-match if we have a reasonable confidence (amount match + at least date proximity)
    if (bestScore >= 3) {
      const { error: matchError } = await supabase
        .from('bank_statement_lines')
        .update({ matched: true, matched_transaction_id: bestMatch.id })
        .eq('id', line.id)

      if (!matchError) {
        matchedTxnIds.add(bestMatch.id)
        autoMatched++
      }
    }
  }

  revalidatePath(`/schemes/${statement.scheme_id}/trust-accounting/reconciliation`)
  return {
    data: {
      autoMatched,
      unmatched: unmatchedLines.length - autoMatched,
      totalLines: unmatchedLines.length,
    },
  }
}

/**
 * Manually match a bank statement line to a transaction.
 */
export async function manualMatchBankLine(bankLineId: string, transactionId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Verify both belong to the same scheme
  const { data: line, error: lineError } = await supabase
    .from('bank_statement_lines')
    .select('bank_statement_id')
    .eq('id', bankLineId)
    .single()

  if (lineError) return { error: lineError.message }

  const { data: stmt, error: stmtError2 } = await supabase
    .from('bank_statements')
    .select('scheme_id')
    .eq('id', line.bank_statement_id)
    .single()

  if (stmtError2) return { error: stmtError2.message }

  const { data: txn, error: txnError } = await supabase
    .from('transactions')
    .select('scheme_id')
    .eq('id', transactionId)
    .single()

  if (txnError) return { error: txnError.message }

  if (stmt.scheme_id !== txn.scheme_id) {
    return { error: 'Bank line and transaction belong to different schemes' }
  }

  const { error } = await supabase
    .from('bank_statement_lines')
    .update({ matched: true, matched_transaction_id: transactionId })
    .eq('id', bankLineId)

  if (error) return { error: error.message }
  revalidatePath(`/schemes/${txn.scheme_id}/trust-accounting/reconciliation`)
  return { data: true }
}

/**
 * Remove a match from a bank statement line.
 */
export async function unmatchBankLine(bankLineId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { error } = await supabase
    .from('bank_statement_lines')
    .update({ matched: false, matched_transaction_id: null })
    .eq('id', bankLineId)

  if (error) return { error: error.message }
  return { data: true }
}

/**
 * Create a new transaction from an unmatched bank line and auto-match it.
 */
export async function createTransactionFromBankLine(
  bankLineId: string,
  transactionData: TransactionFormData,
) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  // Get the bank line and its scheme
  const { data: line, error: lineError } = await supabase
    .from('bank_statement_lines')
    .select('bank_statement_id')
    .eq('id', bankLineId)
    .single()

  if (lineError) return { error: lineError.message }

  const { data: lineStmt, error: lineStmtError } = await supabase
    .from('bank_statements')
    .select('scheme_id')
    .eq('id', line.bank_statement_id)
    .single()

  if (lineStmtError) return { error: lineStmtError.message }
  const schemeId = lineStmt.scheme_id

  // Create the transaction using existing action
  const txnResult = await createTransaction(schemeId, transactionData)
  if ('error' in txnResult && txnResult.error) return { error: txnResult.error }
  if (!txnResult.data) return { error: 'Failed to create transaction' }

  // Auto-match the bank line to the new transaction
  const { error: matchError } = await supabase
    .from('bank_statement_lines')
    .update({ matched: true, matched_transaction_id: txnResult.data.id })
    .eq('id', bankLineId)

  if (matchError) {
    return { error: `Transaction created but matching failed: ${matchError.message}`, data: txnResult.data }
  }

  revalidatePath(`/schemes/${schemeId}/trust-accounting/reconciliation`)
  return { data: txnResult.data }
}

/**
 * Finalize a reconciliation:
 * 1. Validate all lines are resolved (matched or zero-amount)
 * 2. Calculate adjusted bank balance
 * 3. Create reconciliations record
 * 4. Mark matched transactions as is_reconciled=true
 */
export async function finalizeReconciliation(bankStatementId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase, user } = result as Exclude<typeof result, { error: string }>

  // Get statement details
  const { data: statement, error: stmtError } = await supabase
    .from('bank_statements')
    .select('*')
    .eq('id', bankStatementId)
    .single()

  if (stmtError) return { error: stmtError.message }

  // Get all lines
  const { data: allLines, error: linesError } = await supabase
    .from('bank_statement_lines')
    .select('*')
    .eq('bank_statement_id', bankStatementId)

  if (linesError) return { error: linesError.message }

  // Separate matched and unmatched
  const matchedLines = allLines?.filter(l => l.matched) ?? []
  const unmatchedLines = allLines?.filter(l => !l.matched) ?? []

  if (unmatchedLines.length > 0) {
    return { error: `Cannot finalize: ${unmatchedLines.length} unmatched bank line(s) remain. Match or remove them first.` }
  }

  // Get the ledger balance for this scheme + fund (sum of transaction_lines for trust account)
  const trustCode = statement.fund_type === 'admin' ? '1100' : '1200'

  const { data: trustAccount, error: trustError } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('code', trustCode)
    .or(`scheme_id.eq.${statement.scheme_id},scheme_id.is.null`)
    .order('scheme_id', { ascending: true, nullsFirst: false })
    .limit(1)
    .single()

  if (trustError) return { error: `Trust account ${trustCode} not found` }

  // Calculate ledger balance: SUM(debits) - SUM(credits) for the trust account
  const { data: ledgerLines, error: ledgerError } = await supabase
    .from('transaction_lines')
    .select(`
      line_type, amount,
      transactions!inner(scheme_id, fund_type, deleted_at)
    `)
    .eq('account_id', trustAccount.id)
    .eq('transactions.scheme_id', statement.scheme_id)
    .is('transactions.deleted_at', null)

  if (ledgerError) return { error: ledgerError.message }

  let ledgerBalance = 0
  ledgerLines?.forEach(line => {
    if (line.line_type === 'debit') ledgerBalance += line.amount
    else ledgerBalance -= line.amount
  })
  ledgerBalance = Math.round(ledgerBalance * 100) / 100

  const bankBalance = statement.closing_balance

  // Calculate outstanding items (transactions not yet in bank)
  // Outstanding deposits: receipts that are unreconciled but in ledger
  // Outstanding withdrawals: payments that are unreconciled but in ledger
  const { data: outstandingTxns, error: outError } = await supabase
    .from('transactions')
    .select('transaction_type, amount')
    .eq('scheme_id', statement.scheme_id)
    .eq('fund_type', statement.fund_type)
    .eq('is_reconciled', false)
    .is('deleted_at', null)

  if (outError) return { error: outError.message }

  let outstandingDeposits = 0
  let outstandingWithdrawals = 0
  outstandingTxns?.forEach(txn => {
    if (txn.transaction_type === 'receipt') outstandingDeposits += txn.amount
    else if (txn.transaction_type === 'payment') outstandingWithdrawals += txn.amount
  })
  outstandingDeposits = Math.round(outstandingDeposits * 100) / 100
  outstandingWithdrawals = Math.round(outstandingWithdrawals * 100) / 100

  // Create reconciliation record
  const { data: reconciliation, error: reconError } = await supabase
    .from('reconciliations')
    .insert({
      bank_statement_id: bankStatementId,
      reconciled_by: user.id,
      bank_balance: bankBalance,
      ledger_balance: ledgerBalance,
      outstanding_deposits: outstandingDeposits,
      outstanding_withdrawals: outstandingWithdrawals,
      status: 'reconciled',
    })
    .select()
    .single()

  if (reconError) return { error: reconError.message }

  // Mark all matched transactions as reconciled
  const matchedTxnIds = matchedLines
    .map(l => l.matched_transaction_id)
    .filter((id): id is string => id !== null)

  if (matchedTxnIds.length > 0) {
    const { error: reconTxnError } = await supabase
      .from('transactions')
      .update({ is_reconciled: true })
      .in('id', matchedTxnIds)

    if (reconTxnError) {
      return { error: `Reconciliation created but failed to mark transactions: ${reconTxnError.message}` }
    }
  }

  revalidatePath(`/schemes/${statement.scheme_id}/trust-accounting/reconciliation`)
  revalidatePath(`/schemes/${statement.scheme_id}/trust-accounting`)
  return {
    data: {
      reconciliation,
      bankBalance,
      ledgerBalance,
      outstandingDeposits,
      outstandingWithdrawals,
      adjustedBankBalance: Math.round((bankBalance + outstandingDeposits - outstandingWithdrawals) * 100) / 100,
      transactionsReconciled: matchedTxnIds.length,
    },
  }
}

/**
 * Get reconciliation history for a scheme.
 */
export async function getReconciliationHistory(schemeId: string) {
  const result = await getAuth()
  if ('error' in result && !('supabase' in result)) return { error: result.error }
  const { supabase } = result as Exclude<typeof result, { error: string }>

  const { data: reconciliations, error } = await supabase
    .from('reconciliations')
    .select(`
      *,
      bank_statements!inner(id, scheme_id, fund_type, statement_date, opening_balance, closing_balance)
    `)
    .eq('bank_statements.scheme_id', schemeId)
    .order('reconciled_at', { ascending: false })

  if (error) return { error: error.message }
  return { data: reconciliations }
}
