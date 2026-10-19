#!/usr/bin/env python3
"""
build_pages.py
Generates the 6 static pages for the paginated Timing Explainer website:
1. index.html (Home: Why timing matters)
2. clocks.html (What is a clock? & Atoms)
3. optical.html (Why go optical? & Inside the lattice)
4. precision.html (Precision, Gravity, & Future applications)
5. sync.html (Adverse effects of loss of sync: 5G towers & portable optical clocks)
6. quiz.html (Interactive quiz & glossary)
"""

import re
import os

with open('index.html', 'r', encoding='utf-8') as f:
    orig = f.read()

with open('/Users/sidpethe/.gemini/antigravity-ide/brain/80400321-4ac2-4d3c-96ec-20aad55bf5f5/scratch/sync_body.html', 'r', encoding='utf-8') as f:
    sync_body = f.read()

def get_section(content, sec_id):
    pattern = rf'(<section[^>]*id=\"{sec_id}\"[^>]*>.*?</section>)'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        raise ValueError(f'Section {sec_id} not found')
    return match.group(1)

hero_sec = get_section(orig, 'top')
why_sec = get_section(orig, 'why')
clocks_sec = get_section(orig, 'clocks')
atoms_sec = get_section(orig, 'atoms')
optical_sec = get_section(orig, 'optical')
inside_sec = get_section(orig, 'inside')
precision_sec = get_section(orig, 'precision')
gravity_sec = get_section(orig, 'gravity')
future_sec = get_section(orig, 'future')
quiz_sec = get_section(orig, 'quiz')
glossary_sec = get_section(orig, 'glossary')

# Update quiz subtitle to 7 questions
quiz_sec = quiz_sec.replace('Six questions to consolidate', 'Seven questions to consolidate')

NAV_ITEMS = [
    ('index.html', 'Why'),
    ('clocks.html', 'Clocks'),
    ('optical.html', 'Optical'),
    ('precision.html', 'Precision'),
    ('sync.html', 'Losing Sync'),
    ('quiz.html', 'Quiz')
]

def make_header(current_page):
    nav_links = []
    for url, label in NAV_ITEMS:
        is_current = (url == current_page)
        curr_attr = ' aria-current="page"' if is_current else ''
        new_badge = '<span class="nav-new">New</span>' if url == 'sync.html' else ''
        nav_links.append(f'          <li><a href="{url}"{curr_attr}>{label}{new_badge}</a></li>')
    nav_html = '\n'.join(nav_links)

    brand_href = 'index.html'

    return f'''  <header class="site-header" id="site-header">
    <div class="container header-inner">
      <a class="brand" href="{brand_href}" id="brand-link">
        <span class="brand-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8">
            <circle cx="12" cy="12" r="2.2" fill="#fff" />
            <ellipse cx="12" cy="12" rx="9" ry="3.6" />
            <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
          </svg>
        </span>
        The Science of Tick-Tock
      </a>
      <nav class="main-nav" aria-label="Chapters">
        <ul>
{nav_html}
        </ul>
      </nav>
      <div class="header-actions">
        <button class="icon-btn theme-toggle" id="theme-toggle" type="button" aria-label="Toggle dark mode">
          <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round">
            <circle cx="12" cy="12" r="4" />
            <path
              d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>
      </div>
    </div>
    <div class="progress" aria-hidden="true"></div>
  </header>'''

def make_page_progress(page_num, total_pages=6):
    spans = []
    for i in range(1, total_pages + 1):
        if i < page_num:
            spans.append('<span class="done"></span>')
        elif i == page_num:
            spans.append('<span class="current"></span>')
        else:
            spans.append('<span></span>')
    progress_bars = ''.join(spans)
    return f'''          <div class="page-progress" aria-hidden="true">
            {progress_bars}
          </div>
          <span class="page-progress-label">Part {page_num} of {total_pages}</span>'''

def make_page_hero(eyebrow, title, lead, page_num, toc_items):
    toc_links = '\n'.join([
        f'              <li><a href="{href}"><span class="toc-num">{num}</span><span>{text}<small>{sub}</small></span></a></li>'
        for href, num, text, sub in toc_items
    ])
    progress_html = make_page_progress(page_num)

    return f'''    <!-- ============ PAGE HERO ============ -->
    <section class="hero page-hero" id="top" aria-labelledby="page-title">
      <div class="container hero-grid">
        <div>
          <span class="eyebrow"><span class="dot" aria-hidden="true"></span>{eyebrow}</span>
          <h1 id="page-title">{title}</h1>
          <p class="lead">{lead}</p>
{progress_html}
        </div>
        <div class="toc-card" aria-label="On this page">
          <div class="label">On this page</div>
          <ol>
{toc_links}
          </ol>
        </div>
      </div>
    </section>'''

def make_pager(prev_link, prev_title, prev_sub, next_link, next_title, next_sub, page_num, total_pages=6):
    prev_html = ''
    if prev_link:
        prev_html = f'''        <a class="pager-link prev" href="{prev_link}">
          <span class="pager-dir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Previous
          </span>
          <span class="pager-title">{prev_title}</span>
          <span class="pager-sub">{prev_sub}</span>
        </a>'''

    next_html = ''
    if next_link:
        next_html = f'''        <a class="pager-link next" href="{next_link}">
          <span class="pager-dir">
            Next
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </span>
          <span class="pager-title">{next_title}</span>
          <span class="pager-sub">{next_sub}</span>
        </a>'''

    return f'''    <!-- ============ PAGER ============ -->
    <section class="pager-section">
      <div class="container">
        <nav class="pager" aria-label="Guide pagination">
{prev_html}
{next_html}
        </nav>
        <p class="pager-count">Part {page_num} of {total_pages} in The Science of Tick-Tock</p>
      </div>
    </section>'''

def make_footer(scripts=['js/main.js']):
    script_tags = '\n'.join([f'  <script src="{s}" defer></script>' for s in scripts])
    return f'''  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a class="brand" href="index.html" id="footer-brand">
            <span class="brand-mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#fff" stroke-width="1.8">
                <circle cx="12" cy="12" r="2.2" fill="#fff" />
                <ellipse cx="12" cy="12" rx="9" ry="3.6" />
                <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
                <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
              </svg></span>
            The Science of Tick-Tock
          </a>
          <p style="margin-top:1rem;max-width:32em">An educational explainer on precision timing and optical atomic
            clocks. Figures are rounded for clarity; see the further reading for precise values.</p>
        </div>
        <div>
          <h2>Further reading</h2>
          <ul>
            <li><a href="https://www.nist.gov/atomic-clocks" rel="noopener" target="_blank">NIST — Atomic clocks</a>
            </li>
            <li><a href="https://www.bipm.org/en/si-base-units/second" rel="noopener" target="_blank">BIPM — The SI
                second</a></li>
            <li><a href="https://www.npl.co.uk/time" rel="noopener" target="_blank">National Physical Laboratory —
                Time</a></li>
            <li><a href="https://www.nobelprize.org/prizes/physics/2005/summary/" rel="noopener" target="_blank">Nobel
                Prize 2005 — Frequency comb</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">Made for curious minds. Strontium tick rate: 429,228,004,229,873 Hz.</div>
    </div>
  </footer>

{script_tags}

  <!-- Vercel Web Analytics -->
  <script>
    window.va = window.va || function () {{ (window.vaq = window.vaq || []).push(arguments); }};
  </script>
  <script defer src="/_vercel/insights/script.js"></script>

  <!-- Vercel Speed Insights -->
  <script>
    window.si = window.si || function () {{ (window.siq = window.siq || []).push(arguments); }};
  </script>
  <script defer src="/_vercel/speed-insights/script.js"></script>
</body>

</html>'''

def make_doc(title, desc, current_page, body_content, scripts=['js/main.js']):
    header_html = make_header(current_page)
    footer_html = make_footer(scripts)

    return f'''<!DOCTYPE html>
<html lang="en" class="no-js">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#7c3aed">
  <link rel="icon"
    href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%237c3aed'/%3E%3Ccircle cx='16' cy='16' r='3' fill='white'/%3E%3Cellipse cx='16' cy='16' rx='11' ry='4.5' fill='none' stroke='white' stroke-width='1.6'/%3E%3Cellipse cx='16' cy='16' rx='11' ry='4.5' fill='none' stroke='white' stroke-width='1.6' transform='rotate(60 16 16)'/%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap"
    rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
  <script>
    // Apply theme before paint to avoid a flash.
    (function () {{
      document.documentElement.classList.remove('no-js');
      var saved = localStorage.getItem('theme');
      var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    }})();
  </script>
</head>

<body>
  <a class="skip-link" href="#main">Skip to content</a>

{header_html}

  <main id="main">
{body_content}
  </main>

{footer_html}'''

# ==============================================================================
# 1. index.html
# ==============================================================================
guide_map_sec = '''    <!-- ============ GUIDE MAP ============ -->
    <section class="section section-alt" id="chapters" aria-labelledby="map-title">
      <div class="container">
        <div class="section-head reveal">
          <span class="kicker">Explore the guide</span>
          <h2 id="map-title">Six chapters in precision time</h2>
          <p>Read sequentially or jump straight into the labs and simulations that interest you most.</p>
        </div>
        <ol class="guide-map reveal">
          <li>
            <a href="#why" aria-current="page">
              <span class="gm-num">Part 01</span>
              <h3>Why Time Matters</h3>
              <p>GPS, telecoms, power grids, and high-frequency trading: why a single microsecond error breaks modern networks.</p>
              <span class="gm-go">Read Chapter 01 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </a>
          </li>
          <li>
            <a href="clocks.html">
              <span class="gm-num">Part 02</span>
              <h3>Clocks &amp; Atoms</h3>
              <p>The three parts of every clock, five centuries of precision history, and why atoms make nature\'s perfect tuning forks.</p>
              <span class="gm-go">Explore Clocks &amp; Atoms <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </a>
          </li>
          <li>
            <a href="optical.html">
              <span class="gm-num">Part 03</span>
              <h3>Optical Standards</h3>
              <p>Visible light ticks 50,000× faster than microwaves. See how scientists cool and trap strontium atoms in laser lattices.</p>
              <span class="gm-go">Discover Optical Clocks <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </a>
          </li>
          <li>
            <a href="precision.html">
              <span class="gm-num">Part 04</span>
              <h3>Precision &amp; Spacetime</h3>
              <p>Clocks that drift once in 40 billion years — and are so sensitive to gravity they measure height shifts of 1 centimetre.</p>
              <span class="gm-go">Test Gravity &amp; Precision <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </a>
          </li>
          <li>
            <a href="sync.html" class="is-new">
              <span class="gm-num">Part 05 · Simulation</span>
              <h3>Losing Sync: 5G Towers</h3>
              <p>Simulate adverse effects when 5G towers lose GPS, see inter-cell collisions, and test portable optical clock holdover.</p>
              <span class="gm-go">Run 5G Simulations <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </a>
          </li>
          <li>
            <a href="quiz.html">
              <span class="gm-num">Part 06</span>
              <h3>Quiz &amp; Glossary</h3>
              <p>Consolidate your knowledge with our interactive seven-question quiz and comprehensive plain-English glossary.</p>
              <span class="gm-go">Take the Quiz <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
            </a>
          </li>
        </ol>
      </div>
    </section>'''

# Adjust hero quiz link to point to quiz.html
index_hero = hero_sec.replace('href="#quiz"', 'href="quiz.html"')

index_pager = make_pager(
    None, '', '',
    'clocks.html', 'Part 02: Clocks & Atoms', 'What is a clock, history, & atomic resonance',
    1
)

index_body = f'''{index_hero}
{guide_map_sec}
{why_sec}
{index_pager}'''

index_doc = make_doc(
    "The Science of Tick-Tock — How Optical Atomic Clocks Achieve Precision Timing",
    "An interactive educational guide: why precise timing matters, how atomic clocks work, and how optical atomic clocks split the second into 429 trillion ticks.",
    "index.html",
    index_body
)

# ==============================================================================
# 2. clocks.html
# ==============================================================================
clocks_hero = make_page_hero(
    "Part 02 · Fundamentals of Timekeeping",
    "Oscillators, gears, and <span class=\"grad\">nature's tuning forks</span>",
    "Strip away the casing, and every clock ever made has the same three ingredients. Discover five centuries of timekeeping history and why atoms provide an unshakeable reference.",
    2,
    [
        ('#clocks', '02', 'What is a clock?', 'Oscillator, counter, reference & waves'),
        ('#osc-list', 'LAB', 'Oscillator comparison', 'Interactive audio-visual wave frequencies'),
        ('#atoms', '03', 'Atoms as tuning forks', 'Quantum energy levels & laser locking'),
        ('#resonance-lab', 'LAB', 'Lab 2: Tune the laser', 'Interactive atomic resonance simulation')
    ]
)

clocks_pager = make_pager(
    'index.html', 'Part 01: Why Time Matters', 'GPS, telecoms, power grids, & finance',
    'optical.html', 'Part 03: Optical Standards', 'Why go optical & inside the lattice clock',
    2
)

clocks_body = f'''{clocks_hero}
{clocks_sec}
{atoms_sec}
{clocks_pager}'''

clocks_doc = make_doc(
    "Clocks & Atoms — The Science of Tick-Tock",
    "What actually is a clock? Discover the three essential clock components, the history of timekeeping, and why identical atoms make nature's perfect tuning forks.",
    "clocks.html",
    clocks_body
)

# ==============================================================================
# 3. optical.html
# ==============================================================================
optical_hero = make_page_hero(
    "Part 03 · The Optical Revolution",
    "Splitting time into <span class=\"grad\">trillions of oscillations</span>",
    "Visible light oscillates tens of thousands of times faster than microwaves. Explore how optical lattice clocks trap thousands of neutral atoms in grids of light to achieve unprecedented accuracy.",
    3,
    [
        ('#optical', '04', 'Why go optical?', 'Microwave vs optical & the ruler analogy'),
        ('#inside', '05', 'Inside a lattice clock', 'Laser cooling, light egg-cartons & combs'),
        ('#steps', 'SYS', 'Four-step cycle', 'Cool, trap, probe with 698 nm, and count')
    ]
)

optical_pager = make_pager(
    'clocks.html', 'Part 02: Clocks & Atoms', 'Oscillators, history, & atomic resonance',
    'precision.html', 'Part 04: Precision & Gravity', 'How precise is precise, & relativistic geodesy',
    3
)

optical_body = f'''{optical_hero}
{optical_sec}
{inside_sec}
{optical_pager}'''

optical_doc = make_doc(
    "Why Go Optical? — The Science of Tick-Tock",
    "Discover why optical atomic clocks outperform microwave caesium standards by tens of thousands of times, and look inside an optical lattice clock.",
    "optical.html",
    optical_body
)

# ==============================================================================
# 4. precision.html
# ==============================================================================
precision_hero = make_page_hero(
    "Part 04 · Extreme Precision & General Relativity",
    "Clocks that drift once in <span class=\"grad\">40 billion years</span>",
    "The world's best optical atomic clocks are so sensitive they can detect Einstein's gravitational time dilation when raised by just a single centimetre. Discover what this unlocks for science.",
    4,
    [
        ('#precision', '06', 'How precise is "precise"?', 'Lab 3: Time to drift by 1 second chart'),
        ('#gravity', '07', 'Clocks that feel gravity', 'General relativity & Lab 4: Raise the clock'),
        ('#future', '08', 'What comes next?', 'Redefining the second, geodesy & dark matter')
    ]
)

precision_pager = make_pager(
    'optical.html', 'Part 03: Optical Standards', 'Why visible light beats microwaves',
    'sync.html', 'Part 05: Losing Sync (5G)', 'Interactive simulations of network clock failure',
    4
)

precision_body = f'''{precision_hero}
{precision_sec}
{gravity_sec}
{future_sec}
{precision_pager}'''

precision_doc = make_doc(
    "Precision, Gravity & Future — The Science of Tick-Tock",
    "Explore how optical clocks measure gravitational time dilation over centimetres, and how metrologists plan to redefine the SI second.",
    "precision.html",
    precision_body
)

# ==============================================================================
# 5. sync.html
# ==============================================================================
sync_hero = make_page_hero(
    "Part 05 · Critical Infrastructure & Adverse Effects",
    "When synchronization fails: <span class=\"grad\">5G towers &amp; portable clocks</span>",
    "Every 5G cell tower, power grid, and trading exchange relies on nanosecond-level synchronization. Explore what happens when GPS signals are lost or jammed, simulate inter-cell collisions, and discover how deployable optical atomic clocks maintain holdover.",
    5,
    [
        ('#tdd', '09', 'Why 5G towers share a heartbeat', 'Time-division duplexing & Lab 5 frame lab'),
        ('#jam', 'SIM', 'Lab 6: Jam the GPS', 'Interactive 7-tower network collision simulation'),
        ('#holdover', 'LAB', 'Lab 7: The Holdover Race', 'Quartz vs Rubidium vs Caesium vs Optical'),
        ('#optical-help', 'FIX', 'How portable optical clocks help', 'Regional hub architecture & 4-year holdover')
    ]
)

sync_pager = make_pager(
    'precision.html', 'Part 04: Precision & Gravity', 'Gravitational redshift & future applications',
    'quiz.html', 'Part 06: Quiz & Glossary', 'Test your understanding with 7 questions',
    5
)

sync_body_full = f'''{sync_hero}
{sync_body}
{sync_pager}'''

sync_doc = make_doc(
    "Simulations: Adverse Effects of Loss of Sync (5G Towers) — The Science of Tick-Tock",
    "Interactive simulations of timing loss in 5G cellular networks: TDD inter-cell collisions, GPS jamming holdover race, and how portable optical atomic clocks provide resilient holdover.",
    "sync.html",
    sync_body_full,
    scripts=['js/main.js', 'js/sync.js']
)

# ==============================================================================
# 6. quiz.html
# ==============================================================================
quiz_hero = make_page_hero(
    "Part 06 · Review & Reference",
    "Test your understanding &amp; <span class=\"grad\">plain-English glossary</span>",
    "Consolidate what you have learned about atomic transitions, optical lattices, relativistic time dilation, and 5G network synchronization with our interactive quiz and terminology guide.",
    6,
    [
        ('#quiz', 'QUIZ', 'Interactive quiz', 'Seven questions with full answer explanations'),
        ('#glossary', 'REF', 'Glossary', 'Plain-English definitions of ten key metrology terms')
    ]
)

quiz_pager = make_pager(
    'sync.html', 'Part 05: Losing Sync (5G)', 'Interactive simulations of network timing failure',
    'index.html', 'Return to Start: Why Time Matters', 'Back to Part 01 and the atomic second overview',
    6
)

quiz_body = f'''{quiz_hero}
{quiz_sec}
{glossary_sec}
{quiz_pager}'''

quiz_doc = make_doc(
    "Quiz & Glossary — The Science of Tick-Tock",
    "Test your knowledge of atomic clocks, precision timekeeping, and 5G network holdover with an interactive 7-question quiz and plain-English glossary.",
    "quiz.html",
    quiz_body
)

# ==============================================================================
# Write all files
# ==============================================================================
pages = {
    'index.html': index_doc,
    'clocks.html': clocks_doc,
    'optical.html': optical_doc,
    'precision.html': precision_doc,
    'sync.html': sync_doc,
    'quiz.html': quiz_doc
}

for filename, content in pages.items():
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Wrote {filename} ({len(content)} bytes)')

print('All 6 pages generated successfully!')
