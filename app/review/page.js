'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BackgroundOrbs } from '@/components/background-orbs';
import { LogoMark } from '@/components/logo-mark';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import {
  DEFAULT_PROJECT_DESCRIPTION,
  formatDate,
  getStatusLabel,
  getStatusTone,
  isSupabaseConfigured
} from '@/lib/site';

function ReviewPageInner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');
  const [project, setProject] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [decision, setDecision] = useState('');
  const [annotationMode, setAnnotationMode] = useState(false);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState({
    loading: true,
    saving: false
  });
  const [message, setMessage] = useState({
    type: '',
    text: ''
  });

  useEffect(() => {
    let ignore = false;

    async function loadReviewData() {
      if (!projectId) {
        setBusy({ loading: false, saving: false });
        setMessage({ type: 'error', text: 'Missing project id in the review link.' });
        return;
      }

      if (!isSupabaseConfigured()) {
        setBusy({ loading: false, saving: false });
        setMessage({ type: 'error', text: 'Supabase is not configured yet.' });
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data: projectRows, error: projectError }, { data: feedbackRows, error: feedbackError }] = await Promise.all([
          supabase.from('projects').select('*').eq('id', projectId).limit(1),
          supabase.from('feedback').select('*').eq('project_id', projectId).order('created_at', { ascending: true })
        ]);

        if (projectError) throw projectError;
        if (feedbackError) throw feedbackError;
        if (!projectRows?.length) throw new Error('Project not found.');

        if (!ignore) {
          setProject(projectRows[0]);
          setAnnotations(
            (feedbackRows || [])
              .filter((item) => item.type === 'annotation')
              .map((item) => ({ ...item, persisted: true }))
          );
          const savedDecision = (feedbackRows || []).find((item) => item.type === 'decision');
          setDecision(savedDecision?.value || '');
          setBusy({ loading: false, saving: false });
        }
      } catch (error) {
        if (!ignore) {
          setBusy({ loading: false, saving: false });
          setMessage({ type: 'error', text: error.message || 'Review page could not be loaded.' });
        }
      }
    }

    loadReviewData();
    return () => {
      ignore = true;
    };
  }, [projectId]);

  const statusTone = useMemo(() => getStatusTone(project?.status || 'pending'), [project]);

  function handleAnnotationClick(event) {
    if (!annotationMode) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    setPendingPoint({
      x_percent: ((event.clientX - bounds.left) / bounds.width) * 100,
      y_percent: ((event.clientY - bounds.top) / bounds.height) * 100
    });
  }

  function savePendingAnnotation() {
    if (!pendingPoint || !comment.trim()) return;

    const nextAnnotation = {
      id: crypto.randomUUID(),
      x_percent: pendingPoint.x_percent,
      y_percent: pendingPoint.y_percent,
      comment: comment.trim(),
      type: 'annotation',
      project_id: project.id,
      persisted: false
    };

    setAnnotations((current) => [...current, nextAnnotation]);
    setPendingPoint(null);
    setComment('');
  }

  async function submitFeedback() {
    if (!decision) {
      setMessage({ type: 'error', text: 'Choose Approved or Needs Changes before submitting.' });
      return;
    }

    if (decision === 'needs_changes' && annotations.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one annotation when requesting changes.' });
      return;
    }

    setBusy((current) => ({ ...current, saving: true }));
    setMessage({ type: '', text: '' });

    try {
      const supabase = getSupabaseBrowserClient();
      const unsavedAnnotations = annotations.filter((item) => !item.persisted);

      if (unsavedAnnotations.length) {
        const { error: annotationError } = await supabase.from('feedback').insert(
          unsavedAnnotations.map((item) => ({
            project_id: project.id,
            type: 'annotation',
            x_percent: item.x_percent,
            y_percent: item.y_percent,
            comment: item.comment
          }))
        );

        if (annotationError) throw annotationError;
      }

      await supabase.from('feedback').delete().eq('project_id', project.id).eq('type', 'decision');

      const { error: decisionError } = await supabase.from('feedback').insert({
        project_id: project.id,
        type: 'decision',
        value: decision
      });
      if (decisionError) throw decisionError;

      const { error: projectError } = await supabase.from('projects').update({ status: decision }).eq('id', project.id);
      if (projectError) throw projectError;

      setAnnotations((current) => current.map((item) => ({ ...item, persisted: true })));
      setProject((current) => ({ ...current, status: decision }));
      setMessage({ type: 'success', text: 'Feedback saved successfully.' });
      setAnnotationMode(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Feedback could not be saved.' });
    } finally {
      setBusy((current) => ({ ...current, saving: false }));
    }
  }

  if (busy.loading) {
    return (
      <>
        <BackgroundOrbs />
        <main className="gate-shell">
          <div className="empty-panel glass-window">Loading review page...</div>
        </main>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <BackgroundOrbs />
        <main className="gate-shell">
          <div className="gate-card glass-window gate-card--center">
            <LogoMark center />
            <h1>Project not found</h1>
            <p>{message.text || 'The review link is invalid or the project was removed.'}</p>
            <Link className="button button--ghost" href="/">
              Back to homepage
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <BackgroundOrbs />
      <main className="review-shell">
        <header className="review-topbar">
          <div className="review-topbar__edge">
            <span className={`pill ${statusTone}`}>{getStatusLabel(project.status)}</span>
          </div>
          <div className="review-topbar__brand glass-window">
            <LogoMark center />
          </div>
          <div className="review-topbar__edge review-topbar__edge--right">
            <Link className="button button--ghost" href="/">
              Homepage
            </Link>
          </div>
        </header>

        <section className="review-intro glass-window">
          <div className="review-intro__copy">
            <span className="eyebrow">Client review</span>
            <h1>{project.title}</h1>
            <p>
              {project.client_name || 'Aura Design'} · {formatDate(project.created_at)}
            </p>
            <p>{project.description || DEFAULT_PROJECT_DESCRIPTION}</p>
          </div>
          <div className="review-intro__actions">
            <a className="button button--primary" href={project.file_url} download>
              Download file
            </a>
            <button
              className={`button button--ghost ${annotationMode ? 'is-active' : ''}`}
              onClick={() => setAnnotationMode((current) => !current)}
            >
              {annotationMode ? 'Stop annotating' : 'Add comment marker'}
            </button>
          </div>
        </section>

        {message.text ? <div className={`alert alert--${message.type || 'info'}`}>{message.text}</div> : null}

        <section className="review-layout">
          <div className="review-canvas glass-window">
            <div className="review-canvas__hint">
              {annotationMode ? 'Click directly on the artwork to place a marker.' : 'Switch on markers to leave exact feedback.'}
            </div>
            <div className={`canvas-stage ${annotationMode ? 'annotation-mode' : ''}`} onClick={handleAnnotationClick}>
              {project.file_type === 'pdf' ? (
                <iframe src={project.file_url} title={project.title} />
              ) : (
                <img src={project.file_url} alt={project.title} />
              )}

              <div className="canvas-overlay">
                {annotations.map((item, index) => (
                  <button
                    key={item.id}
                    className="marker"
                    style={{ left: `${item.x_percent}%`, top: `${item.y_percent}%` }}
                    type="button"
                  >
                    {index + 1}
                    <span className="marker__tooltip">{item.comment}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="review-sidebar">
            <section className="glass-window sidebar-card">
              <div className="window-heading">
                <div>
                  <span className="eyebrow">Comment thread</span>
                  <h2>Feedback markers</h2>
                </div>
                <span className="pill soft">{annotations.length}</span>
              </div>
              <div className="comment-list">
                {annotations.length === 0 ? (
                  <div className="feedback-item">No comments yet. Add a marker on the design.</div>
                ) : (
                  annotations.map((item, index) => (
                    <div className="feedback-item" key={item.id}>
                      <strong>Marker {index + 1}</strong>
                      <p>{item.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="glass-window sidebar-card">
              <div className="window-heading">
                <div>
                  <span className="eyebrow">Decision</span>
                  <h2>Final response</h2>
                </div>
              </div>
              <div className="decision-row">
                <button
                  className={`decision-button decision-button--success ${decision === 'approved' ? 'active' : ''}`}
                  onClick={() => setDecision('approved')}
                >
                  Approved
                </button>
                <button
                  className={`decision-button decision-button--warning ${decision === 'needs_changes' ? 'active' : ''}`}
                  onClick={() => setDecision('needs_changes')}
                >
                  Needs Changes
                </button>
              </div>
              <button className="button button--primary button--full" onClick={submitFeedback} disabled={busy.saving}>
                {busy.saving ? 'Saving feedback...' : 'Submit feedback'}
              </button>
            </section>
          </aside>
        </section>

        {pendingPoint ? (
          <div className="modal-backdrop" onClick={() => setPendingPoint(null)}>
            <div className="modal glass-window" onClick={(event) => event.stopPropagation()}>
              <div className="modal__header">
                <div>
                  <span className="eyebrow">New annotation</span>
                  <h2>Add comment</h2>
                </div>
              </div>
              <textarea
                className="input textarea"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Describe the requested change at this spot."
              />
              <div className="modal__actions">
                <button className="button button--ghost" onClick={() => setPendingPoint(null)}>
                  Cancel
                </button>
                <button className="button button--primary" onClick={savePendingAnnotation}>
                  Save marker
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <>
          <BackgroundOrbs />
          <main className="gate-shell">
            <div className="empty-panel glass-window">Loading review page...</div>
          </main>
        </>
      }
    >
      <ReviewPageInner />
    </Suspense>
  );
}
