import React from 'react';

interface Step {
  id: number;
  name: string;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: number;
}

export function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex items-center text-sm">
            <span 
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                index + 1 <= currentStep 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-neutral-300 text-neutral-600'
              }`}
            >
              {step.id}
            </span>
            <span 
              className={`ml-2 ${
                index + 1 <= currentStep 
                  ? 'text-neutral-900 font-medium' 
                  : 'text-neutral-500'
              }`}
            >
              {step.name}
            </span>
          </div>
          
          {index < steps.length - 1 && (
            <div className="ml-4 flex-1 border-t border-neutral-300"></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default ProgressStepper;
