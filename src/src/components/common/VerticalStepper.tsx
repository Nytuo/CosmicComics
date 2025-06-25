import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button.tsx';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VerticalStepper({
  steps,
  onFinish,
}: {
  steps: any[];
  onFinish: any;
}) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = React.useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    if (activeStep === steps.length - 1) {
      onFinish();
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <div className="w-full space-y-4">
      {steps.map((step, index) => (
        <div key={step.label} className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                index < activeStep
                  ? 'border-primary bg-primary text-primary-foreground'
                  : index === activeStep
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {index < activeStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div>
              <p
                className={cn(
                  'text-sm font-medium',
                  index <= activeStep
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {step.label}
              </p>
              {index === steps.length - 1 && (
                <p className="text-xs text-muted-foreground">
                  {t('Last_step')}
                </p>
              )}
            </div>
          </div>

          {index === activeStep && (
            <div className="ml-11 space-y-4">
              {step.content}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleNext}>
                  {index === steps.length - 1 ? t('finish') : t('Continue')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={handleBack}
                >
                  {t('back')}
                </Button>
              </div>
            </div>
          )}

          {index < steps.length - 1 && (
            <div className="absolute left-3.75 top-10 h-[calc(100%-24px)] w-0.5 bg-border" />
          )}
        </div>
      ))}

      {activeStep === steps.length && (
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            {t('All_steps_completed')}
          </p>
          <Button variant="outline" size="sm" onClick={handleReset}>
            {t('reset')}
          </Button>
        </div>
      )}
    </div>
  );
}
