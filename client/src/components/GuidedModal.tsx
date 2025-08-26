import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GuidedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export default function GuidedModal({
  isOpen,
  onClose,
  title,
  description,
  actionText,
  onAction,
}: GuidedModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Small delay to trigger entrance animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // Match animation duration
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-all duration-500 ease-out ${
          isVisible ? 'bg-opacity-60 backdrop-blur-sm' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-500 ease-out ${
            isVisible 
              ? 'scale-100 opacity-100 translate-y-0' 
              : 'scale-90 opacity-0 translate-y-8'
          }`}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:bg-gray-100 rounded-full p-1"
          >
            <X className="h-5 w-5" />
          </button>
          
          {/* Content */}
          <div className="p-6">
            <div className="text-center">
              {/* Icon */}
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4 transition-all duration-300 ${
                isVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-12'
              }`}>
                <div className="text-2xl">✨</div>
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
              </h3>
              
              {/* Description */}
              <p className="text-gray-600 mb-6">
                {description}
              </p>
              
              {/* Actions */}
              <div className={`flex gap-3 justify-center transition-all duration-300 delay-200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="px-4 py-2 transition-all duration-200"
                >
                  Got it
                </Button>
                {actionText && onAction && (
                  <Button
                    onClick={() => {
                      onAction();
                      handleClose();
                    }}
                    className="px-4 py-2 transition-all duration-200"
                  >
                    {actionText}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}