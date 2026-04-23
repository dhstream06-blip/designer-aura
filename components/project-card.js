import { formatDate, getCategoryLabel } from '@/lib/site';

export function ProjectCard({ project, onClick, interactive = true }) {
  const isPdf = project.file_type === 'pdf';

  return (
    <article
      className={`project-card glass-panel ${interactive ? 'interactive' : ''}`}
      onClick={interactive ? () => onClick(project) : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick(project);
              }
            }
          : undefined
      }
    >
      <div className="project-card__media">
        {isPdf ? (
          <div className="project-card__pdf">
            <span>PDF</span>
            <small>Document preview</small>
          </div>
        ) : (
          <img src={project.file_url} alt={project.title} loading="lazy" />
        )}
      </div>
      <div className="project-card__body">
        <span className="pill soft">{getCategoryLabel(project.category)}</span>
        <h3>{project.title}</h3>
        <p>{project.description || 'Shared design asset stored in Supabase.'}</p>
        <div className="project-card__meta">
          <span>{project.client_name || 'Public portfolio'}</span>
          <span>{formatDate(project.created_at)}</span>
        </div>
      </div>
    </article>
  );
}
