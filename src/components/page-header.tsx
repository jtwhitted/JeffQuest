import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}
