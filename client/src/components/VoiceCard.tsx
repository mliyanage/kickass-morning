import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VoiceCardProps {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  selected: boolean;
  onSelect: () => void;
}

export default function VoiceCard({ id, name, category, imageUrl, selected, onSelect }: VoiceCardProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);

  const previewVoiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/voice/preview", { voiceId: id });
    },
    onSuccess: () => {
      setIsPlaying(true);
      // In a real implementation, you would play the audio here
      setTimeout(() => {
        setIsPlaying(false);
      }, 3000);
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
        className="flex p-4 bg-white border rounded-lg cursor-pointer focus:outline-none hover:bg-gray-50 peer-checked:ring-2 peer-checked:ring-primary peer-checked:border-transparent"
      >
        <div className="w-12 h-12 mr-3 rounded-full overflow-hidden">
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        </div>
        <div>
          <h3 className="font-medium">{name}</h3>
          <p className="text-xs text-gray-500">{category}</p>
          <div className="mt-2 flex items-center">
            <button 
              type="button" 
              className="inline-flex items-center text-xs text-primary hover:text-primary/80"
              onClick={handlePreviewVoice}
              disabled={isPlaying || previewVoiceMutation.isPending}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {isPlaying ? "Playing..." : previewVoiceMutation.isPending ? "Loading..." : "Preview voice"}
            </button>
          </div>
        </div>
      </label>
    </div>
  );
}
