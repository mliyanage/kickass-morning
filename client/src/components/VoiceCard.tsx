import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Volume2, Pause } from "lucide-react";

interface VoiceCardProps {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  selected: boolean;
  onSelect: () => void;
  personalityTrait?: string; // Optional short personality description
}

export default function VoiceCard({ 
  id, 
  name, 
  category, 
  imageUrl, 
  selected, 
  onSelect,
  personalityTrait = "Motivational" // Default trait
}: VoiceCardProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const playDuration = 3; // seconds
  
  // Play animation when previewing the voice
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      setPlayProgress(0);
      interval = setInterval(() => {
        setPlayProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            return 0;
          }
          return prev + (100 / (playDuration * 10)); // Update 10 times per second
        });
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playDuration]);

  const previewVoiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/voice/preview", { voiceId: id });
    },
    onSuccess: () => {
      setIsPlaying(true);
      // In a real implementation, you would play the audio here
      // For now we just simulate playback with the progress bar
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to preview voice",
        description: error.message || "Could not play the voice preview. Please try again.",
      });
    }
  });

  const handlePreviewVoice = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isPlaying) return;
    
    previewVoiceMutation.mutate();
  };

  return (
    <div className="relative">
      <input 
        type="radio" 
        id={`voice-${id}`} 
        name="voice-selection" 
        value={id} 
        className="sr-only peer" 
        checked={selected}
        onChange={onSelect}
      />
      <label 
        htmlFor={`voice-${id}`} 
        className="flex p-4 bg-white border rounded-lg cursor-pointer focus:outline-none hover:bg-gray-50 peer-checked:ring-2 peer-checked:ring-primary peer-checked:border-transparent transition-all"
      >
        <div className="relative w-16 h-16 mr-4 rounded-full overflow-hidden border-2 flex-shrink-0">
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          {selected && (
            <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-0.5">
              <CheckCircle size={16} className="stroke-[3]" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-900">{name}</h3>
              <p className="text-xs text-gray-500">{category}</p>
            </div>
            <div className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700 font-medium">
              {personalityTrait}
            </div>
          </div>
          
          {isPlaying && (
            <div className="mt-2">
              <Progress value={playProgress} className="h-1" />
            </div>
          )}
          
          <div className="mt-2 flex items-center">
            <button 
              type="button" 
              className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${isPlaying ? 'bg-primary/10 text-primary' : 'text-primary hover:bg-primary/5'}`}
              onClick={handlePreviewVoice}
              disabled={isPlaying || previewVoiceMutation.isPending}
            >
              <Volume2 size={14} className="mr-1" />
              {isPlaying ? "Playing..." : previewVoiceMutation.isPending ? "Loading..." : "Preview voice"}
            </button>
          </div>
        </div>
      </label>
    </div>
  );
}
