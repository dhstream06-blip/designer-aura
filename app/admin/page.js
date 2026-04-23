'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BackgroundOrbs } from '@/components/background-orbs';
import { LogoMark } from '@/components/logo-mark';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import {
  ADMIN_CODE,
  DEFAULT_PROJECT_DESCRIPTION,
  STORAGE_BUCKET,
  buildReviewUrl,
  categoryOptions,
  createProjectId,
  formatBytes,
  formatDate,
  getStatusLabel,
  getStatusTone,
  isSupabaseConfigured,
  normalizeDescription,
  sanitizeFileName
} from '@/lib/site';

const initialForm = {
  title: '',
  category: 'branding',
  client_name: '',
  description: ''
};

const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.pdf'];

function isSupportedFile(file) {
  if (!file) return false;
  if (file.type?.startsWith('image/') || file.type === 'application/pdf') return true;
  const lowerName = file.name?.toLowerCase() || '';
  return allowedExtensions.some((extension) => lowerName.endsWith(extension));
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [busy, setBusy] = useState({
    loadingProjects: true,
    loadingFeedback: false,
    uploading: false,
    deletingId: ''
  });
  const [message, setMessage] = useState({
    type: '',
    text: ''
  });
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    setAuthenticated(window.sessionStorage.getItem('aura-admin-auth') === 'true');
  }, []);

  useEffect(() => {
    if (!authenticated || !isSupabaseConfigured()) return;
    loadProjects();
  }, [authenticated]);

  useEffect(() => {
    if (authenticated && activeTab === 'feedback' && isSupabaseConfigured()) {
      loadFeedback();
    }
  }, [authenticated, activeTab]);

  const selectedPreviewUrl = useMemo(() => {
    if (!file || file.type === 'application/pdf') return '';
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
    };
  }, [selectedPreviewUrl]);

  const groupedFeedback = useMemo(() => {
    const titleMap = new Map(projects.map((project) => [project.id, project.title]));
    return feedback.reduce((collection, item) => {
      const bucket = collection[item.project_id] || {
        title: titleMap.get(item.project_id) || 'Untitled project',
        projectId: item.project_id,
        items: []
      };

      bucket.items.push(item);
      collection[item.project_id] = bucket;
      return collection;
    }, {});
  }, [feedback, projects]);

  const stats = useMemo(() => {
    const approved = projects.filter((project) => project.status === 'approved').length;
    const pending = projects.filter((project) => project.status === 'pending').length;
    return [
      { label: 'Projects', value: projects.length },
      { label: 'Pending', value: pending },
      { label: 'Approved', value: approved },
      { label: 'Feedback', value: feedback.length }
    ];
  }, [feedback.length, projects]);

  async function loadProjects() {
    setBusy((current) => ({ ...current, loadingProjects: true }));

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
      setMessage((current) => (current.type === 'error' ? { type: '', text: '' } : current));
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Projects could not be loaded from Supabase.'
      });
    } finally {
      setBusy((current) => ({ ...current, loadingProjects: false }));
    }
  }

  async function loadFeedback() {
    setBusy((current) => ({ ...current, loadingFeedback: true }));

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Feedback could not be loaded from Supabase.'
      });
    } finally {
      setBusy((current) => ({ ...current, loadingFeedback: false }));
    }
  }

  function handleAuthSubmit(event) {
    event.preventDefault();

    if (accessCode === ADMIN_CODE) {
      window.sessionStorage.setItem('aura-admin-auth', 'true');
      setAuthenticated(true);
      setAuthError('');
      return;
    }

    setAuthError('Wrong access code. Use 1040 unless you changed NEXT_PUBLIC_ADMIN_CODE.');
  }

  function handleFileSelection(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!isSupportedFile(selected)) {
      setMessage({ type: 'error', text: 'Only JPG, PNG, WEBP, SVG, and PDF files are allowed.' });
      return;
    }

    if (selected.size > 15 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Please keep uploads below 15 MB.' });
      return;
    }

    setFile(selected);
    setMessage({ type: '', text: '' });
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      setMessage({ type: 'error', text: 'Create .env.local with your Supabase credentials first.' });
      return;
    }

    if (!form.title.trim()) {
      setMessage({ type: 'error', text: 'Please add a project title.' });
      return;
    }

    if (!file) {
      setMessage({ type: 'error', text: 'Choose an image or PDF to upload.' });
      return;
    }

    setBusy((current) => ({ ...current, uploading: true }));
    setMessage({ type: '', text: '' });

    const supabase = getSupabaseBrowserClient();
    const projectId = createProjectId();
    const sanitizedName = sanitizeFileName(file.name);
    const storagePath = `${projectId}/${sanitizedName}`;
    const fileType = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';

    try {
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl }
      } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

      const payload = {
        id: projectId,
        title: form.title.trim(),
        category: form.category,
        client_name: form.client_name.trim() || null,
        description: normalizeDescription(form.description),
        file_url: publicUrl,
        file_type: fileType,
        storage_path: storagePath,
        status: 'pending'
      };

      const { error: insertError } = await supabase.from('projects').insert(payload);
      if (insertError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        throw insertError;
      }

      const nextLink = buildReviewUrl(projectId);
      setGeneratedLink(nextLink);
      setForm(initialForm);
      setFile(null);
      setMessage({ type: 'success', text: 'Project uploaded and stored in Supabase.' });
      await loadProjects();
      if (activeTab === 'feedback') await loadFeedback();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Upload failed.' });
    } finally {
      setBusy((current) => ({ ...current, uploading: false }));
    }
  }

  async function handleDelete(project) {
    if (!window.confirm(`Delete "${project.title}" and its feedback?`)) return;

    setBusy((current) => ({ ...current, deletingId: project.id }));
    const supabase = getSupabaseBrowserClient();

    try {
      const { error: deleteProjectError } = await supabase.from('projects').delete().eq('id', project.id);
      if (deleteProjectError) throw deleteProjectError;

      if (project.storage_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([project.storage_path]);
      }

      setMessage({ type: 'success', text: 'Project deleted.' });
      await loadProjects();
      if (activeTab === 'feedback') await loadFeedback();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Delete failed.' });
    } finally {
      setBusy((current) => ({ ...current, deletingId: '' }));
    }
  }

  async function copyLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      setMessage({ type: 'success', text: 'Client link copied to clipboard.' });
    } catch {
      setMessage({ type: 'error', text: 'Clipboard access was blocked in this browser.' });
    }
  }

  if (!authenticated) {
    return (
      <>
        <BackgroundOrbs />
        <main className="gate-shell">
          <section className="gate-card glass-window gate-card--center">
            <div className="brand-lockup">
              <LogoMark center />
              <span className="eyebrow">Secure access</span>
            </div>
            <div className="gate-copy">
              <h1>Open the Aura dashboard</h1>
              <p>Dark workspace for uploads, review links, and feedback in one calm control room.</p>
            </div>
            <form className="gate-form" onSubmit={handleAuthSubmit}>
              <input
                className="input"
                type="password"
                placeholder="Access code"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
              />
              {authError ? <div className="alert alert--error">{authError}</div> : null}
              <button className="button button--primary" type="submit">
                Open dashboard
              </button>
            </form>
            <Link className="button button--ghost button--full-mobile" href="/">
              Back to homepage
            </Link>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <BackgroundOrbs />
      <main className="dashboard-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar__edge">
            <span className="eyebrow">Aura control</span>
            <span className={`pill ${isSupabaseConfigured() ? 'success' : 'warning'}`}>
              {isSupabaseConfigured() ? 'Supabase connected' : 'Add .env.local'}
            </span>
          </div>
          <div className="dashboard-topbar__brand glass-window">
            <LogoMark center />
          </div>
          <div className="dashboard-topbar__edge dashboard-topbar__edge--right">
            <Link className="button button--ghost" href="/">
              Website
            </Link>
            <button
              className="button button--ghost"
              onClick={() => {
                window.sessionStorage.removeItem('aura-admin-auth');
                setAuthenticated(false);
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <section className="dashboard-hero">
          <div className="dashboard-hero__copy">
            <h1>Upload, track, and share without the layout falling apart.</h1>
            <p>
              The upload studio now keeps missing descriptions safe, shows the selected asset clearly, and keeps the
              admin windows cleaner on desktop and mobile.
            </p>
          </div>
          <div className="dashboard-stats">
            {stats.map((item) => (
              <div className="stat-tile glass-window" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="tab-strip glass-window">
          <button className={`segmented-button ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
            Upload
          </button>
          <button className={`segmented-button ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
            Projects
          </button>
          <button className={`segmented-button ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>
            Feedback
          </button>
        </section>

        {message.text ? <div className={`alert alert--${message.type || 'info'}`}>{message.text}</div> : null}

        {activeTab === 'upload' ? (
          <section className="workspace-grid">
            <form className="glass-window studio-window" onSubmit={handleUpload}>
              <div className="window-heading">
                <div>
                  <span className="eyebrow">Upload studio</span>
                  <h2>Send a new project into the library</h2>
                </div>
                <span className="pill soft">15 MB max</span>
              </div>

              <div className="upload-grid">
                <label className="field">
                  <span>Project title</span>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Summer flyer campaign"
                  />
                </label>
                <label className="field">
                  <span>Category</span>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Client name</span>
                  <input
                    className="input"
                    value={form.client_name}
                    onChange={(event) => setForm((current) => ({ ...current, client_name: event.target.value }))}
                    placeholder="Cafe Bloom"
                  />
                </label>
                <label className="field field--wide">
                  <span>Description</span>
                  <textarea
                    className="input textarea"
                    value={form.description}
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Optional. If left empty, Aura adds a clean default description."
                  />
                </label>
                <label className="upload-drop field--wide">
                  <input type="file" accept="image/*,.pdf" onChange={handleFileSelection} hidden />
                  <div className="upload-drop__inner">
                    <div className="upload-drop__icon" aria-hidden="true">
                      +
                    </div>
                    <strong>{file ? file.name : 'Choose artwork or PDF'}</strong>
                    <span>{file ? `${formatBytes(file.size)} ready to upload` : 'JPG, PNG, WEBP, SVG, or PDF'}</span>
                  </div>
                </label>
              </div>

              <div className="upload-actions">
                <button className="button button--primary" type="submit" disabled={busy.uploading}>
                  {busy.uploading ? 'Uploading to Supabase...' : 'Upload project'}
                </button>
                <button
                  className="button button--ghost"
                  type="button"
                  onClick={() => {
                    setForm(initialForm);
                    setFile(null);
                  }}
                >
                  Reset
                </button>
              </div>
            </form>

            <aside className="workspace-stack">
              <section className="glass-window side-window">
                <div className="window-heading">
                  <div>
                    <span className="eyebrow">Live preview</span>
                    <h2>Selected asset</h2>
                  </div>
                </div>
                <div className="asset-preview">
                  {file ? (
                    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? (
                      <div className="asset-preview__placeholder">
                        <strong>PDF ready</strong>
                        <span>{file.name}</span>
                      </div>
                    ) : (
                      <img src={selectedPreviewUrl} alt={file.name} />
                    )
                  ) : (
                    <div className="asset-preview__placeholder">
                      <strong>No file selected</strong>
                      <span>Pick an image or PDF to preview it here.</span>
                    </div>
                  )}
                </div>
                <div className="meta-list">
                  <div>
                    <span>Description fallback</span>
                    <strong>{DEFAULT_PROJECT_DESCRIPTION}</strong>
                  </div>
                  <div>
                    <span>Review link</span>
                    <strong>{generatedLink ? 'Generated after upload' : 'Will appear here'}</strong>
                  </div>
                </div>
              </section>

              <section className="glass-window side-window">
                <div className="window-heading">
                  <div>
                    <span className="eyebrow">Share output</span>
                    <h2>Client review link</h2>
                  </div>
                </div>
                {generatedLink ? (
                  <div className="share-box">
                    <span>Generated client link</span>
                    <div className="share-box__row">
                      <input className="input" readOnly value={generatedLink} />
                      <button className="button button--ghost" type="button" onClick={() => copyLink(generatedLink)}>
                        Copy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="share-box share-box--empty">
                    <span>The public review link appears here right after a successful upload.</span>
                  </div>
                )}
              </section>
            </aside>
          </section>
        ) : null}

        {activeTab === 'projects' ? (
          <section className="panel-stack">
            {busy.loadingProjects ? (
              <div className="empty-panel glass-window">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="empty-panel glass-window">No projects stored yet.</div>
            ) : (
              projects.map((project) => {
                const shareLink = buildReviewUrl(project.id);
                return (
                  <article className="dashboard-card glass-window" key={project.id}>
                    <div className="dashboard-card__media">
                      {project.file_type === 'pdf' ? (
                        <div className="project-card__pdf compact">
                          <span>PDF</span>
                          <small>Stored in Supabase</small>
                        </div>
                      ) : (
                        <img src={project.file_url} alt={project.title} />
                      )}
                    </div>
                    <div className="dashboard-card__body">
                      <div className="dashboard-card__head">
                        <div>
                          <h3>{project.title}</h3>
                          <p>
                            {project.client_name || 'Public gallery'} · {formatDate(project.created_at)}
                          </p>
                        </div>
                        <span className={`pill ${getStatusTone(project.status)}`}>{getStatusLabel(project.status)}</span>
                      </div>
                      <p>{project.description || DEFAULT_PROJECT_DESCRIPTION}</p>
                      <div className="dashboard-card__actions">
                        <button className="button button--ghost" onClick={() => copyLink(shareLink)}>
                          Copy client link
                        </button>
                        <a className="button button--ghost" href={shareLink} target="_blank" rel="noreferrer">
                          Open review
                        </a>
                        <a className="button button--ghost" href={project.file_url} download>
                          Download
                        </a>
                        <button
                          className="button button--danger"
                          onClick={() => handleDelete(project)}
                          disabled={busy.deletingId === project.id}
                        >
                          {busy.deletingId === project.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        ) : null}

        {activeTab === 'feedback' ? (
          <section className="panel-stack">
            {busy.loadingFeedback ? (
              <div className="empty-panel glass-window">Loading feedback...</div>
            ) : Object.keys(groupedFeedback).length === 0 ? (
              <div className="empty-panel glass-window">No client feedback yet.</div>
            ) : (
              Object.values(groupedFeedback).map((entry) => {
                const decision = entry.items.find((item) => item.type === 'decision');
                const annotations = entry.items.filter((item) => item.type === 'annotation');

                return (
                  <article className="dashboard-card glass-window dashboard-card--stacked" key={entry.projectId}>
                    <div className="dashboard-card__body">
                      <div className="dashboard-card__head">
                        <div>
                          <h3>{entry.title}</h3>
                          <p>{annotations.length} annotation comment(s)</p>
                        </div>
                        <span className={`pill ${getStatusTone(decision?.value || 'pending')}`}>
                          {getStatusLabel(decision?.value || 'pending')}
                        </span>
                      </div>
                      <div className="feedback-list">
                        {annotations.length === 0 ? (
                          <div className="feedback-item">No annotation comments yet.</div>
                        ) : (
                          annotations.map((item) => (
                            <div className="feedback-item" key={item.id}>
                              <strong>
                                Marker at {Number(item.x_percent).toFixed(0)}% / {Number(item.y_percent).toFixed(0)}%
                              </strong>
                              <p>{item.comment}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        ) : null}
      </main>
    </>
  );
}
