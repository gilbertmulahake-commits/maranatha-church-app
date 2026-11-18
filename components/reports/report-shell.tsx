import { ReportSelector } from './report-selector'

export function ReportShell({ 
  title, 
  description, 
  current,
  role,
  children 
}: { 
  title: string, 
  description: string, 
  current?: string,
  role: string,
  children: React.ReactNode 
}) {
  return (
    <div className="space-y-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">{title}</h1>
          <p className="mt-xs text-paragraph-small text-muted-foreground">{description}</p>
        </div>
        <ReportSelector current={current} role={role} />
      </div>
      <div>{children}</div>
    </div>
  )
}