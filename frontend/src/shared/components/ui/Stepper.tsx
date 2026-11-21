import { cn } from '@/shared/utils/cn';
import { toFaDigits } from '@/shared/utils/num';
import { Icon } from './Icon';

export interface Step {
  key: string;
  label: string;
}

export interface StepperProps {
  steps: Step[];
  /** شمارهٔ مرحلهٔ جاری از ۱. */
  current: number;
  className?: string;
}

/**
 * نوار مراحل — `.steps` / `.step` در kit.css.
 * ویزارد پروژهٔ جدید (۴ مرحله) و ورود از MSP (۳ مرحله).
 */
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <ol
      className={cn('steps', className)}
      aria-label={`مرحلهٔ ${toFaDigits(current)} از ${toFaDigits(steps.length)}`}
    >
      {steps.map((step, index) => {
        const number = index + 1;
        const isDone = number < current;
        const isCurrent = number === current;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.key}
            className={cn('step', isCurrent && 'on', isDone && 'done')}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="n">
              {isDone ? <Icon name="check" size={13} strokeWidth={3} /> : toFaDigits(number)}
            </span>
            <span className="t">{step.label}</span>
            {!isLast && <span className="bar" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
