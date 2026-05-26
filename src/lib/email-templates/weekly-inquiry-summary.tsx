import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

const SITE_NAME = 'Consina'

interface TopPerformer {
  name: string
  avgMinutes: number
  count: number
}

interface Pair {
  label: string
  count: number
}

export interface WeeklyInquirySummaryProps {
  weekLabel?: string
  totalInquiries?: number
  avgResponseMinutes?: number | null
  medianResponseMinutes?: number | null
  slaBreachCount?: number
  slaCompliantPct?: number | null
  topPerformer?: TopPerformer | null
  topCities?: Pair[]
  topProducts?: Pair[]
}

function fmtMinutes(m?: number | null) {
  if (m == null || !Number.isFinite(m)) return '—'
  if (m < 60) return `${Math.round(m)} min`
  const h = m / 60
  if (h < 24) return `${h.toFixed(1)} h`
  return `${(h / 24).toFixed(1)} d`
}

const WeeklyInquirySummary = ({
  weekLabel = 'Last week',
  totalInquiries = 0,
  avgResponseMinutes = null,
  medianResponseMinutes = null,
  slaBreachCount = 0,
  slaCompliantPct = null,
  topPerformer = null,
  topCities = [],
  topProducts = [],
}: WeeklyInquirySummaryProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {SITE_NAME} weekly inquiries — {totalInquiries} total, {slaBreachCount} SLA breach
      {slaBreachCount === 1 ? '' : 'es'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Weekly Inquiry Summary</Heading>
        <Text style={muted}>{weekLabel}</Text>

        <Section style={statRow}>
          <Stat label="Total inquiries" value={String(totalInquiries)} />
          <Stat
            label="Answered in 24h"
            value={slaCompliantPct == null ? '—' : `${slaCompliantPct}%`}
          />
          <Stat label="SLA breaches" value={String(slaBreachCount)} />
        </Section>

        <Section style={statRow}>
          <Stat label="Avg response" value={fmtMinutes(avgResponseMinutes)} />
          <Stat label="Median response" value={fmtMinutes(medianResponseMinutes)} />
          <Stat
            label="Top performer"
            value={
              topPerformer
                ? `${topPerformer.name} (${fmtMinutes(topPerformer.avgMinutes)})`
                : '—'
            }
          />
        </Section>

        <Hr style={hr} />

        <Heading as="h2" style={h2}>Top customer cities</Heading>
        {topCities.length === 0 ? (
          <Text style={text}>No data this week.</Text>
        ) : (
          <ul style={list}>
            {topCities.map((c) => (
              <li key={c.label} style={listItem}>
                {c.label} — {c.count}
              </li>
            ))}
          </ul>
        )}

        <Heading as="h2" style={h2}>Most inquired products</Heading>
        {topProducts.length === 0 ? (
          <Text style={text}>No data this week.</Text>
        ) : (
          <ul style={list}>
            {topProducts.map((p) => (
              <li key={p.label} style={listItem}>
                {p.label} — {p.count}
              </li>
            ))}
          </ul>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          Sent automatically by {SITE_NAME} Admin every Monday morning.
        </Text>
      </Container>
    </Body>
  </Html>
)

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCell}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  )
}

export const template = {
  component: WeeklyInquirySummary,
  subject: (data: Record<string, any>) =>
    `Consina weekly inquiries — ${data?.totalInquiries ?? 0} total, ${data?.slaBreachCount ?? 0} SLA breach${(data?.slaBreachCount ?? 0) === 1 ? '' : 'es'}`,
  displayName: 'Weekly inquiry summary',
  previewData: {
    weekLabel: 'May 19 – May 25, 2026',
    totalInquiries: 47,
    avgResponseMinutes: 312,
    medianResponseMinutes: 245,
    slaBreachCount: 3,
    slaCompliantPct: 92,
    topPerformer: { name: 'Andika', avgMinutes: 95, count: 12 },
    topCities: [
      { label: 'Jakarta', count: 18 },
      { label: 'Bandung', count: 9 },
      { label: 'Surabaya', count: 6 },
    ],
    topProducts: [
      { label: 'Consina Trekker 60L', count: 11 },
      { label: 'Consina Magnum Tent', count: 7 },
    ],
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  color: '#0a0a0a',
}
const container = { padding: '24px 28px', maxWidth: '600px' }
const h1 = { fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0a0a0a' }
const h2 = { fontSize: '15px', fontWeight: 700, margin: '20px 0 8px', color: '#0a0a0a' }
const muted = { fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#374151', margin: '4px 0' }
const statRow = { display: 'block', margin: '12px 0' }
const statCell = {
  display: 'inline-block',
  width: '32%',
  padding: '10px 8px',
  verticalAlign: 'top' as const,
  borderRadius: '8px',
  background: '#f5f5f4',
  marginRight: '1%',
  marginBottom: '8px',
  boxSizing: 'border-box' as const,
}
const statLabel = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#6b7280',
}
const statValue = { fontSize: '18px', fontWeight: 700, color: '#0a0a0a', marginTop: '4px' }
const list = { paddingLeft: '18px', margin: '4px 0 12px' }
const listItem = { fontSize: '14px', color: '#374151', lineHeight: '1.6' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '12px 0 0' }

export default WeeklyInquirySummary