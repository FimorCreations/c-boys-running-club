import fs from 'fs';
import path from 'path';

const root = path.resolve('..');
const input = path.join(root, 'c-boys-running-club.html');
const output = input;

let html = fs.readFileSync(input, 'utf8');

html = html.replace(/src="data:image\/png;base64,[^"]+"/g, (match, offset) => {
  const before = html.slice(Math.max(0, offset - 400), offset);
  if (before.includes('hero-logo-mark')) return 'src="assets/logo-hero.png"';
  if (before.includes('foot-brand')) return 'src="assets/logo-mark.png"';
  return 'src="assets/logo-mark.png"';
});

const headInsert = `
<meta name="description" content="C-Boys Running Club — free membership, weekly training plans, and group runs for every pace in Kimberley.">
<meta name="theme-color" content="#14161A">
<link rel="icon" type="image/png" href="assets/favicon.png">
`;

if (!html.includes('name="description"')) {
  html = html.replace('<title>', headInsert + '<title>');
}

const heroCssOld = `.hero-logo-mark{
  position:absolute;right:-40px;top:50%;transform:translateY(-50%);
  width:520px;opacity:0.9;z-index:1;pointer-events:none;
}
@media(max-width:1100px){.hero-logo-mark{display:none;}}`;

const heroCssNew = `.hero-logo-wrap{
  position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden;
}
.hero-logo-wrap::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(90deg, var(--asphalt) 0%, transparent 42%, transparent 78%, var(--asphalt) 100%);
}
.hero-logo-mark{
  position:absolute;right:4%;top:50%;transform:translateY(-50%);
  width:min(44vw, 500px);height:auto;max-height:78vh;
  object-fit:contain;object-position:center right;
  opacity:0.22;filter:drop-shadow(0 0 40px rgba(228,48,42,0.15));
}
@media(max-width:1100px){.hero-logo-wrap{display:none;}}`;

html = html.replace(heroCssOld, heroCssNew);

const navCssAdd = `
.nav-brand img{height:34px;width:auto;max-width:120px;object-fit:contain;}
.foot-brand img{height:38px;width:auto;max-width:140px;object-fit:contain;}
.nav-links.open{
  display:flex;position:fixed;inset:72px 20px auto;flex-direction:column;gap:18px;
  background:rgba(20,22,26,0.97);border:1px solid var(--line);border-radius:6px;
  padding:24px;backdrop-filter:blur(12px);
}
.nav-links.open a{font-size:15px;}
@media(max-width:860px){
  .nav-links.open{display:flex;}
}
:focus-visible{outline:2px solid var(--lime);outline-offset:3px;}
@media (prefers-reduced-motion: reduce){
  html{scroll-behavior:auto;}
  .hero-eyebrow .dot{animation:none;}
}`;

html = html.replace(
  '.nav-brand img{height:34px;width:34px;object-fit:contain;}',
  '.nav-brand img{height:34px;width:auto;max-width:120px;object-fit:contain;}'
);

if (!html.includes('nav-links.open')) {
  html = html.replace('/* section headers reused */', navCssAdd + '\n\n/* section headers reused */');
}

html = html.replace(
  '<img class="hero-logo-mark" src="assets/logo-hero.png"',
  '<div class="hero-logo-wrap" aria-hidden="true"><img class="hero-logo-mark" src="assets/logo-hero.png" alt=""'
);

html = html.replace(
  /(<img class="hero-logo-mark"[^>]+)(>)/,
  '$1$2</div>'
);

const heroImgMatch = html.match(/<div class="hero-logo-wrap"[\s\S]*?<\/div>/);
if (heroImgMatch && !heroImgMatch[0].includes('loading=')) {
  html = html.replace(
    '<img class="hero-logo-mark" src="assets/logo-hero.png" alt=""',
    '<img class="hero-logo-mark" src="assets/logo-hero.png" alt="" loading="eager" decoding="async"'
  );
}

html = html.replace(
  '<button class="nav-toggle" aria-label="Menu">☰</button>',
  '<button class="nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false">☰</button>'
);

html = html.replace(
  '<div class="nav-links">',
  '<div class="nav-links" id="nav-links">'
);

const scriptOld = `<script>
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    if(window.scrollY > 40){ nav.classList.add('solid'); } else { nav.classList.remove('solid'); }
  });
</script>`;

const scriptNew = `<script>
  const nav = document.getElementById('nav');
  const navLinks = document.getElementById('nav-links');
  const navToggle = document.getElementById('nav-toggle');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('solid', window.scrollY > 40);
  });

  navToggle?.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  navLinks?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Open menu');
    });
  });
</script>`;

html = html.replace(scriptOld, scriptNew);

fs.writeFileSync(output, html, 'utf8');
console.log('HTML rebuilt:', output);
console.log('Size:', (fs.statSync(output).size / 1024).toFixed(1), 'KB');
