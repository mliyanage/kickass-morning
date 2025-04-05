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
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // States for personalization
  const [isEditing, setIsEditing] = useState(false);
  const [goal, setGoal] = useState<GoalType | "">("");
  const [otherGoal, setOtherGoal] = useState("");
  const [struggle, setStruggle] = useState<StruggleType | "">("");
  const [otherStruggle, setOtherStruggle] = useState("");
  const [voice, setVoice] = useState("");
  const [customVoice, setCustomVoice] = useState("");
  
  // Fetch existing personalization data
  const { data: personalizationData, isLoading } = useQuery<PersonalizationData>({
    queryKey: ['/api/user/personalization'],
    retry: false
  });
  
  // Set initial values from fetched data
  useEffect(() => {
    if (personalizationData) {
      setGoal(personalizationData.goal);
      setOtherGoal(personalizationData.otherGoal || "");
      setStruggle(personalizationData.struggle);
      setOtherStruggle(personalizationData.otherStruggle || "");
      setVoice(personalizationData.customVoice ? "" : personalizationData.voice);
      setCustomVoice(personalizationData.customVoice || "");
    }
  }, [personalizationData]);
  
  // Personalization mutation
  const submitPersonalizationMutation = useMutation({
    mutationFn: async (data: PersonalizationData) => {
      return await apiRequest("POST", "/api/user/personalization", data);
    },
    onSuccess: () => {
      toast({
        title: "Preferences saved",
        description: "Your personalization settings have been saved.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/user/personalization'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to save preferences",
        description: error.message || "Please try again later.",
      });
    }
  });
  
  const handleSubmit = () => {
    if (!goal) {
      toast({
        variant: "destructive",
        title: "Please select a goal",
        description: "Choose your primary goal for waking up early.",
      });
      return;
    }
    
    if (goal === GoalType.OTHER && !otherGoal) {
      toast({
        variant: "destructive",
        title: "Please specify your goal",
        description: "Tell us about your custom goal.",
      });
      return;
    }
    
    if (!struggle) {
      toast({
        variant: "destructive",
        title: "Please select a struggle",
        description: "Choose your biggest struggle with waking up early.",
      });
      return;
    }
    
    if (struggle === StruggleType.OTHER && !otherStruggle) {
      toast({
        variant: "destructive",
        title: "Please specify your struggle",
        description: "Tell us about your custom struggle.",
      });
      return;
    }
    
    if (!voice && !customVoice) {
      toast({
        variant: "destructive",
        title: "Please select a voice",
        description: "Choose an inspirational figure's voice or enter a custom one.",
      });
      return;
    }
    
    const personalData: PersonalizationData = {
      goal: goal as GoalType,
      otherGoal: goal === GoalType.OTHER ? otherGoal : undefined,
      goalDescription: "",
      struggle: struggle as StruggleType,
      otherStruggle: struggle === StruggleType.OTHER ? otherStruggle : undefined,
      voice: voice || customVoice,
      customVoice: customVoice || undefined
    };
    
    submitPersonalizationMutation.mutate(personalData);
  };
  
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
              {!isEditing && personalizationData && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center text-xs"
                >
                  <Settings className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing || !personalizationData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Goal selection */}
                  <div>
                    <Label htmlFor="personal-goal">Your wake-up goal</Label>
                    <Select 
                      value={goal} 
                      onValueChange={(value) => setGoal(value as GoalType)}
                    >
                      <SelectTrigger id="personal-goal" className="mt-1">
                        <SelectValue placeholder="Select your goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={GoalType.EXERCISE}>Morning Exercise</SelectItem>
                          <SelectItem value={GoalType.PRODUCTIVITY}>Work Productivity</SelectItem>
                          <SelectItem value={GoalType.STUDY}>Study or Learning</SelectItem>
                          <SelectItem value={GoalType.MEDITATION}>Meditation & Mindfulness</SelectItem>
                          <SelectItem value={GoalType.CREATIVE}>Creative Projects</SelectItem>
                          <SelectItem value={GoalType.OTHER}>Other</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    
                    {goal === GoalType.OTHER && (
                      <div className="mt-2">
                        <Input 
                          placeholder="Please specify your goal"
                          value={otherGoal}
                          onChange={(e) => setOtherGoal(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Struggle selection */}
                  <div>
                    <Label htmlFor="wake-struggle">Your biggest struggle</Label>
                    <Select 
                      value={struggle} 
                      onValueChange={(value) => setStruggle(value as StruggleType)}
                    >
                      <SelectTrigger id="wake-struggle" className="mt-1">
                        <SelectValue placeholder="Select your struggle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value={StruggleType.TIRED}>Feeling tired and groggy</SelectItem>
                          <SelectItem value={StruggleType.LACK_OF_MOTIVATION}>Lack of motivation</SelectItem>
                          <SelectItem value={StruggleType.SNOOZE}>Hitting snooze multiple times</SelectItem>
                          <SelectItem value={StruggleType.STAY_UP_LATE}>Staying up too late</SelectItem>
                          <SelectItem value={StruggleType.OTHER}>Other</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    
                    {struggle === StruggleType.OTHER && (
                      <div className="mt-2">
                        <Input 
                          placeholder="Please specify your struggle"
                          value={otherStruggle}
                          onChange={(e) => setOtherStruggle(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Voice selection */}
                <div>
                  <Label className="block">Select a motivational voice</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    {voices.map((v) => (
                      <div 
                        key={v.id}
                        className={`flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50 ${voice === v.id ? 'ring-2 ring-primary border-transparent' : ''}`}
                        onClick={() => {
                          setVoice(v.id);
                          setCustomVoice("");
                        }}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                          <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{v.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3">
                    <Label htmlFor="custom-voice">Other person not listed?</Label>
                    <Input 
                      id="custom-voice" 
                      className="mt-1"
                      placeholder="Enter name"
                      value={customVoice}
                      onChange={(e) => {
                        setCustomVoice(e.target.value);
                        setVoice("");
                      }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-3">
                  {personalizationData && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditing(false);
                        // Reset to previous values
                        if (personalizationData) {
                          setGoal(personalizationData.goal);
                          setOtherGoal(personalizationData.otherGoal || "");
                          setStruggle(personalizationData.struggle);
                          setOtherStruggle(personalizationData.otherStruggle || "");
                          setVoice(personalizationData.customVoice ? "" : personalizationData.voice);
                          setCustomVoice(personalizationData.customVoice || "");
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    onClick={handleSubmit}
                    disabled={submitPersonalizationMutation.isPending}
                  >
                    {submitPersonalizationMutation.isPending ? "Saving..." : personalizationData ? "Update Preferences" : "Save Preferences"}
                  </Button>
                </div>
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