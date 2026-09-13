import type { ReactNode } from "react";
export function PageHeader({eyebrow,title,description,children}:{eyebrow?:string;title:string;description?:string;children?:ReactNode}) {
  return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="muted mt-1">{description}</p>}</div><div className="row">{children}</div></header>;
}
export function EmptyState({title,description,children}:{title:string;description?:string;children?:ReactNode}) {
  return <div className="empty-state"><h3>{title}</h3>{description && <p className="muted">{description}</p>}{children}</div>;
}
