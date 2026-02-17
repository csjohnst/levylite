'use client'

import { useState } from 'react'
import {
  FileText,
  FileImage,
  File,
  Download,
  Search,
} from 'lucide-react'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Document {
  id: string
  document_name: string
  description: string | null
  category: string | null
  file_size: number | null
  mime_type: string | null
  file_path: string
  created_at: string
  scheme_id: string
}

interface OwnerDocumentsClientProps {
  documents: Document[]
}

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'agm', label: 'AGM' },
  { value: 'levy-notices', label: 'Levy Notices' },
  { value: 'financial', label: 'Financial' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'bylaws', label: 'By-Laws' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'building-reports', label: 'Building Reports' },
  { value: 'other', label: 'Other' },
]

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return File
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('image')) return FileImage
  return File
}

export function OwnerDocumentsClient({ documents }: OwnerDocumentsClientProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [downloading, setDownloading] = useState<string | null>(null)

  const filtered = documents.filter((doc) => {
    const matchesSearch = search
      ? doc.document_name.toLowerCase().includes(search.toLowerCase()) ||
        (doc.description?.toLowerCase().includes(search.toLowerCase()) ?? false)
      : true
    const matchesCategory = category === 'all' || doc.category === category
    return matchesSearch && matchesCategory
  })

  async function handleDownload(doc: Document) {
    setDownloading(doc.id)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('scheme-documents')
        .createSignedUrl(doc.file_path, 60)

      if (error || !data?.signedUrl) {
        toast.error('Failed to get download link')
        return
      }

      window.open(data.signedUrl, '_blank')
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category tabs */}
      <Tabs value={category} onValueChange={setCategory}>
        <TabsList className="flex-wrap h-auto">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Document list */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const IconComponent = getFileIcon(doc.mime_type)
            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted shrink-0">
                    <IconComponent className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.document_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {CATEGORIES.find((c) => c.value === doc.category)?.label ?? doc.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                  >
                    <Download className="size-4" />
                    <span className="hidden sm:inline ml-1">
                      {downloading === doc.id ? 'Loading...' : 'Download'}
                    </span>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No documents found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or category filter.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
