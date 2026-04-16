import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  { id: 1, name: 'Select Doctor', description: 'Choose your specialist' },
  { id: 2, name: 'Pick a Slot', description: 'Choose date and time' },
  { id: 3, name: 'Details', description: 'Reason for consultation' },
  { id: 4, name: 'Review', description: 'Confirm and pay' },
];

export default function BookingStepper({ currentStep }) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="divide-y divide-gray-200 rounded-md border border-gray-200 md:flex md:divide-y-0 bg-card shadow-sm">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className="relative md:flex md:flex-1">
            {step.id < currentStep ? (
              <div className="group flex w-full items-center">
                <span className="flex items-center px-6 py-4 text-sm font-medium">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <Check className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
                  </span>
                  <span className="ml-4 text-sm font-medium text-foreground">{step.name}</span>
                </span>
              </div>
            ) : step.id === currentStep ? (
              <div className="flex items-center px-6 py-4 text-sm font-medium" aria-current="step">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary">
                  <span className="text-primary">{step.id}</span>
                </span>
                <span className="ml-4 text-sm font-medium text-primary">{step.name}</span>
              </div>
            ) : (
              <div className="group flex items-center">
                <span className="flex items-center px-6 py-4 text-sm font-medium">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-muted">
                    <span className="text-muted-foreground">{step.id}</span>
                  </span>
                  <span className="ml-4 text-sm font-medium text-muted-foreground">{step.name}</span>
                </span>
              </div>
            )}

            {stepIdx !== steps.length - 1 ? (
              <>
                {/* Arrow separator for md screens and up */}
                <div className="absolute right-0 top-0 hidden h-full w-5 md:block" aria-hidden="true">
                  <svg
                    className="h-full w-full text-gray-300"
                    viewBox="0 0 22 80"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 -2L20 40L0 82"
                      vectorEffect="non-scaling-stroke"
                      stroke="currentcolor"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
