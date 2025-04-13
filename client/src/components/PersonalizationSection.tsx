import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PersonalizationData, GoalType, StruggleType } from "@/types";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, ChevronRight } from "lucide-react";
import VoiceCard from "@/components/VoiceCard";

// Sample voices - in a real app, these would come from an API
const voices = [
  {
    id: "jocko",
    name: "Jocko Willink",
    category: "Navy SEAL & Leadership Expert",
    imageUrl: "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
  },
  {
    id: "elon-musk",
    name: "Elon Musk",
    category: "Entrepreneur & Innovator",
    imageUrl: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
  },
  {
    id: "oprah-winfrey",
    name: "Oprah Winfrey",
    category: "Media Executive & Philanthropist",
    imageUrl: "https://images.unsplash.com/photo-1579503841516-e0bd7fca5faa?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
  },
  {
    id: "david-goggins",
    name: "David Goggins",
    category: "Ultramarathon Runner & Motivator",
    imageUrl: "https://images.unsplash.com/photo-1507398941214-572c25f4b1dc?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
  },
  {
    id: "steve-jobs",
    name: "Steve Jobs",
    category: "Technology Visionary",
    imageUrl: "https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
  }
];

export function PersonalizationSection() {
  const [, setLocation] = useLocation();
  
  // Fetch existing personalization data
  const { data: personalizationData, isLoading } = useQuery<PersonalizationData>({
    queryKey: ['/api/user/personalization'],
    retry: false
  });
  
  // Local variables for displaying personalization data
  const goal = personalizationData?.goal || "";
  const otherGoal = personalizationData?.otherGoal || "";
  const struggle = personalizationData?.struggle || "";
  const otherStruggle = personalizationData?.otherStruggle || "";
  const voice = personalizationData?.customVoice ? "" : (personalizationData?.voice || "");
  const customVoice = personalizationData?.customVoice || "";
  
  // Helper function to get goal display text
  const getGoalText = (goal: GoalType | string) => {
    switch(goal) {
      case GoalType.EXERCISE: return "Morning Exercise";
      case GoalType.PRODUCTIVITY: return "Work Productivity";
      case GoalType.STUDY: return "Study or Learning";
      case GoalType.MEDITATION: return "Meditation & Mindfulness";
      case GoalType.CREATIVE: return "Creative Projects";
      case GoalType.OTHER: return otherGoal;
      default: return "Not set";
    }
  };
  
  // Helper function to get struggle display text
  const getStruggleText = (struggle: StruggleType | string) => {
    switch(struggle) {
      case StruggleType.TIRED: return "Feeling tired and groggy";
      case StruggleType.LACK_OF_MOTIVATION: return "Lack of motivation";
      case StruggleType.SNOOZE: return "Hitting snooze multiple times";
      case StruggleType.STAY_UP_LATE: return "Staying up too late";
      case StruggleType.OTHER: return otherStruggle;
      default: return "Not set";
    }
  };
  
  // Helper function to get voice display text
  const getVoiceText = () => {
    if (customVoice) return customVoice;
    if (voice) {
      const voiceObj = voices.find(v => v.id === voice);
      return voiceObj ? voiceObj.name : voice;
    }
    return "Not set";
  };
  
  if (isLoading) {
    return (
      <div className="shadow sm:rounded-md sm:overflow-hidden animate-pulse">
        <div className="bg-white py-6 px-4 sm:p-6">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-24 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="shadow sm:rounded-md sm:overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 via-primary-50 to-purple-50 py-6 px-4 sm:p-6">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-medium text-gray-900">
                  Set Your Wake-Up Preferences
                </CardTitle>
                <CardDescription>
                  Personalize your wake-up calls to match your goals and motivations
                </CardDescription>
              </div>
              {personalizationData && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setLocation("/personalization")}
                  className="flex items-center text-xs"
                >
                  <Settings className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!personalizationData ? (
              <div className="flex justify-center p-4">
                <Button onClick={() => setLocation("/personalization")}>
                  Set Up Your Preferences
                </Button>
              </div>
            ) : (
              // Display summary view
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">Your Wake-Up Goal</h4>
                    <p className="font-medium">{getGoalText(goal)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">Your Biggest Struggle</h4>
                    <p className="font-medium">{getStruggleText(struggle)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-xs font-medium uppercase text-gray-500 mb-2">Selected Voice</h4>
                    <p className="font-medium">{getVoiceText()}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>
                    Your wake-up calls will be personalized to help you with {getGoalText(goal).toLowerCase()}, 
                    addressing your struggle with {getStruggleText(struggle).toLowerCase()}, 
                    and delivered in the voice of {getVoiceText()}.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}