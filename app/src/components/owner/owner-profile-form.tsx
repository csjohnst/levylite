'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { toast } from 'sonner'
import { updateOwnerProfile } from '@/actions/owner-profile'

interface Profile {
  phone_mobile: string | null
  phone_home: string | null
  postal_address_line1: string | null
  postal_address_line2: string | null
  postal_suburb: string | null
  postal_state: string | null
  postal_postcode: string | null
  correspondence_method: string | null
}

interface OwnerProfileFormProps {
  profile: Profile
}

const AU_STATES = ['WA', 'NSW', 'VIC', 'QLD', 'SA', 'TAS', 'ACT', 'NT']

export function OwnerProfileForm({ profile }: OwnerProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [phoneMobile, setPhoneMobile] = useState(profile.phone_mobile ?? '')
  const [phoneHome, setPhoneHome] = useState(profile.phone_home ?? '')
  const [addressLine1, setAddressLine1] = useState(profile.postal_address_line1 ?? '')
  const [addressLine2, setAddressLine2] = useState(profile.postal_address_line2 ?? '')
  const [suburb, setSuburb] = useState(profile.postal_suburb ?? '')
  const [state, setState] = useState(profile.postal_state ?? '')
  const [postcode, setPostcode] = useState(profile.postal_postcode ?? '')
  const [correspondenceMethod, setCorrespondenceMethod] = useState(
    profile.correspondence_method ?? 'email'
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await updateOwnerProfile({
      phone_mobile: phoneMobile || null,
      phone_home: phoneHome || null,
      postal_address_line1: addressLine1 || null,
      postal_address_line2: addressLine2 || null,
      postal_suburb: suburb || null,
      postal_state: state || null,
      postal_postcode: postcode || null,
      correspondence_method: correspondenceMethod as 'email' | 'postal' | 'both',
    })

    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Profile updated. Your manager has been notified.')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Details</CardTitle>
          <CardDescription>
            Update your phone numbers, postal address, and correspondence preference
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone_mobile">Mobile Phone</Label>
              <Input
                id="phone_mobile"
                value={phoneMobile}
                onChange={(e) => setPhoneMobile(e.target.value)}
                placeholder="04xx xxx xxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_home">Home Phone</Label>
              <Input
                id="phone_home"
                value={phoneHome}
                onChange={(e) => setPhoneHome(e.target.value)}
                placeholder="08 xxxx xxxx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_line1">Postal Address</Label>
            <Input
              id="address_line1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div className="space-y-2">
            <Input
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb</Label>
              <Input
                id="suburb"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                placeholder="Suburb"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state || 'none'} onValueChange={(v) => setState(v === 'none' ? '' : v)}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select state</SelectItem>
                  {AU_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="6000"
                maxLength={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="correspondence">Correspondence Preference</Label>
            <Select value={correspondenceMethod} onValueChange={setCorrespondenceMethod}>
              <SelectTrigger id="correspondence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="postal">Postal</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
