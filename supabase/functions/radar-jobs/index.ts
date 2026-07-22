// ============================================================
// supabase/functions/radar-jobs/index.ts — GN Studio OS v2.0
// Edge Function: GET /radar-jobs
// Fase 2: Intenta RSS real por plataforma → guarda en radar_jobs
//         → fallback a caché → fallback a array vacío (mock en frontend)
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
   'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, Authorization',
};

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
  // Match <item>...</item> blocks
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
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
}

function extractPresupuesto(block: string): string {
  // Buscar patrones de precio en el contenido del item
  const text = stripTags(block);
  // Patrones: $xxx, $xxx-$xxx, Budget: $xxx
  const m = text.match(/(?:Budget|budget|Presupuesto|presupuesto)?:?\s*(\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?(?:\/hr|\/hour|\/mes|\/yr|k)?)/i);
  if (m) return m[1].trim();
  return '';
}

// ── Configuración RSS por plataforma ──────────────────────────
// Solo plataformas con feeds públicos disponibles
const RSS_FEEDS: Record<string, string> = {
  // Upwork: RSS público de búsqueda de jobs de diseño
  upwork:
    'https://www.upwork.com/ab/feed/jobs/rss?q=brand+design+logo+identity&sort=recency&paging=0%3B10',

  // Workana: RSS público de categoría diseño
  workana:
    'https://www.workana.com/jobs/feed?category=design&language=es',

  // Behance: RSS del job board de diseño/branding
  behance:
    'https://www.behance.net/feeds/jobs?field=132',

  // Freelancer: feed RSS de proyectos de diseño gráfico
  freelancer:
    'https://www.freelancer.com/rss/V2/job/category/graphic-design.xml',
};

// ── Fetch RSS con timeout ──────────────────────────────────────
async function fetchRSSJobs(plataformaId: string, limit: number): Promise<JobNormalizado[] | null> {
  const feedUrl = RSS_FEEDS[plataformaId];
  if (!feedUrl) return null; // Sin feed configurado

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
    return null; // timeout o error de red
  }
}

// ── Guardar/actualizar jobs en BD (caché) ──────────────────────
async function guardarJobsEnBD(
  supabase: ReturnType<typeof createClient>,
  plataformaId: string,
  jobs: JobNormalizado[],
): Promise<void> {
  for (const job of jobs) {
    // Upsert por URL (identidad del job)
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

// ── Handler principal ──────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url    = new URL(req.url);
    const limit  = Math.min(parseInt(url.searchParams.get('limit')  ?? '3'), 10);
    const platId = url.searchParams.get('plataforma') ?? null;
    const categ  = url.searchParams.get('categoria')  ?? null;

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
    if (categ)  platQuery = platQuery.eq('categoria', categ);

    const { data: plataformas, error: platError } = await platQuery;
    if (platError) throw platError;

    // ── 2. Para cada plataforma: RSS real → caché BD → vacío ─
    const result = await Promise.all(
      (plataformas ?? []).map(async (p: PlataformaRow) => {

        // Intento A: Fetch RSS real
        let jobs: JobNormalizado[] | null = await fetchRSSJobs(p.id, limit);

        if (jobs && jobs.length > 0) {
          // Guardar en caché (no bloqueante, best-effort)
          guardarJobsEnBD(supabase, p.id, jobs).catch(() => {});
        } else {
          // Intento B: Leer caché de BD (últimos registros guardados)
          const { data: cached } = await supabase
            .from('radar_jobs')
            .select('titulo, presupuesto, fecha_publicacion, url')
            .eq('plataforma_id', p.id)
            .order('fecha_publicacion', { ascending: false })
            .limit(limit);

          jobs = (cached && cached.length > 0)
            ? cached.map((j: Record<string, unknown>) => ({
                titulo:            String(j.titulo),
                presupuesto:       String(j.presupuesto ?? 'Negociable'),
                fecha_publicacion: j.fecha_publicacion as string | null,
                url:               String(j.url),
              }))
            : []; // Frontend usará mock visual + search_url
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
          fuente:       RSS_FEEDS[p.id] ? 'rss' : 'bd',
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
          'Cache-Control': 'public, max-age=300', // caché HTTP 5 min
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
