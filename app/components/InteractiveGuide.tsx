"use client"

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Sparkle,
} from '@phosphor-icons/react';

const GUIDE_STORAGE_KEY = 'bagel-guide-completed';
const GUIDE_STEP_KEY = 'bagel-guide-step';

export interface GuideStep {
  id: string;
  target: string; // CSS selector for the target element
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface InteractiveGuideProps {
  steps: GuideStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function InteractiveGuide({ steps, isOpen, onClose, onComplete }: InteractiveGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Calculate position of target element
  const updateTargetPosition = useCallback(() => {
    if (!step) return;

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate tooltip position based on step.position
      let x = 0, y = 0;
      const tooltipWidth = 320;
      const tooltipHeight = 180;
      const offset = 16;

      switch (step.position) {
        case 'bottom':
          x = rect.left + rect.width / 2 - tooltipWidth / 2;
          y = rect.bottom + offset;
          break;
        case 'top':
          x = rect.left + rect.width / 2 - tooltipWidth / 2;
          y = rect.top - tooltipHeight - offset;
          break;
        case 'left':
          x = rect.left - tooltipWidth - offset;
          y = rect.top + rect.height / 2 - tooltipHeight / 2;
          break;
        case 'right':
          x = rect.right + offset;
          y = rect.top + rect.height / 2 - tooltipHeight / 2;
          break;
      }

      // Keep tooltip within viewport
      x = Math.max(16, Math.min(x, window.innerWidth - tooltipWidth - 16));
      y = Math.max(16, Math.min(y, window.innerHeight - tooltipHeight - 16));

      setTooltipPosition({ x, y });
    }
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      updateTargetPosition();
      window.addEventListener('resize', updateTargetPosition);
      window.addEventListener('scroll', updateTargetPosition);

      // Save current step
      localStorage.setItem(GUIDE_STEP_KEY, currentStep.toString());

      return () => {
        window.removeEventListener('resize', updateTargetPosition);
        window.removeEventListener('scroll', updateTargetPosition);
      };
    }
  }, [isOpen, currentStep, updateTargetPosition]);

  // Load saved step on mount
  useEffect(() => {
    const savedStep = localStorage.getItem(GUIDE_STEP_KEY);
    if (savedStep) {
      const stepNum = parseInt(savedStep, 10);
      if (stepNum < steps.length) {
        setCurrentStep(stepNum);
      }
    }
  }, [steps.length]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
    localStorage.removeItem(GUIDE_STEP_KEY);
    onComplete();
    onClose();
    setCurrentStep(0);
  };

  const handleSkip = () => {
    localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
    localStorage.removeItem(GUIDE_STEP_KEY);
    onClose();
    setCurrentStep(0);
  };

  if (!isOpen || !step) return null;

  return (
    <>
      {/* Overlay with spotlight effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        style={{
          background: targetRect
            ? `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 20}px, rgba(0,0,0,0.6) ${Math.max(targetRect.width, targetRect.height) / 2 + 60}px)`
            : 'rgba(0,0,0,0.6)',
        }}
        onClick={handleSkip}
      />

      {/* Highlight ring around target */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed z-[101] pointer-events-none"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: 12,
            border: '2px solid #FF6B35',
            boxShadow: '0 0 0 4px rgba(255, 107, 53, 0.2), 0 0 20px rgba(255, 107, 53, 0.3)',
          }}
        >
          {/* Pulsing animation */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.2, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-xl border-2 border-[#FF6B35]"
          />
        </motion.div>
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed z-[102] w-80"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FFD23F]"
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Sparkle className="w-4 h-4 text-[#FF6B35]" weight="fill" />
                </motion.div>
                <span className="text-xs font-medium text-gray-500">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <button
                onClick={handleSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip tour
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-base font-semibold text-[#2D2D2A] mb-2"
              >
                {step.title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-gray-600 leading-relaxed"
              >
                {step.description}
              </motion.p>
            </div>

            {/* Step indicators */}
            <div className="flex justify-center gap-1.5 px-4 pb-3">
              {steps.map((_, index) => (
                <motion.button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  whileHover={{ scale: 1.2 }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? 'bg-[#FF6B35] w-4'
                      : index < currentStep
                      ? 'bg-[#FFD23F] w-1.5'
                      : 'bg-gray-200 w-1.5'
                  }`}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#F7F7F2] border-t border-gray-100">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  currentStep === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-[#2D2D2A] hover:bg-white'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF6B35] text-white rounded-lg text-sm font-medium hover:bg-[#E85A2A] transition-colors shadow-md shadow-[#FF6B35]/20"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" weight="bold" />
                    Done
                  </>
                ) : (
                  <>
                    Next
                    <motion.div
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.div>
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Arrow pointer */}
          <div
            className="absolute w-3 h-3 bg-white border-gray-200 transform rotate-45"
            style={{
              ...(step.position === 'bottom' && {
                top: -6,
                left: '50%',
                marginLeft: -6,
                borderTop: '1px solid',
                borderLeft: '1px solid',
                borderColor: '#e5e7eb',
              }),
              ...(step.position === 'top' && {
                bottom: -6,
                left: '50%',
                marginLeft: -6,
                borderBottom: '1px solid',
                borderRight: '1px solid',
                borderColor: '#e5e7eb',
              }),
              ...(step.position === 'left' && {
                right: -6,
                top: '50%',
                marginTop: -6,
                borderTop: '1px solid',
                borderRight: '1px solid',
                borderColor: '#e5e7eb',
              }),
              ...(step.position === 'right' && {
                left: -6,
                top: '50%',
                marginTop: -6,
                borderBottom: '1px solid',
                borderLeft: '1px solid',
                borderColor: '#e5e7eb',
              }),
            }}
          />
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// Hook to check if guide has been completed
export function useGuideStatus() {
  const [hasCompleted, setHasCompleted] = useState(true); // Default true to prevent flash
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(GUIDE_STORAGE_KEY);
    setHasCompleted(completed === 'true');
    setIsFirstVisit(completed === null);
  }, []);

  const resetGuide = () => {
    localStorage.removeItem(GUIDE_STORAGE_KEY);
    localStorage.removeItem(GUIDE_STEP_KEY);
    setHasCompleted(false);
    setIsFirstVisit(true);
  };

  return { hasCompleted, isFirstVisit, resetGuide };
}
