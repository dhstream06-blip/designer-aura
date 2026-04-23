import { buildReviewUrl, formatDate, getCategoryLabel } from '@/lib/site';

export function ProjectPreviewModal({ project, onClose }) {
  if (!project) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal glass-panel modal--wide" onClick={(event) => event.stopPropagation()}>
        <button className="icon-button" onClick={onClose} aria-label="Close preview">
          ×
        </button>
        <div className="modal__header">
          <div>
            <span className="pill soft">{getCategoryLabel(project.category)}</span>
            <h2>{project.title}</h2>
            <p>{project.client_name || 'Aura Design shared gallery'}</p>
          </div>
          <span className="muted">{formatDate(project.created_at)}</span>
        </div>
        <p className="modal__description">
          {project.description || 'This project is stored in Supabase Storage and can be opened through its public review page.'}
        </p>
        <div className="preview-frame">
          {project.file_type === 'pdf' ? (
            <iframe src={project.file_url} title={project.title} />
          ) : (
            <img src={project.file_url} alt={project.title} />
          )}
        </div>
        <div className="modal__actions">
          <a className="button button--primary" href={project.file_url} download>
            Download
          </a>
          <a className="button button--ghost" href={buildReviewUrl(project.id)} target="_blank" rel="noreferrer">
            Open Client Review
          </a>
        </div>
      </div>
    </div>
  );
}
