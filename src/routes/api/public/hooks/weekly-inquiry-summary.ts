import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

/**
 * Weekly inquiry summary — scheduled via pg_cron (Mondays 09:00 Asia/Jakarta = 02:00 UTC).
 * Aggregates last week's inquiry metrics and enqueues an email to every admin
 * whose notification_email_scope is "all".
 *
 * Auth: standard public cron pattern using Supabase anon key in apikey header.
 */
export const Route = createFileRoute('/api/public/hooks/weekly-inquiry-summary')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey =
          request.headers.get('apikey') ||
          request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY
        if (!expected || apikey !== expected) {
          return new Response('Unauthorized', { status: 401 })
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !serviceKey) {
          return new Response('Server config missing', { status: 500 })
        }
        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })

        // 1. Compute the last completed Monday-Sunday window in UTC.
        const now = new Date()
        const day = now.getUTCDay() // 0=Sun ... 1=Mon
        const daysSinceMon = (day + 6) % 7
        const thisMon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMon))
        const start = new Date(thisMon.getTime() - 7 * 24 * 3600 * 1000)
        const end = thisMon
        const fmt = (d: Date) =>
          d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'Asia/Jakarta',
          })
        const weekLabel = `${fmt(start)} – ${fmt(new Date(end.getTime() - 1))}`

        // 2. Load inquiries created in window.
        const { data: inqs, error: inqErr } = await supabase
          .from('inquiries')
          .select(
            'id, customer_city, status, assigned_to, created_at, first_contacted_at, inquiry_items(product:products(name_en,name_id))',
          )
          .gte('created_at', start.toISOString())
          .lt('created_at', end.toISOString())
          .is('deleted_at', null)
        if (inqErr) {
          console.error('weekly-summary: load inquiries failed', inqErr)
          return Response.json({ error: inqErr.message }, { status: 500 })
        }

        type Inq = {
          id: string
          customer_city: string | null
          status: string
          assigned_to: string | null
          created_at: string
          first_contacted_at: string | null
          inquiry_items:
            | Array<{ product: { name_en: string | null; name_id: string | null } | null }>
            | null
        }
        const rows = (inqs ?? []) as Inq[]
        const totalInquiries = rows.length

        // 3. Response times (minutes) for inquiries that have been contacted.
        const responseMins: number[] = []
        let breach = 0
        for (const r of rows) {
          if (!r.first_contacted_at) {
            // Still not contacted; if older than 24h, count as breach.
            const ageH = (Date.now() - new Date(r.created_at).getTime()) / 3600_000
            if (ageH > 24) breach += 1
            continue
          }
          const mins =
            (new Date(r.first_contacted_at).getTime() -
              new Date(r.created_at).getTime()) /
            60_000
          responseMins.push(mins)
          if (mins > 24 * 60) breach += 1
        }
        const contactedInWindow = responseMins.length
        const sortedMins = [...responseMins].sort((a, b) => a - b)
        const avg =
          sortedMins.length === 0
            ? null
            : sortedMins.reduce((s, n) => s + n, 0) / sortedMins.length
        const median =
          sortedMins.length === 0
            ? null
            : sortedMins.length % 2 === 1
              ? sortedMins[Math.floor(sortedMins.length / 2)]
              : (sortedMins[sortedMins.length / 2 - 1] + sortedMins[sortedMins.length / 2]) / 2
        const slaCompliantPct =
          totalInquiries === 0
            ? null
            : Math.round(((totalInquiries - breach) / totalInquiries) * 100)

        // 4. Top performer = admin with fastest average response time (min 2 responses).
        const perAdmin = new Map<string, { sum: number; count: number }>()
        for (const r of rows) {
          if (!r.assigned_to || !r.first_contacted_at) continue
          const mins =
            (new Date(r.first_contacted_at).getTime() -
              new Date(r.created_at).getTime()) /
            60_000
          const entry = perAdmin.get(r.assigned_to) ?? { sum: 0, count: 0 }
          entry.sum += mins
          entry.count += 1
          perAdmin.set(r.assigned_to, entry)
        }
        let topPerformer: {
          name: string
          avgMinutes: number
          count: number
        } | null = null
        if (perAdmin.size > 0) {
          const adminIds = Array.from(perAdmin.keys())
          const { data: adminRows } = await supabase
            .from('admin_users')
            .select('id, full_name, email')
            .in('id', adminIds)
          const byId = new Map((adminRows ?? []).map((a) => [a.id, a]))
          let best: { id: string; avg: number; count: number } | null = null
          for (const [id, v] of perAdmin) {
            if (v.count < 2) continue
            const avgMins = v.sum / v.count
            if (!best || avgMins < best.avg) best = { id, avg: avgMins, count: v.count }
          }
          if (best) {
            const a = byId.get(best.id)
            topPerformer = {
              name: a?.full_name || a?.email || 'Unknown',
              avgMinutes: Math.round(best.avg),
              count: best.count,
            }
          }
        }

        // 5. Top cities + products.
        const cityCounts = new Map<string, number>()
        const productCounts = new Map<string, number>()
        for (const r of rows) {
          const c = (r.customer_city ?? '').trim()
          if (c) cityCounts.set(c, (cityCounts.get(c) ?? 0) + 1)
          for (const it of r.inquiry_items ?? []) {
            const name = it.product?.name_en || it.product?.name_id
            if (name) productCounts.set(name, (productCounts.get(name) ?? 0) + 1)
          }
        }
        const toTop = (m: Map<string, number>) =>
          Array.from(m.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, count]) => ({ label, count }))

        const templateData = {
          weekLabel,
          totalInquiries,
          avgResponseMinutes: avg == null ? null : Math.round(avg),
          medianResponseMinutes: median == null ? null : Math.round(median),
          slaBreachCount: breach,
          slaCompliantPct,
          topPerformer,
          topCities: toTop(cityCounts),
          topProducts: toTop(productCounts),
        }

        // 6. Recipients: all admins opted into email notifications.
        const { data: admins } = await supabase
          .from('admin_users')
          .select('id, email, notification_email_scope')

        const recipients = (admins ?? []).filter(
          (a) => a.email && a.notification_email_scope !== 'none',
        )

        // 7. Enqueue one email per recipient via the transactional send endpoint
        //    using the service-role key for trusted server-to-server auth.
        const baseUrl = new URL(request.url)
        const sendUrl = `${baseUrl.origin}/lovable/email/transactional/send`
        const weekKey = start.toISOString().slice(0, 10)
        let queued = 0
        for (const a of recipients) {
          try {
            const res = await fetch(sendUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${serviceKey}`,
                apikey: serviceKey,
              },
              body: JSON.stringify({
                templateName: 'weekly-inquiry-summary',
                recipientEmail: a.email,
                idempotencyKey: `weekly-summary-${weekKey}-${a.id}`,
                templateData,
              }),
            })
            if (res.ok) queued += 1
            else console.warn('weekly-summary: send failed', a.email, res.status)
          } catch (e) {
            console.warn('weekly-summary: send error', a.email, e)
          }
        }

        // 8. Activity log entry (system-level, so admin_user_id is null).
        await supabase.from('activity_log').insert({
          admin_user_id: null,
          action: 'sla_weekly_summary_sent',
          entity_type: 'inquiry_summary',
          entity_id: null,
        })

        return Response.json({
          ok: true,
          weekLabel,
          totalInquiries,
          contactedInWindow,
          slaBreachCount: breach,
          slaCompliantPct,
          recipients: recipients.length,
          queued,
        })
      },
    },
  },
})