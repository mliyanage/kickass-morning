import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { generateSampleVoice } from '@/lib/openai';

interface VoiceItemProps {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  isSelected: boolean;
  onSelect: () => void;
}

export function VoiceItem({ id, name, description, imageUrl, isSelected, onSelect }: VoiceItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePreviewClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isPlaying && audioUrl) {
      // Stop playing
      setIsPlaying(false);
      return;
    }
    
    if (!audioUrl) {
      try {
        setIsLoading(true);
        // Generate the voice sample
        const sampleText = `Hello, this is ${name}. I'm here to help you wake up and start your day with energy and purpose.`;
        const url = await generateSampleVoice(id, sampleText);
        setAudioUrl(url);
        setIsPlaying(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to generate voice sample:', error);
        setIsLoading(false);
      }
    } else {
      // Start playing again
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative">
      <input 
        type="radio" 
        id={`voice-${id}`} 
        name="voice-selection" 
        value={id} 
        className="sr-only peer" 
        checked={isSelected}
        onChange={onSelect}
      />
      <label 
        htmlFor={`voice-${id}`} 
        className="flex p-4 bg-white border rounded-lg cursor-pointer focus:outline-none hover:bg-neutral-50 peer-checked:ring-2 peer-checked:ring-primary-500 peer-checked:border-transparent"
      >
        <div className="w-12 h-12 mr-3 rounded-full overflow-hidden">
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        </div>
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="text-xs text-neutral-500">{description}</p>
          <div className="mt-2 flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="inline-flex items-center text-xs text-primary-600 hover:text-primary-500 p-0 h-auto"
              onClick={handlePreviewClick}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="mr-1">Loading...</span>
              ) : isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Stop preview
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Preview voice
                </>
              )}
            </Button>
          </div>
        </div>
      </label>
    </div>
  );
}

export default VoiceItem;
