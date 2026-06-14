import type { ComponentType } from 'react'
import { template as purchaseCreated } from './purchase-created'
import { template as receiptReceived } from './receipt-received'
import { template as purchaseDelivered } from './purchase-delivered'
import { template as releaseReceived } from './release-received'
import { template as releaseStatusChanged } from './release-status-changed'
import { template as adminNewPurchase } from './admin-new-purchase'
import { template as adminNewReceipt } from './admin-new-receipt'
import { template as adminNewRelease } from './admin-new-release'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'purchase-created': purchaseCreated,
  'receipt-received': receiptReceived,
  'purchase-delivered': purchaseDelivered,
  'release-received': releaseReceived,
  'release-status-changed': releaseStatusChanged,
  'admin-new-purchase': adminNewPurchase,
  'admin-new-receipt': adminNewReceipt,
  'admin-new-release': adminNewRelease,
}
