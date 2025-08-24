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

  useEffect(() => {
    if (isOpen) {
      // Small delay to trigger entrance animation
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className={`relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all duration-300 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          {/* Content */}
          <div className="p-6">
            <div className="text-center">
              {/* Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
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
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="px-4 py-2"
                >
                  Got it
                </Button>
                {actionText && onAction && (
                  <Button
                    onClick={() => {
                      onAction();
                      onClose();
                    }}
                    className="px-4 py-2"
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