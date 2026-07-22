// ============================================================
// supabase/functions/radar-jobs/index.ts — GN Studio OS v2.0
// Edge Function: GET /radar-jobs
// Fase 4: Filtros por categoría, métricas de lanzamiento y
//         TTL de caché configurable (por defecto 5 min).
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
};

// TTL de caché RSS: si el job en BD tiene menos de N segundos de antigüedad,
// se devuelve desde caché sin llamar al feed externo.
const CACHE_TTL_SECONDS = 300; // 5 minutos

// ── Tipos ─────────────────────────────────────────────────────
interface JobNormalizado {
  titulo: string;
  presupuesto: string;
  fecha_publicacion: string | null;
  url: string;
}

interface PlataformaRow {
  id: string;
  nombre: string;
  color: string;
  color_bg: string;
  color_border: string;
  logo: string;
  descripcion: string;
  search_url: string;
  categoria: string;
  rss_url?: string;
}

// ── Parser RSS (XML → jobs) ────────────────────────────────────
function parseRSSItems(xml: string, limit: number): JobNormalizado[] {
  const jobs: JobNormalizado[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && jobs.length < limit) {
    const block = match[1];
    const titulo = stripTags(extractTag(block, 'title'));
    const url    = extractTag(block, 'link') ||
                   extractAttr(block, 'enclosure', 'url') ||
                   extractTag(block, 'guid');
    const fechaStr = extractTag(block, 'pubDate') ||
                     extractTag(block, 'dc:date') ||
                     extractTag(block, 'published') || null;
    const presupuesto = extractPresupuesto(block);

    if (titulo && url) {
      jobs.push({
        titulo:            titulo.substring(0, 120),
        presupuesto:       presupuesto || 'Negociable',
        fecha_publicacion: fechaStr ? new Date(fechaStr).toISOString() : null,
        url,
      });
    }
  }
  return jobs;
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp('<' + tag + '[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/' + tag + '>|<' + tag + '[^>]*>([\\s\\S]*?)<\/' + tag + '>', 'i');
  const m = re.exec(xml);
  return (m ? (m[1] || m[2] || '') : '').trim();
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp('<' + tag + '[^>]*\\s' + attr + '=["\']([^"\']*)["\']', 'i');
  const m = re.exec(xml);
  return m ? m[1] : '';
}

function stripTags(str: string): string {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractPresupuesto(block: string): string {
  const text = stripTags(block);
  const m = text.match(/(?:Budget|budget|Presupuesto|presupuesto)?:?\s*(\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\/hr|\/hour|\/mes|\/yr|k)?)/i);
  if (m) return m[1].trim();
  return '';
}

// ── Configuración RSS por plataforma ──────────────────────────
const RSS_FEEDS: Record<string, string> = {
  upwork:
    'https://www.upwork.com/ab/feed/jobs/rss?q=brand+design+logo+identity&sort=recency&paging=0%3B10',
  workana:
    'https://www.workana.com/jobs/feed?category=design&language=es',
  behance:
    'https://www.behance.net/feeds/jobs?field=132',
  freelancer:
    'https://www.freelancer.com/rss/V2/job/category/graphic-design.xml',
};

// ── Fetch RSS con timeout ──────────────────────────────────────
async function fetchRSSJobs(plataformaId: string, limit: number): Promise<JobNormalizado[] | null> {
  const feedUrl = RSS_FEEDS[plataformaId];
  if (!feedUrl) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GNStudioBot/2.0; +https://gnstudio.space)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const xml = await res.text();
    const jobs = parseRSSItems(xml, limit);
    return jobs.length > 0 ? jobs : null;
  } catch (_e) {
    return null;
  }
}

// ── Guardar/actualizar jobs en BD (caché) ──────────────────────
async function guardarJobsEnBD(
  supabase: ReturnType<typeof createClient>,
  plataformaId: string,
  jobs: JobNormalizado[],
): Promise<void> {
  for (const job of jobs) {
    await supabase.from('radar_jobs').upsert(
      {
        plataforma_id:     plataformaId,
        titulo:            job.titulo,
        presupuesto:       job.presupuesto,
        fecha_publicacion: job.fecha_publicacion,
        url:               job.url,
        fuente:            'rss',
        actualizado_en:    new Date().toISOString(),
      },
      { onConflict: 'url' },
    );
  }
}

// ── Verificar si el caché sigue vigente (TTL) ──────────────────
async function cachéVigente(
  supabase: ReturnType<typeof createClient>,
  plataformaId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('radar_jobs')
    .select('actualizado_en')
    .eq('plataforma_id', plataformaId)
    .order('actualizado_en', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return false;
  const ultima = new Date(data[0].actualizado_en).getTime();
  const ahora  = Date.now();
  return (ahora - ultima) / 1000 < CACHE_TTL_SECONDS;
}

// ── Registrar métrica de lanzamiento ──────────────────────────
// POST /radar-jobs/track { plataforma_id, job_url }
async function registrarLanzamiento(
  supabase: ReturnType<typeof createClient>,
  plataformaId: string,
  jobUrl: string,
): Promise<void> {
  await supabase.from('radar_metricas').insert({
    plataforma_id: plataformaId,
    job_url:       jobUrl,
    lanzado_en:    new Date().toISOString(),
  }).catch(() => {}); // best-effort
}

// ── Handler principal ──────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const reqUrl = new URL(req.url);

  // ── Ruta POST /radar-jobs/track (métricas) ────────────────
  if (req.method === 'POST' && reqUrl.pathname.endsWith('/track')) {
    try {
      const body = await req.json();
      const { plataforma_id, job_url } = body;
      if (!plataforma_id || !job_url) {
        return new Response(JSON.stringify({ error: 'Faltan plataforma_id o job_url' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await registrarLanzamiento(supabase, plataforma_id, job_url);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  }

  // ── GET /radar-jobs ───────────────────────────────────────
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    const limit  = Math.min(parseInt(reqUrl.searchParams.get('limit')     ?? '3'), 10);
    const platId = reqUrl.searchParams.get('plataforma') ?? null;
    // Fase 4: filtro real por categoría
    const categ  = reqUrl.searchParams.get('categoria')  ?? null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 1. Plataformas activas desde BD ───────────────────
    let platQuery = supabase
      .from('radar_plataformas')
      .select('*')
      .eq('activo', true)
      .order('id');

    if (platId) platQuery = platQuery.eq('id', platId);
    // Fase 4: filtro por categoria aplicado en BD
    if (categ)  platQuery = platQuery.eq('categoria', categ);

    const { data: plataformas, error: platError } = await platQuery;
    if (platError) throw platError;

    // ── 2. Para cada plataforma: TTL → RSS → caché BD → vacío
    const result = await Promise.all(
      (plataformas ?? []).map(async (p: PlataformaRow) => {
        let jobs: JobNormalizado[] = [];
        let fuente = 'bd';

        // Fase 4: respetar TTL — si la caché aún es válida, usarla directo
        const usarCache = await cachéVigente(supabase, p.id);

        if (!usarCache) {
          // Intentar RSS real
          const rssJobs = await fetchRSSJobs(p.id, limit);
          if (rssJobs && rssJobs.length > 0) {
            jobs   = rssJobs;
            fuente = 'rss';
            // Guardar en caché (best-effort, no bloqueante)
            guardarJobsEnBD(supabase, p.id, rssJobs).catch(() => {});
          }
        }

        // Si no hay jobs frescos del RSS (o caché vigente), leer BD
        if (jobs.length === 0) {
          const { data: cached } = await supabase
            .from('radar_jobs')
            .select('titulo, presupuesto, fecha_publicacion, url')
            .eq('plataforma_id', p.id)
            .order('fecha_publicacion', { ascending: false })
            .limit(limit);

          if (cached && cached.length > 0) {
            jobs   = cached.map((j: Record<string, unknown>) => ({
              titulo:            String(j.titulo),
              presupuesto:       String(j.presupuesto ?? 'Negociable'),
              fecha_publicacion: j.fecha_publicacion as string | null,
              url:               String(j.url),
            }));
            fuente = 'cache';
          }
          // Si sigue vacío → frontend usará mock visual + search_url
        }

        return {
          id:           p.id,
          nombre:       p.nombre,
          color:        p.color,
          color_bg:     p.color_bg,
          color_border: p.color_border,
          logo:         p.logo ?? '🔗',
          descripcion:  p.descripcion,
          search_url:   p.search_url,
          categoria:    p.categoria,
          jobs,
          fuente, // 'rss' | 'cache' | 'bd'
        };
      })
    );

    return new Response(
      JSON.stringify({ plataformas: result }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      },
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
