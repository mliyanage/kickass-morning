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
    id: "liam",
    name: "Liam",
    category: "Professional Motivational Coach",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
  },
  {
    id: "lily",
    name: "Lily",
    category: "Wellness & Mindfulness Guide",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
  },
  {
    id: "bill",
    name: "Bill",
    category: "Business & Productivity Expert",
    imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
  },
  {
    id: "todd-thomas",
    name: "Todd Thomas",
    category: "Performance Psychology Coach",
    imageUrl: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
  },
  {
    id: "radio-station",
    name: "Radio Station",
    category: "Energetic Morning Show Host",
    imageUrl: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80"
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
  // Using new array-based format
  const goals = personalizationData?.goals || [];
  const struggles = personalizationData?.struggles || [];
  const otherGoal = personalizationData?.otherGoal || "";
  const otherStruggle = personalizationData?.otherStruggle || "";
  const goalDescription = personalizationData?.goalDescription || "";
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
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center mb-2">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500 text-white mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-medium text-gray-700">Your Wake-Up Goal</h4>
                    </div>
                    <div className="space-y-1 pl-1">
                      {goals.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {goals.map((g, index) => (
                            <li key={index} className="text-sm font-medium text-primary-700">
                              {getGoalText(g)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="font-medium text-gray-500 italic">Not set</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center mb-2">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-purple-500 text-white mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                          <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                      </div>
                      <h4 className="text-sm font-medium text-gray-700">Your Biggest Struggle</h4>
                    </div>
                    <div className="space-y-1 pl-1">
                      {struggles.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {struggles.map((s, index) => (
                            <li key={index} className="text-sm font-medium text-primary-700">
                              {getStruggleText(s)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="font-medium text-gray-500 italic">Not set</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                    <div className="flex items-center mb-2">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-500 text-white mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                          <line x1="12" y1="19" x2="12" y2="23"></line>
                          <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                      </div>
                      <h4 className="text-sm font-medium text-gray-700">Selected Voice</h4>
                    </div>
                    <div className="pl-8">
                      <p className="text-sm font-medium text-primary-700">{getVoiceText()}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>
                    Your wake-up calls will be personalized to help you with your goals
                    {goals.length > 0 ? ` (${goals.map(g => getGoalText(g).toLowerCase()).join(', ')})` : ''}, 
                    addressing your struggles
                    {struggles.length > 0 ? ` (${struggles.map(s => getStruggleText(s).toLowerCase()).join(', ')})` : ''}, 
                    and delivered in the voice of {getVoiceText()}.
                  </p>
                  
                  {goalDescription && (
                    <div className="mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <h4 className="text-xs font-medium uppercase text-blue-700 mb-1">Your Personal Goal Description</h4>
                      <p className="text-sm text-blue-800 italic">"{goalDescription}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}