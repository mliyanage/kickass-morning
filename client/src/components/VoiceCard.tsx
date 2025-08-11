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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Create audio element when component mounts
  useEffect(() => {
    audioRef.current = new Audio();
    
    // Add event listeners
    const audio = audioRef.current;
    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('error', handleAudioError);
    
    return () => {
      // Cleanup
      if (audio) {
        audio.pause();
        audio.removeEventListener('ended', handleAudioEnded);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('error', handleAudioError);
      }
    };
  }, []);
  
  // Handle audio events
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlayProgress(0);
  };
  
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setPlayProgress(progress);
    }
  };
  
  const handleAudioError = () => {
    toast({
      variant: "destructive",
      title: "Audio Error",
      description: "Could not play the audio file. Please try again.",
    });
    setIsPlaying(false);
  };

  const previewVoiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/voice/preview", { voiceId: id });
    },
    onSuccess: (response) => {
      // Check if we received an audio URL in the response
      if (response.audioUrl) {
        // Set the audio source
        if (audioRef.current) {
          audioRef.current.src = response.audioUrl;
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
              setAudioUrl(response.audioUrl);
            })
            .catch(error => {
              toast({
                variant: "destructive",
                title: "Failed to play audio",
                description: "Could not play the voice preview. Please try again.",
              });
            });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Audio Not Available",
          description: "No audio preview is available for this voice.",
        });
      }
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
    
    if (isPlaying) {
      // If already playing, pause the audio
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }
    
    if (audioUrl && audioRef.current) {
      // If we already have the audio URL, just play it
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(error => {
          console.error("Error playing audio:", error);
        });
    } else {
      // Otherwise, fetch the audio URL
      previewVoiceMutation.mutate();
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
          
          <div className="mt-2 flex items-center">
            <button 
              type="button" 
              className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${isPlaying ? 'bg-primary/10 text-primary' : 'text-primary hover:bg-primary/5'}`}
              onClick={handlePreviewVoice}
              disabled={previewVoiceMutation.isPending}
            >
              {isPlaying ? (
                <>
                  <Pause size={14} className="mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Volume2 size={14} className="mr-1" />
                  {previewVoiceMutation.isPending ? "Loading..." : "Preview voice"}
                </>
              )}
            </button>
            {isPlaying && (
              <div className="ml-2 w-24">
                <Progress value={playProgress} className="h-1" />
              </div>
            )}
          </div>
        </div>
      </label>
    </div>
  );
}
