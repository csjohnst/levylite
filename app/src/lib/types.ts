export interface Organisation {
  id: string
  name: string
  abn: string | null
  address: string | null
  phone: string | null
  email: string | null
  createdAt: string
  updatedAt: string
}

export interface OrganisationUser {
  organisationId: string
  userId: string
  role: 'manager' | 'admin' | 'auditor'
  invitedBy: string | null
  invitedAt: string
  joinedAt: string | null
}

export interface Scheme {
  id: string
  organisationId: string
  schemeNumber: string
  schemeName: string
  schemeType: 'strata' | 'survey-strata' | 'community'
  streetAddress: string
  suburb: string
  state: string
  postcode: string
  abn: string | null
  acn: string | null
  registeredName: string | null
  financialYearEndMonth: number
  financialYearEndDay: number
  levyFrequency: 'monthly' | 'quarterly' | 'annual' | 'custom'
  levyDueDay: number
  totalLotEntitlement: number
  commonPropertyAreaSqm: number | null
  status: 'active' | 'inactive' | 'archived'
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Lot {
  id: string
  schemeId: string
  lotNumber: string
  unitNumber: string | null
  streetAddress: string | null
  lotType: 'residential' | 'commercial' | 'parking' | 'storage' | 'other'
  unitEntitlement: number
  votingEntitlement: number | null
  floorAreaSqm: number | null
  balconyAreaSqm: number | null
  totalAreaSqm: number | null
  bedrooms: number | null
  bathrooms: number | null
  carBays: number | null
  status: 'active' | 'inactive' | 'sold'
  occupancyStatus: 'owner-occupied' | 'tenanted' | 'vacant' | 'unknown'
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Owner {
  id: string
  title: string | null
  firstName: string
  lastName: string
  middleName: string | null
  preferredName: string | null
  email: string | null
  emailSecondary: string | null
  phoneMobile: string | null
  phoneHome: string | null
  phoneWork: string | null
  postalAddressLine1: string | null
  postalAddressLine2: string | null
  postalSuburb: string | null
  postalState: string | null
  postalPostcode: string | null
  postalCountry: string | null
  abn: string | null
  companyName: string | null
  correspondenceMethod: 'email' | 'postal' | 'both'
  correspondenceLanguage: string
  status: 'active' | 'inactive' | 'deceased'
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface LotOwnership {
  id: string
  lotId: string
  ownerId: string
  ownershipType: 'sole' | 'joint-tenants' | 'tenants-in-common'
  ownershipPercentage: number
  ownershipStartDate: string
  ownershipEndDate: string | null
  isPrimaryContact: boolean
  receiveLevyNotices: boolean
  receiveMeetingNotices: boolean
  receiveMaintenanceUpdates: boolean
  createdAt: string
  updatedAt: string
}

export interface CommitteeMember {
  id: string
  schemeId: string
  ownerId: string
  position: 'chair' | 'treasurer' | 'secretary' | 'member'
  electedAt: string
  termEndDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Tenant {
  id: string
  lotId: string
  firstName: string
  lastName: string
  email: string | null
  phoneMobile: string | null
  phoneWork: string | null
  leaseStartDate: string | null
  leaseEndDate: string | null
  leaseType: string | null
  emergencyContactName: string | null
  emergencyContactPhone: string | null
  emergencyContactRelationship: string | null
  hasPets: boolean
  petDetails: string | null
  vehicleMake: string | null
  vehicleModel: string | null
  vehicleRego: string | null
  vehicleColor: string | null
  status: 'current' | 'past' | 'pending'
  createdAt: string
  updatedAt: string
}

// =============================================
// Feedback System Types
// =============================================

export interface FeedbackCategory {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type FeedbackStatus = 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'archived'
export type FeedbackSentiment = 'positive' | 'neutral' | 'negative'

export interface Feedback {
  id: string
  userFingerprint: string
  sessionId: string | null
  categoryId: string | null
  message: string
  sentiment: FeedbackSentiment | null
  pageUrl: string
  pageTitle: string | null
  userAgent: string | null
  viewportWidth: number | null
  viewportHeight: number | null
  contactEmail: string | null
  allowContact: boolean
  status: FeedbackStatus
  adminNotes: string | null
  assignedTo: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  category?: FeedbackCategory
  attachments?: FeedbackAttachment[]
}

export interface FeedbackAttachment {
  id: string
  feedbackId: string
  storagePath: string
  fileName: string
  fileSize: number
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'
  width: number | null
  height: number | null
  createdAt: string
  deletedAt: string | null
}

export interface SubmitFeedbackRequest {
  message: string
  pageUrl: string
  userFingerprint: string
  categoryId?: string
  sentiment?: FeedbackSentiment
  pageTitle?: string
  sessionId?: string
  contactEmail?: string
  allowContact?: boolean
  userAgent?: string
  viewportWidth?: number
  viewportHeight?: number
  screenshot?: string
}

export interface SubmitFeedbackResponse {
  success: boolean
  feedbackId: string
  message: string
}

// =============================================
// Insurance Tracking Types
// =============================================

export type InsurancePolicyType = 'building' | 'public_liability' | 'office_bearers' | 'fidelity' | 'workers_comp' | 'other'
export type InsurancePolicyStatus = 'active' | 'expired' | 'cancelled' | 'pending_renewal'
export type ValuationType = 'insurance' | 'market' | 'depreciated_replacement'
export type InsuranceAlertStatus = 'expired' | 'expiring_soon' | 'renewal_due' | 'ok'

export interface InsurancePolicy {
  id: string
  schemeId: string
  policyType: InsurancePolicyType
  policyNumber: string
  insurerName: string
  brokerName: string | null
  premiumAmount: number
  sumInsured: number | null
  excessAmount: number | null
  effectiveDate: string
  expiryDate: string
  renewalNoticeSentAt: string | null
  coverageNotes: string | null
  specialConditions: string | null
  status: InsurancePolicyStatus
  createdAt: string
  createdBy: string | null
  updatedAt: string
  updatedBy: string | null
}

export interface PropertyValuation {
  id: string
  schemeId: string
  valuationDate: string
  valuationAmount: number
  valuationType: ValuationType
  valuerName: string
  valuerCompany: string | null
  valuerRegistrationNumber: string | null
  reportReference: string | null
  reportFilePath: string | null
  notes: string | null
  methodology: string | null
  createdAt: string
  createdBy: string | null
  updatedAt: string
  updatedBy: string | null
}

export interface LatestPropertyValuation {
  id: string
  schemeId: string
  valuationDate: string
  valuationAmount: number
  valuationType: ValuationType
  valuerName: string
  valuerCompany: string | null
  createdAt: string
  isOutdated: boolean
}

export interface InsurancePolicyWithAlerts extends InsurancePolicy {
  latestValuationDate: string | null
  latestValuationAmount: number | null
  valuationIsOutdated: boolean | null
  daysUntilExpiry: number
  alertStatus: InsuranceAlertStatus
}
