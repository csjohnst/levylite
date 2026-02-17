'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { uploadBankStatement } from '@/actions/bank-reconciliation'

interface BankStatementUploadProps {
  schemeId: string
  onSuccess?: () => void
}

interface PreviewLine {
  date: string
  description: string
  debit: string
  credit: string
  balance: string
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function BankStatementUpload({ schemeId, onSuccess }: BankStatementUploadProps) {
  const router = useRouter()
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fundType, setFundType] = useState<'admin' | 'capital_works'>('admin')
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0])
  const [preview, setPreview] = useState<PreviewLine[]>([])
  const [loading, setLoading] = useState(false)
  const [totalRows, setTotalRows] = useState(0)

  const parsePreview = useCallback((text: string) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) {
      setPreview([])
      setTotalRows(0)
      return
    }

    setTotalRows(lines.length - 1)

    // Parse first 10 data rows for preview
    const dataRows = lines.slice(1).filter(l => l.trim()).slice(0, 10)
    const headerFields = lines[0].split(',').map(h => h.trim().toLowerCase())

    const previewLines: PreviewLine[] = dataRows.map(row => {
      const fields = row.split(',').map(f => f.replace(/"/g, '').trim())
      const dateIdx = headerFields.findIndex(h => h.includes('date'))
      const descIdx = headerFields.findIndex(h => h.includes('description') || h.includes('narrative') || h.includes('details'))
      const debitIdx = headerFields.findIndex(h => h.includes('debit') || h.includes('withdrawal'))
      const creditIdx = headerFields.findIndex(h => h.includes('credit') || h.includes('deposit'))
      const balanceIdx = headerFields.findIndex(h => h.includes('balance'))

      return {
        date: dateIdx >= 0 ? fields[dateIdx] ?? '' : '',
        description: descIdx >= 0 ? fields[descIdx] ?? '' : '',
        debit: debitIdx >= 0 ? fields[debitIdx] ?? '' : '',
        credit: creditIdx >= 0 ? fields[creditIdx] ?? '' : '',
        balance: balanceIdx >= 0 ? fields[balanceIdx] ?? '' : '',
      }
    })

    setPreview(previewLines)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      parsePreview(text)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvText(text)
      parsePreview(text)
    }
    reader.readAsText(file)
  }

  async function handleUpload() {
    if (!csvText || !statementDate) return
    setLoading(true)

    const result = await uploadBankStatement(schemeId, fundType, statementDate, csvText)
    if (result.error) {
      toast.error(result.error)
    } else if (result.data) {
      toast.success(`Imported ${result.data.linesImported} bank statement lines`)
      router.refresh()
      onSuccess?.()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Bank Statement</CardTitle>
          <CardDescription>
            Upload a CSV file from your bank. Supported formats: CBA, Westpac, Bankwest, NAB, ANZ.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fund">Fund</Label>
              <Select value={fundType} onValueChange={(v) => setFundType(v as 'admin' | 'capital_works')}>
                <SelectTrigger id="fund">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin Fund</SelectItem>
                  <SelectItem value="capital_works">Capital Works Fund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stmt_date">Statement Date</Label>
              <Input
                id="stmt_date"
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
              />
            </div>
          </div>

          <div
            className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {fileName ? (
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
                <span className="text-sm text-muted-foreground">({totalRows} rows)</span>
              </div>
            ) : (
              <>
                <Upload className="mb-2 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop your CSV file here, or click to browse
                </p>
              </>
            )}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
        </CardContent>
      </Card>

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview (first 10 rows)</CardTitle>
            <CardDescription>
              {totalRows} total row{totalRows !== 1 ? 's' : ''} in file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((line, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap">{line.date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{line.description}</TableCell>
                      <TableCell className="text-right text-red-600">{line.debit || '-'}</TableCell>
                      <TableCell className="text-right text-green-600">{line.credit || '-'}</TableCell>
                      <TableCell className="text-right">{line.balance || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4">
              <Button onClick={handleUpload} disabled={loading}>
                {loading ? 'Uploading...' : `Upload ${totalRows} lines`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
