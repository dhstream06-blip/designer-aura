'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BackgroundOrbs } from '@/components/background-orbs';
import { LogoMark } from '@/components/logo-mark';
import { ProjectCard } from '@/components/project-card';
import { ProjectPreviewModal } from '@/components/project-preview-modal';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { categoryOptions, isSupabaseConfigured } from '@/lib/site';

const filters = [{ value: 'all', label: 'All' }, ...categoryOptions];

export default function HomePage() {
  const [projects, setProjects] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeProject, setActiveProject] = useState(null);
  const [state, setState] = useState({
    loading: true,
    error: ''
  });

  useEffect(() => {
    let ignore = false;

    async function loadProjects() {
      if (!isSupabaseConfigured()) {
        setState({
          loading: false,
          error: 'Add your Supabase credentials in .env.local before loading the public gallery.'
        });
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (!ignore) {
          setProjects(data || []);
          setState({ loading: false, error: '' });
        }
      } catch (error) {
        if (!ignore) {
          setState({
            loading: false,
            error: error.message || 'Projects could not be loaded from Supabase.'
          });
        }
      }
    }

    loadProjects();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    if (activeFilter === 'all') return projects;
    return projects.filter((project) => project.category === activeFilter);
  }, [activeFilter, projects]);

  return (
    <>
      <BackgroundOrbs />
      <main className="site-shell">
        <header className="topbar glass-panel">
          <nav className="topbar__nav">
            <a href="#gallery">Gallery</a>
            <a href="#process">Process</a>
          </nav>
          <LogoMark />
          <div className="topbar__actions">
            <span className="status-chip">Next.js + Supabase</span>
            <Link className="button button--ghost" href="/admin">
              Admin
            </Link>
          </div>
        </header>

        <section className="hero">
          <div className="hero__copy">
            <span className="eyebrow">Permanent design sharing for flyers, posters, menus, and campaign visuals</span>
            <h1>
              Dark liquid-glass
              <br />
              portfolio with
              <span className="gradient-text"> live client review</span>
            </h1>
            <p>
              Aura Design keeps uploads inside Supabase Storage, shows them in a polished public gallery, and opens a
              dedicated review page where clients can approve, request changes, and annotate directly on the artwork.
            </p>
            <div className="hero__actions">
              <a className="button button--primary" href="#gallery">
                Browse Projects
              </a>
              <Link className="button button--ghost" href="/admin">
                Open Dashboard
              </Link>
            </div>
            <div className="hero__stats">
              <div className="glass-panel stat-card">
                <strong>{projects.length}</strong>
                <span>Projects synced from Supabase</span>
              </div>
              <div className="glass-panel stat-card">
                <strong>24/7</strong>
                <span>Available through GitHub Pages, Cloudflare, Netlify, or Vercel</span>
              </div>
              <div className="glass-panel stat-card">
                <strong>Mobile</strong>
                <span>Responsive dashboard and review tools for desktop and phone</span>
              </div>
            </div>
          </div>

          <div className="hero__visual glass-panel">
            <div className="hero__visual-core">
              <div className="hero__logo-circle">
                <LogoMark compact />
              </div>
              <div className="floating-panel panel-a">Cloudflare public links</div>
              <div className="floating-panel panel-b">Supabase file persistence</div>
              <div className="floating-panel panel-c">Client annotation workflow</div>
            </div>
          </div>
        </section>

        <section className="section" id="gallery">
          <div className="section__head">
            <div>
              <span className="eyebrow">Homepage Gallery</span>
              <h2>Every upload appears here and stays there after restart</h2>
            </div>
            <p className="section__lead">
              Files are not stored in browser memory. They live in Supabase Storage, so your dashboard and homepage
              stay in sync even after localhost stops and starts again.
            </p>
          </div>

          <div className="filter-row">
            {filters.map((filter) => (
              <button
                key={filter.value}
                className={`pill-button ${activeFilter === filter.value ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {state.loading ? (
            <div className="empty-panel glass-panel">Loading projects from Supabase...</div>
          ) : state.error ? (
            <div className="empty-panel glass-panel">{state.error}</div>
          ) : filteredProjects.length === 0 ? (
            <div className="empty-panel glass-panel">No projects yet. Upload your first flyer in the admin dashboard.</div>
          ) : (
            <div className="project-grid">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onClick={setActiveProject} />
              ))}
            </div>
          )}
        </section>

        <section className="section" id="process">
          <div className="section__head">
            <div>
              <span className="eyebrow">How It Works</span>
              <h2>Simple flow, permanent storage, public sharing</h2>
            </div>
          </div>
          <div className="feature-grid">
            <article className="feature-card glass-panel">
              <span className="feature-card__step">01</span>
              <h3>Upload in admin</h3>
              <p>Drag in an image or PDF, add a title, optional client name, and description, then store it directly in Supabase.</p>
            </article>
            <article className="feature-card glass-panel">
              <span className="feature-card__step">02</span>
              <h3>Generate client link</h3>
              <p>The dashboard creates a share link pointing to the review page, ready for GitHub Pages, Cloudflare, or your custom domain.</p>
            </article>
            <article className="feature-card glass-panel">
              <span className="feature-card__step">03</span>
              <h3>Review with markers</h3>
              <p>Clients open the design, add comments by clicking points on the artwork, and choose Approved or Needs Changes.</p>
            </article>
          </div>
        </section>
      </main>

      <ProjectPreviewModal project={activeProject} onClose={() => setActiveProject(null)} />
    </>
  );
}
