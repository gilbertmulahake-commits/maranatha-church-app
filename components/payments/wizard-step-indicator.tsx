import { Fragment } from 'react'

type WizardStepIndicatorProps = {
  current: 1 | 2 | 3 | 4 | 5
  labels: string[]
}

export function WizardStepIndicator({ current, labels }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-start w-full mb-6">
      {labels.map((label, i) => {
        const stepNum = (i + 1) as 1 | 2 | 3 | 4 | 5
        const isCompleted = stepNum < current
        const isCurrent = stepNum === current
        const dotClass =
          isCompleted || isCurrent
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        return (
          <Fragment key={i}>
            {i > 0 && (
              <div
                className={`flex-1 h-1 mt-2.5 mx-2 rounded-full ${
                  stepNum <= current ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${dotClass} ${
                  isCurrent ? 'ring-2 ring-primary/30' : ''
                }`}
              >
                {stepNum}
              </div>
              <span
                className={`text-paragraph-small text-center whitespace-nowrap ${
                  isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}