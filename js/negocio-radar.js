// ============================================================
// js/negocio-radar.js — GN Studio OS v1.0
// Radar de Trabajos: acceso rápido a plataformas freelance
// con búsquedas pre-filtradas por los servicios de GN Studio
// ============================================================

var RADAR_PLATAFORMAS = [
  {
    id: 'upwork',
    nombre: 'Upwork',
    logo: '🟢',
    color: '#14a800',
    colorBg: 'rgba(20,168,0,0.08)',
    colorBorder: 'rgba(20,168,0,0.25)',
    descripcion: 'La plataforma freelance más grande del mundo',
    busquedas: [
      { label: 'Brand Design', url: 'https://www.upwork.com/nx/search/jobs/?q=brand+design+identity&sort=recency' },
      { label: 'Logo Design', url: 'https://www.upwork.com/nx/search/jobs/?q=logo+design+branding&sort=recency' },
      { label: 'Web Design', url: 'https://www.upwork.com/nx/search/jobs/?q=web+design+ui+ux&sort=recency' },
      { label: 'Social Media Design', url: 'https://www.upwork.com/nx/search/jobs/?q=social+media+design+content&sort=recency' },
      { label: 'Motion Graphics', url: 'https://www.upwork.com/nx/search/jobs/?q=motion+graphics+animation&sort=recency' },
      { label: 'Packaging Design', url: 'https://www.upwork.com/nx/search/jobs/?q=packaging+design+label&sort=recency' }
    ]
  },
  {
    id: 'workana',
    nombre: 'Workana',
    logo: '🔵',
    color: '#0075FF',
    colorBg: 'rgba(0,117,255,0.08)',
    colorBorder: 'rgba(0,117,255,0.25)',
    descripcion: 'La plataforma líder en Latinoamérica',
    busquedas: [
      { label: 'Diseño de Marca', url: 'https://www.workana.com/jobs?category=design&subcategory=brand-design&language=es' },
      { label: 'Diseño Web', url: 'https://www.workana.com/jobs?category=design&subcategory=web-design&language=es' },
      { label: 'Identidad Visual', url: 'https://www.workana.com/jobs?category=design&subcategory=corporate-identity&language=es' },
      { label: 'Redes Sociales', url: 'https://www.workana.com/jobs?category=design&subcategory=social-media-design&language=es' },
      { label: 'Diseño Gráfico', url: 'https://www.workana.com/jobs?category=design&language=es&sort=recent' }
    ]
  },
  {
    id: 'fiverr',
    nombre: 'Fiverr',
    logo: '🟠',
    color: '#1DBF73',
    colorBg: 'rgba(29,191,115,0.08)',
    colorBorder: 'rgba(29,191,115,0.25)',
    descripcion: 'Marketplace global con millones de compradores',
    busquedas: [
      { label: 'Brand Identity', url: 'https://www.fiverr.com/search/gigs?query=brand+identity+design&sort_by=rating' },
      { label: 'Logo & Branding', url: 'https://www.fiverr.com/search/gigs?query=logo+branding&sort_by=rating' },
      { label: 'Web Design', url: 'https://www.fiverr.com/search/gigs?query=website+design+ui&sort_by=rating' },
      { label: 'Social Media Kit', url: 'https://www.fiverr.com/search/gigs?query=social+media+design+kit&sort_by=rating' },
      { label: 'Motion Graphics', url: 'https://www.fiverr.com/search/gigs?query=motion+graphics+animation&sort_by=rating' }
    ]
  },
  {
    id: 'linkedin',
    nombre: 'LinkedIn Jobs',
    logo: '🔷',
    color: '#0077B5',
    colorBg: 'rgba(0,119,181,0.08)',
    colorBorder: 'rgba(0,119,181,0.25)',
    descripcion: 'Oportunidades con empresas y agencias',
    busquedas: [
      { label: 'Brand Designer', url: 'https://www.linkedin.com/jobs/search/?keywords=brand+designer&f_TPR=r86400&sortBy=DD' },
      { label: 'Graphic Designer', url: 'https://www.linkedin.com/jobs/search/?keywords=graphic+designer+freelance&f_TPR=r86400&sortBy=DD' },
      { label: 'UI/UX Designer', url: 'https://www.linkedin.com/jobs/search/?keywords=ui+ux+designer+remote&f_TPR=r86400&sortBy=DD' },
      { label: 'Creative Director', url: 'https://www.linkedin.com/jobs/search/?keywords=creative+director+contract&f_TPR=r86400&sortBy=DD' },
      { label: 'Design Agency', url: 'https://www.linkedin.com/jobs/search/?keywords=design+agency+contract+remote&f_TPR=r86400&sortBy=DD' }
    ]
  },
  {
    id: 'freelancer',
    nombre: 'Freelancer.com',
    logo: '⚡',
    color: '#29B2FE',
    colorBg: 'rgba(41,178,254,0.08)',
    colorBorder: 'rgba(41,178,254,0.25)',
    descripcion: 'Proyectos globales y concursos de diseño',
    busquedas: [
      { label: 'Logo & Branding', url: 'https://www.freelancer.com/jobs/graphic-design/?q=branding+logo' },
      { label: 'Web Design', url: 'https://www.freelancer.com/jobs/website-design/?q=web+design' },
      { label: 'Design Contests', url: 'https://www.freelancer.com/contest/?q=logo+brand' },
      { label: 'Social Media', url: 'https://www.freelancer.com/jobs/graphic-design/?q=social+media' }
    ]
  },
  {
    id: 'behance',
    nombre: 'Behance Jobs',
    logo: '🎨',
    color: '#1769FF',
    colorBg: 'rgba(23,105,255,0.08)',
    colorBorder: 'rgba(23,105,255,0.25)',
    descripcion: 'Jobs en la comunidad creativa de Adobe',
    busquedas: [
      { label: 'Brand Designer', url: 'https://www.behance.net/joblist?tracking_source=nav20&field=132' },
      { label: 'Visual Designer', url: 'https://www.behance.net/joblist?tracking_source=nav20&field=132&location=remote' },
      { label: 'Motion Designer', url: 'https://www.behance.net/joblist?tracking_source=nav20&field=135' }
    ]
  }
];

function radarRender() {
  var container = document.getElementById('radar-plataformas-grid');
  if (!container) return;
  var html = '';
  RADAR_PLATAFORMAS.forEach(function(p) {
    html += '<div class="radar-card" style="border-color:'+p.colorBorder+';background:'+p.colorBg+';">';
    html += '<div class="radar-card-header">';
    html += '<span class="radar-logo">'+p.logo+'</span>';
    html += '<div class="radar-info">';
    html += '<span class="radar-nombre" style="color:'+p.color+';">'+p.nombre+'</span>';
    html += '<span class="radar-desc">'+p.descripcion+'</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="radar-busquedas">';
    p.busquedas.forEach(function(b) {
      html += '<a href="'+b.url+'" target="_blank" rel="noopener noreferrer" class="radar-tag" style="border-color:'+p.colorBorder+';color:'+p.color+';">';
      html += '<i class="ph ph-magnifying-glass"></i> '+b.label;
      html += '</a>';
    });
    html += '</div>';
    html += '<div class="radar-card-footer">';
    html += '<button onclick="radarGuardarOpp(\''+p.id+'\',\''+p.nombre+'\')" class="radar-btn-opp" style="border-color:'+p.colorBorder+';color:'+p.color+';">';
    html += '<i class="ph ph-lightning"></i> Guardar Oportunidad';
    html += '</button>';
    html += '<a href="'+p.busquedas[0].url+'" target="_blank" rel="noopener noreferrer" class="radar-btn-open" style="background:'+p.color+';">';
    html += '<i class="ph ph-arrow-square-out"></i> Abrir '+p.nombre;
    html += '</a>';
    html += '</div>';
    html += '</div>';
  });
  container.innerHTML = html;
}

function radarGuardarOpp(plataformaId, plataformaNombre) {
  if (typeof oppAbrirModal === 'function') {
    oppAbrirModal({ plataforma: plataformaId, stage: 'nuevo' });
  }
}
