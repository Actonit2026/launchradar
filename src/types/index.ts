export type PageType = 'homepage' | 'pricing' | 'features' | 'changelog'
export type ChangeSeverity = 'low' | 'medium' | 'high'

export interface Competitor {
  id: string
  user_id: string
  name: string
  base_url: string
  created_at: string
}

export interface MonitoredPage {
  id: string
  competitor_id: string
  url: string
  page_type: PageType
  last_checked_at: string | null
  created_at: string
}

export interface Snapshot {
  id: string
  monitored_page_id: string
  raw_text: string
  hash: string
  created_at: string
}

export interface DetectedChange {
  id: string
  monitored_page_id: string
  diff_summary: string
  severity: ChangeSeverity
  created_at: string
}

export interface CompetitorSnapshot {
  id: string
  competitor_id: string
  user_id: string
  summary: string | null
  pricing_model: string | null
  detected_pricing: string | null
  positioning: string | null
  primary_cta: string | null
  secondary_cta: string | null
  feature_summary: string | null
  changelog_detected: boolean
  confidence_score: number
  created_at: string
}

export interface CompetitorWithPages extends Competitor {
  monitored_pages: MonitoredPage[]
}

export interface MonitoredPageWithChanges extends MonitoredPage {
  detected_changes: DetectedChange[]
  competitor?: Competitor
}

export interface DetectedChangeWithContext extends DetectedChange {
  monitored_page: MonitoredPage & { competitor: Competitor }
}

export interface AddCompetitorPayload {
  name: string
  base_url: string
}

export interface ScanResult {
  pages_checked: number
  changes_detected: number
  errors: string[]
}
