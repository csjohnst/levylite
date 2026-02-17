'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  createAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  reorderAgendaItems,
} from '@/actions/agenda-items'

interface AgendaItem {
  id: string
  item_number: number
  title: string
  description: string | null
  item_type: string
  motion_type: string | null
  estimated_cost: number | null
  is_required: boolean
}

interface AgendaBuilderProps {
  meetingId: string
  items: AgendaItem[]
  isEditable: boolean
}

const TYPE_BADGE_STYLES: Record<string, string> = {
  procedural: 'bg-gray-100 text-gray-800',
  standard: 'bg-blue-100 text-blue-800',
  motion: 'bg-purple-100 text-purple-800',
  discussion: 'bg-yellow-100 text-yellow-800',
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function AgendaBuilder({ meetingId, items, isEditable }: AgendaBuilderProps) {
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<AgendaItem | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [itemType, setItemType] = useState<string>('standard')
  const [motionType, setMotionType] = useState<string>('')
  const [estimatedCost, setEstimatedCost] = useState('')

  function resetForm() {
    setTitle('')
    setDescription('')
    setItemType('standard')
    setMotionType('')
    setEstimatedCost('')
  }

  function openEdit(item: AgendaItem) {
    setEditingItem(item)
    setTitle(item.title)
    setDescription(item.description || '')
    setItemType(item.item_type)
    setMotionType(item.motion_type || '')
    setEstimatedCost(item.estimated_cost != null ? String(item.estimated_cost) : '')
    setShowAddDialog(true)
  }

  function openAdd() {
    setEditingItem(null)
    resetForm()
    setShowAddDialog(true)
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    setSubmitting(true)

    if (editingItem) {
      const result = await updateAgendaItem(editingItem.id, {
        title: title.trim(),
        description: description.trim() || null,
        item_type: itemType,
        motion_type: itemType === 'motion' ? (motionType || null) : null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Agenda item updated')
        setShowAddDialog(false)
        router.refresh()
      }
    } else {
      const result = await createAgendaItem(meetingId, {
        title: title.trim(),
        description: description.trim() || null,
        item_type: itemType,
        motion_type: itemType === 'motion' ? (motionType || null) : null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Agenda item added')
        setShowAddDialog(false)
        router.refresh()
      }
    }

    setSubmitting(false)
  }

  async function handleDelete(item: AgendaItem) {
    if (item.is_required) {
      toast.error('Required items cannot be deleted')
      return
    }

    const result = await deleteAgendaItem(item.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Agenda item removed')
      router.refresh()
    }
  }

  async function handleReorder(itemId: string, newNumber: number) {
    if (newNumber < 1 || newNumber > items.length) return

    const reordered = items
      .map(i => ({
        id: i.id,
        item_number: i.id === itemId ? newNumber : i.item_number,
      }))
      .sort((a, b) => a.item_number - b.item_number)

    const result = await reorderAgendaItems(
      meetingId,
      reordered.map(r => ({ id: r.id, item_number: r.item_number }))
    )

    if (result.error) {
      toast.error(result.error)
    } else {
      router.refresh()
    }
  }

  const sortedItems = [...items].sort((a, b) => a.item_number - b.item_number)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Agenda Items</h3>
        {isEditable && (
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1 size-3" />
            Add Item
          </Button>
        )}
      </div>

      {sortedItems.length > 0 ? (
        <div className="space-y-2">
          {sortedItems.map(item => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <div className="flex items-center gap-2 pt-0.5">
                <GripVertical className="size-4 text-muted-foreground" />
                {isEditable ? (
                  <Input
                    type="number"
                    min={1}
                    max={items.length}
                    value={item.item_number}
                    onChange={(e) => handleReorder(item.id, parseInt(e.target.value))}
                    className="w-14 h-7 text-center text-sm"
                  />
                ) : (
                  <span className="text-sm font-medium w-6 text-center">
                    {item.item_number}.
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{item.title}</span>
                  <Badge variant="secondary" className={TYPE_BADGE_STYLES[item.item_type] ?? ''}>
                    {item.item_type}
                  </Badge>
                  {item.is_required && (
                    <Badge variant="outline" className="text-xs">Required</Badge>
                  )}
                  {item.motion_type && (
                    <Badge variant="outline" className="text-xs">
                      {item.motion_type} resolution
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
                {item.estimated_cost != null && (
                  <p className="text-sm text-muted-foreground">
                    Est. cost: {formatCurrency(item.estimated_cost)}
                  </p>
                )}
              </div>

              {isEditable && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  {!item.is_required && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No agenda items yet. Add items to build the meeting agenda.</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Agenda Item' : 'Add Agenda Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the agenda item details.' : 'Add a new item to the meeting agenda.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agenda_title">Title</Label>
              <Input
                id="agenda_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Approve installation of CCTV cameras"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agenda_description">Description (optional)</Label>
              <Textarea
                id="agenda_description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details about this agenda item"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agenda_type">Item Type</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger id="agenda_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="procedural">Procedural</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="motion">Motion</SelectItem>
                  <SelectItem value="discussion">Discussion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {itemType === 'motion' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="motion_type">Resolution Type</Label>
                  <Select value={motionType} onValueChange={setMotionType}>
                    <SelectTrigger id="motion_type">
                      <SelectValue placeholder="Select resolution type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ordinary">Ordinary Resolution (&gt;50%)</SelectItem>
                      <SelectItem value="special">Special Resolution (75%)</SelectItem>
                      <SelectItem value="unanimous">Unanimous Resolution (100%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_cost">Estimated Cost (optional)</Label>
                  <Input
                    id="estimated_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={submitting || !title.trim()}>
              {submitting ? 'Saving...' : editingItem ? 'Update' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
