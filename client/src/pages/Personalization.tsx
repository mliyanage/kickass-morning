import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import VoiceCard from "@/components/VoiceCard";
import SelectionCard from "@/components/SelectionCard";
import { GoalType, StruggleType } from "@shared/schema";
import { PersonalizationData } from "@/types";
import AppLayout from "@/components/layouts/AppLayout";
import { 
  Settings,
  Dumbbell, 
  Briefcase, 
  GraduationCap, 
  SunMedium, 
  PaintBucket, 
  Sparkles,
  Moon,
  Coffee,
  AlarmClock,
  BedDouble,
  HelpCircle,
  Heart as HeartPulse,
  Monitor as Laptop
} from "lucide-react";

// Helper functions for displaying text values
const getGoalText = (goal: GoalType | string): string => {
  switch (goal) {
    case GoalType.EXERCISE:
      return "Morning Exercise";
    case GoalType.PRODUCTIVITY:
      return "Work Productivity";
    case GoalType.STUDY:
      return "Study or Learning";
    case GoalType.MEDITATION:
      return "Meditation & Mindfulness";
    case GoalType.CREATIVE:
      return "Creative Projects";
    default:
      return "Custom Goal";
  }
};

const getStruggleText = (struggle: StruggleType | string): string => {
  switch (struggle) {
    case StruggleType.TIRED:
      return "Feeling tired and groggy";
    case StruggleType.LACK_OF_MOTIVATION:
      return "Lack of motivation";
    case StruggleType.SNOOZE:
      return "Hitting snooze multiple times";
    case StruggleType.STAY_UP_LATE:
      return "Staying up too late";
    default:
      return "Custom Struggle";
  }
};

// Sample voices - in a real app, these would come from an API
const voices = [
  {
    id: "jocko",
    name: "Jocko Willink",
    category: "Navy SEAL & Leadership Expert",
    imageUrl:
      "https://images.unsplash.com/photo-1552058544-f2b08422138a?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: "liam",
    name: "Liam",
    category: "Professional Motivational Coach",
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: "lily",
    name: "Lily",
    category: "Wellness & Mindfulness Guide",
    imageUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: "bill",
    name: "Bill",
    category: "Business & Productivity Expert",
    imageUrl:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: "todd-thomas",
    name: "Todd Thomas",
    category: "Performance Psychology Coach",
    imageUrl:
      "https://images.unsplash.com/photo-1531384441138-2736e62e0919?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: "radio-station",
    name: "Radio Station",
    category: "Energetic Morning Show Host",
    imageUrl:
      "https://images.unsplash.com/photo-1589903308904-1010c2294adc?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
];

export default function Personalization() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  const [goals, setGoals] = useState<GoalType[]>([GoalType.OTHER]); // Default to custom goal
  const [otherGoal, setOtherGoal] = useState("");
  const [goalDescription, setGoalDescription] = useState("");

  const [struggles, setStruggles] = useState<StruggleType[]>([]);
  const [otherStruggle, setOtherStruggle] = useState("");

  const [voice, setVoice] = useState("");
  const [customVoice, setCustomVoice] = useState("");
  const [hasExistingData, setHasExistingData] = useState(false);

  // Fetch existing personalization data
  const { data: personalizationData, isLoading } =
    useQuery<PersonalizationData>({
      queryKey: ["/api/user/personalization"],
      retry: false,
      staleTime: 0, // Always consider data stale
      refetchOnMount: true, // Refetch when component mounts
      refetchOnWindowFocus: false
    });

  // Set initial values from fetched data
  useEffect(() => {
    if (personalizationData) {
      setHasExistingData(true);
      
      // Handle goals array (backward compatibility)
      if (personalizationData.goals && Array.isArray(personalizationData.goals)) {
        setGoals(personalizationData.goals);
      } else if (personalizationData.goal) {
        // Handle legacy single goal data
        setGoals([personalizationData.goal]);
      } else {
        setGoals([GoalType.OTHER]); // Default to custom goal
      }
      
      setOtherGoal(personalizationData.otherGoal || "");
      setGoalDescription(personalizationData.goalDescription || "");
      
      // Handle struggles array (backward compatibility)
      if (personalizationData.struggles && Array.isArray(personalizationData.struggles)) {
        setStruggles(personalizationData.struggles);
      } else if (personalizationData.struggle) {
        // Handle legacy single struggle data
        setStruggles([personalizationData.struggle]);
      } else {
        setStruggles([]);
      }
      
      setOtherStruggle(personalizationData.otherStruggle || "");
      setVoice(personalizationData.voice || "");
      setStep(0); // Start with summary view when there's existing data
    }
  }, [personalizationData]);

  const submitPersonalizationMutation = useMutation({
    mutationFn: async (data: PersonalizationData) => {
      return await apiRequest("POST", "/api/user/personalization", data);
    },
    onSuccess: async () => {
      // Invalidate and refetch the personalization cache immediately
      await queryClient.invalidateQueries({
        queryKey: ["/api/user/personalization"]
      });
      
      // Force refetch to ensure fresh data
      await queryClient.refetchQueries({
        queryKey: ["/api/user/personalization"]
      });
      
      toast({
        title: "Preferences saved",
        description: "Your personalization settings have been saved.",
      });
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to save preferences",
        description: error.message || "Please try again later.",
      });
    },
  });

  const handleNextStep = () => {
    if (step === 1) {
      // Since we default to custom goal, always validate the custom goal input
      if (!otherGoal.trim()) {
        toast({
          variant: "destructive",
          title: "Please specify your custom goal",
          description: "Tell us about your custom goal.",
        });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (struggles.length === 0) {
        toast({
          variant: "destructive",
          title: "Please select at least one struggle",
          description: "Choose one or more struggles with waking up early.",
        });
        return;
      }
      if (struggles.includes(StruggleType.OTHER) && !otherStruggle) {
        toast({
          variant: "destructive",
          title: "Please specify your custom struggle",
          description: "Tell us about your custom struggle.",
        });
        return;
      }
      setStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };

  const handleSubmit = () => {
    if (!voice) {
      toast({
        variant: "destructive",
        title: "Please select a voice",
        description: "Choose an inspirational figure's voice.",
      });
      return;
    }

    const personalData: PersonalizationData = {
      goals: goals,
      otherGoal: goals.includes(GoalType.OTHER) ? otherGoal : undefined,
      goalDescription,
      struggles: struggles,
      otherStruggle:
        struggles.includes(StruggleType.OTHER) ? otherStruggle : undefined,
      voice: voice,
    };

    submitPersonalizationMutation.mutate(personalData);
  };

  // Helper function to get the selected voice text
  const getVoiceText = (): string => {
    if (voice) {
      // Find voice from our list of sample voices
      const selectedVoice = voices.find((v) => v.id === voice);
      return selectedVoice ? selectedVoice.name : "Unknown Voice";
    }
    return "Not Selected";
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            {hasExistingData
              ? "Update Your Wakeup Preferences"
              : "Personalize Your Wakeup Experience"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {hasExistingData
              ? "Make changes to your personalization settings"
              : "Customize your wakeup call for better motivation"}
          </p>
        </div>

        <CardContent className="p-6">
          {/* Summary view if user has existing data and isn't in edit mode */}
          {hasExistingData && step === 0 && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-6">
                <h3 className="text-base font-medium text-gray-800 mb-2">Your Current Personalization</h3>
                <p className="text-sm text-gray-600">
                  Here's how your wake-up calls are currently personalized. You can update these preferences at any time.
                </p>
              </div>
            
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <h4 className="text-sm font-medium text-gray-700">Your Wake-Up Goal</h4>
                  </div>
                  <div className="font-medium text-primary-700">
                    {goals.length > 0 ? (
                      <ul className="space-y-1">
                        {goals.map((goal, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <span className="mr-1.5">•</span>
                            {goal === GoalType.OTHER ? otherGoal : getGoalText(goal)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic">No goals selected</p>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <h4 className="text-sm font-medium text-gray-700">Your Biggest Struggle</h4>
                  </div>
                  <div className="font-medium text-primary-700">
                    {struggles.length > 0 ? (
                      <ul className="space-y-1">
                        {struggles.map((struggle, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <span className="mr-1.5">•</span>
                            {struggle === StruggleType.OTHER ? otherStruggle : getStruggleText(struggle)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic">No struggles selected</p>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                    </svg>
                    <h4 className="text-sm font-medium text-gray-700">Selected Voice</h4>
                  </div>
                  <p className="font-medium text-primary-700 text-lg">{getVoiceText()}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-2">How Your Wake-Up Calls Are Personalized</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Your wake-up calls are uniquely crafted to help you with your goals: 
                  <span className="text-primary-600 font-medium">
                    {goals.map((g, index) => (
                      <span key={index}>
                        {index > 0 && ", "}
                        {g === GoalType.OTHER ? otherGoal.toLowerCase() : getGoalText(g).toLowerCase()}
                      </span>
                    ))}
                  </span>, 
                  specifically addressing your struggles with <span className="text-primary-600 font-medium">
                    {struggles.map((s, index) => (
                      <span key={index}>
                        {index > 0 && ", "}
                        {s === StruggleType.OTHER ? otherStruggle.toLowerCase() : getStruggleText(s).toLowerCase()}
                      </span>
                    ))}
                  </span>, 
                  and delivered in the inspiring voice of <span className="text-primary-600 font-medium">{getVoiceText()}</span>.
                </p>
                <div className="mt-4 flex justify-center">
                  <Button onClick={() => setStep(1)} className="px-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Update Preferences
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Progress indicator for edit/create mode */}
          {step > 0 && (
            <div className="flex items-center mb-6">
              <div className="flex items-center text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= 1 ? "bg-primary text-white" : "bg-gray-300 text-gray-600"}`}
                >
                  1
                </span>
                <span
                  className={`ml-2 ${step >= 1 ? "text-gray-900 font-medium" : "text-gray-500"}`}
                >
                  Personal Goals
                </span>
              </div>
              <div className="ml-4 flex-1 border-t border-gray-300"></div>
              <div className="flex items-center text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= 2 ? "bg-primary text-white" : "bg-gray-300 text-gray-600"}`}
                >
                  2
                </span>
                <span
                  className={`ml-2 ${step >= 2 ? "text-gray-900 font-medium" : "text-gray-500"}`}
                >
                  Challenges
                </span>
              </div>
              <div className="ml-4 flex-1 border-t border-gray-300"></div>
              <div className="flex items-center text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= 3 ? "bg-primary text-white" : "bg-gray-300 text-gray-600"}`}
                >
                  3
                </span>
                <span
                  className={`ml-2 ${step >= 3 ? "text-gray-900 font-medium" : "text-gray-500"}`}
                >
                  Voice Selection
                </span>
              </div>
            </div>
          )}

          {/* Personal goals section */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">Why This Matters</h3>
                <p className="text-sm text-blue-700">
                  Your wake-up goal helps us craft personalized motivational messages that align with what matters most to you. 
                  Each morning call will be tailored to inspire you toward achieving this specific goal.
                </p>
              </div>
            
              <div>
                <Label htmlFor="personal-goal" className="text-base font-medium">
                  What are your goals for waking up early?
                </Label>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Select one or more reasons why you want to get out of bed each morning
                </p>
                
                {/* Goal selection cards are hidden to improve customer engagement */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" style={{ display: 'none' }}>
                  <SelectionCard
                    id="exercise-goal"
                    title="Morning Exercise"
                    description="Wake up early to prioritize fitness and physical wellbeing"
                    icon={<Dumbbell className="h-5 w-5" />}
                    iconColor="text-blue-500"
                    selected={goals.includes(GoalType.EXERCISE)}
                    onSelect={() => {
                      if (goals.includes(GoalType.EXERCISE)) {
                        setGoals(goals.filter(g => g !== GoalType.EXERCISE));
                      } else {
                        setGoals([...goals, GoalType.EXERCISE]);
                      }
                    }}
                    tips={[
                      "Morning workouts boost metabolism all day",
                      "Exercise releases endorphins for a positive start",
                      "Fewer distractions and interruptions in the morning"
                    ]}
                    example="I want to complete my 30-minute HIIT workout before the day gets busy"
                  />
                  
                  <SelectionCard
                    id="productivity-goal"
                    title="Work Productivity"
                    description="Start your day ahead of schedule to maximize work output"
                    icon={<Briefcase className="h-5 w-5" />}
                    iconColor="text-indigo-500"
                    selected={goals.includes(GoalType.PRODUCTIVITY)}
                    onSelect={() => {
                      if (goals.includes(GoalType.PRODUCTIVITY)) {
                        setGoals(goals.filter(g => g !== GoalType.PRODUCTIVITY));
                      } else {
                        setGoals([...goals, GoalType.PRODUCTIVITY]);
                      }
                    }}
                    tips={[
                      "Morning hours have fewer distractions",
                      "Get a head start on daily priorities",
                      "Tackle complex tasks when your mind is fresh"
                    ]}
                    example="I need to finish key work tasks before meetings begin"
                  />
                  
                  <SelectionCard
                    id="study-goal"
                    title="Study & Learning"
                    description="Dedicate early morning hours to education and skill building"
                    icon={<GraduationCap className="h-5 w-5" />}
                    iconColor="text-green-500"
                    selected={goals.includes(GoalType.STUDY)}
                    onSelect={() => {
                      if (goals.includes(GoalType.STUDY)) {
                        setGoals(goals.filter(g => g !== GoalType.STUDY));
                      } else {
                        setGoals([...goals, GoalType.STUDY]);
                      }
                    }}
                    tips={[
                      "The brain is most receptive to new information in the morning",
                      "Consistent study time builds lasting habits",
                      "Morning learning sets a positive tone for the day"
                    ]}
                    example="I want to study for my certification exam for 45 minutes every day"
                  />
                  
                  <SelectionCard
                    id="meditation-goal"
                    title="Meditation & Mindfulness"
                    description="Begin each day with mental clarity and spiritual practice"
                    icon={<SunMedium className="h-5 w-5" />}
                    iconColor="text-amber-500"
                    selected={goals.includes(GoalType.MEDITATION)}
                    onSelect={() => {
                      if (goals.includes(GoalType.MEDITATION)) {
                        setGoals(goals.filter(g => g !== GoalType.MEDITATION));
                      } else {
                        setGoals([...goals, GoalType.MEDITATION]);
                      }
                    }}
                    tips={[
                      "Morning meditation reduces stress throughout the day",
                      "Quiet morning hours are ideal for mindfulness",
                      "Start with just 5-10 minutes to build a sustainable habit"
                    ]}
                    example="I want to meditate for 15 minutes to set a positive intention for my day"
                  />
                  
                  <SelectionCard
                    id="creative-goal"
                    title="Creative Projects"
                    description="Harness your morning creative energy for artistic endeavors"
                    icon={<PaintBucket className="h-5 w-5" />}
                    iconColor="text-pink-500"
                    selected={goals.includes(GoalType.CREATIVE)}
                    onSelect={() => {
                      if (goals.includes(GoalType.CREATIVE)) {
                        setGoals(goals.filter(g => g !== GoalType.CREATIVE));
                      } else {
                        setGoals([...goals, GoalType.CREATIVE]);
                      }
                    }}
                    tips={[
                      "Creative thinking is often strongest in the morning",
                      "Work on personal projects before daily demands take over",
                      "Morning light is excellent for artistic activities"
                    ]}
                    example="I want to write, paint, or work on my side project for an hour each morning"
                  />
                  
                  <SelectionCard
                    id="other-goal"
                    title="Custom Goal"
                    description="Tell us about your unique morning motivation"
                    icon={<Sparkles className="h-5 w-5" />}
                    iconColor="text-purple-500"
                    selected={goals.includes(GoalType.OTHER)}
                    onSelect={() => {
                      if (goals.includes(GoalType.OTHER)) {
                        setGoals(goals.filter(g => g !== GoalType.OTHER));
                      } else {
                        setGoals([...goals, GoalType.OTHER]);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Custom goal input - always visible for improved engagement */}
              <div className="mt-4 mb-4 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Label htmlFor="other-goal" className="text-base font-medium">Please specify your custom goal</Label>
                <p className="text-sm text-gray-500 mt-1 mb-2">
                  Tell us about your unique morning motivation
                </p>
                <Input
                  id="other-goal"
                  className="mt-1"
                  value={otherGoal}
                  onChange={(e) => setOtherGoal(e.target.value)}
                  placeholder="E.g., Family time, spiritual practice, etc."
                  maxLength={100}
                />
                <div className="flex justify-end mt-1">
                  <span className="text-xs text-gray-400">
                    {otherGoal.length}/100
                  </span>
                </div>
              </div>

              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <Label htmlFor="goal-description" className="text-base font-medium">
                  Tell us more about your goals and challenges
                </Label>
                <p className="text-sm text-gray-500 mt-1 mb-2">
                  Share specific details about your morning goals to help us personalize your wake-up messages
                </p>
                <Textarea
                  id="goal-description"
                  rows={4}
                  className="mt-1"
                  placeholder="I want to wake up early to... The specific thing I'm working toward is... My ideal morning would include..."
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                  maxLength={500}
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg px-3 py-2 flex-1 mr-3">
                    <p className="text-sm font-medium text-blue-800 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      The more details you provide, the better we can tailor your morning motivation messages
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {goalDescription.length}/500
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNextStep}>
                  Continue
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="ml-1.5 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          )}

          {/* Challenges section */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-purple-50 p-4 rounded-lg mb-6">
                <h3 className="text-sm font-medium text-purple-800 mb-2">Why This Matters</h3>
                <p className="text-sm text-purple-700">
                  Identifying your morning challenge allows us to address it directly in your wake-up calls. 
                  We'll craft messages that specifically target your unique struggle, helping you overcome it day after day.
                </p>
              </div>
            
              <div>
                <Label className="mb-3 block text-base font-medium">
                  What are your struggles with waking up early?
                </Label>
                <p className="text-sm text-gray-500 mb-4">
                  Select one or more obstacles that keep you from getting out of bed
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <SelectionCard
                    id="tired-struggle"
                    title="Feeling Tired & Groggy"
                    description="You wake up feeling exhausted with low energy levels"
                    icon={<Moon className="h-5 w-5" />}
                    iconColor="text-blue-500"
                    selected={struggles.includes(StruggleType.TIRED)}
                    onSelect={() => {
                      if (struggles.includes(StruggleType.TIRED)) {
                        setStruggles(struggles.filter(s => s !== StruggleType.TIRED));
                      } else {
                        setStruggles([...struggles, StruggleType.TIRED]);
                      }
                    }}
                    tips={[
                      "May be caused by poor sleep quality or sleep debt",
                      "Can be improved with consistent sleep schedules",
                      "Morning light exposure helps reset your body clock"
                    ]}
                    example="I feel like I could sleep for 3 more hours every morning"
                  />
                  
                  <SelectionCard
                    id="motivation-struggle"
                    title="Lack of Motivation"
                    description="You can't find a compelling reason to get out of bed"
                    icon={<HeartPulse className="h-5 w-5" />}
                    iconColor="text-red-500"
                    selected={struggles.includes(StruggleType.LACK_OF_MOTIVATION)}
                    onSelect={() => {
                      if (struggles.includes(StruggleType.LACK_OF_MOTIVATION)) {
                        setStruggles(struggles.filter(s => s !== StruggleType.LACK_OF_MOTIVATION));
                      } else {
                        setStruggles([...struggles, StruggleType.LACK_OF_MOTIVATION]);
                      }
                    }}
                    tips={[
                      "Setting exciting morning goals can help",
                      "Rewarding yourself for getting up creates positive reinforcement",
                      "Visualizing the benefits of early rising can increase motivation"
                    ]}
                    example="I know I should get up but can't find the willpower to do it"
                  />
                  
                  <SelectionCard
                    id="snooze-struggle"
                    title="Hitting Snooze Repeatedly"
                    description="You constantly delay getting up with the snooze button"
                    icon={<AlarmClock className="h-5 w-5" />}
                    iconColor="text-amber-500"
                    selected={struggles.includes(StruggleType.SNOOZE)}
                    onSelect={() => {
                      if (struggles.includes(StruggleType.SNOOZE)) {
                        setStruggles(struggles.filter(s => s !== StruggleType.SNOOZE));
                      } else {
                        setStruggles([...struggles, StruggleType.SNOOZE]);
                      }
                    }}
                    tips={[
                      "Moving your alarm away from your bed can help",
                      "Fragmented sleep from snoozing can make you more tired",
                      "Creating an immediate morning activity builds momentum"
                    ]}
                    example="I hit snooze 5+ times every morning before finally getting up"
                  />
                  
                  <SelectionCard
                    id="late-night-struggle"
                    title="Staying Up Too Late"
                    description="Night-time habits affect your ability to wake up refreshed"
                    icon={<Laptop className="h-5 w-5" />}
                    iconColor="text-indigo-500"
                    selected={struggles.includes(StruggleType.STAY_UP_LATE)}
                    onSelect={() => {
                      if (struggles.includes(StruggleType.STAY_UP_LATE)) {
                        setStruggles(struggles.filter(s => s !== StruggleType.STAY_UP_LATE));
                      } else {
                        setStruggles([...struggles, StruggleType.STAY_UP_LATE]);
                      }
                    }}
                    tips={[
                      "Creating an evening routine can signal your body to wind down",
                      "Reducing screen time before bed improves sleep quality",
                      "Consistent bedtimes help regulate your sleep-wake cycle"
                    ]}
                    example="I get caught in late night activities and can't stop myself from staying up"
                  />
                  
                  <SelectionCard
                    id="other-struggle"
                    title="Custom Struggle"
                    description="Tell us about your unique morning challenge"
                    icon={<HelpCircle className="h-5 w-5" />}
                    iconColor="text-purple-500"
                    selected={struggles.includes(StruggleType.OTHER)}
                    onSelect={() => {
                      if (struggles.includes(StruggleType.OTHER)) {
                        setStruggles(struggles.filter(s => s !== StruggleType.OTHER));
                      } else {
                        setStruggles([...struggles, StruggleType.OTHER]);
                      }
                    }}
                  />
                </div>
              </div>

              {struggles.includes(StruggleType.OTHER) && (
                <div className="mt-4 mb-4 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <Label htmlFor="other-struggle" className="text-base font-medium">
                    Please specify your custom struggle
                  </Label>
                  <p className="text-sm text-gray-500 mt-1 mb-2">
                    Tell us about your unique morning challenge
                  </p>
                  <Input
                    id="other-struggle"
                    className="mt-1"
                    value={otherStruggle}
                    onChange={(e) => setOtherStruggle(e.target.value)}
                    placeholder="E.g., Sleep disorder, noisy environment, etc."
                    maxLength={100}
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-xs text-gray-400">
                      {otherStruggle.length}/100
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-1.5 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </Button>
                <Button onClick={handleNextStep}>
                  Continue
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="ml-1.5 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          )}

          {/* Voice selection section */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <h3 className="text-sm font-medium text-green-800 mb-2">Why This Matters</h3>
                <p className="text-sm text-green-700">
                  The voice you select will deliver your personalized wake-up messages. Different voices have unique 
                  coaching styles that may resonate better with your personality and motivation style.
                </p>
              </div>
            
              <div>
                <Label className="block mb-3 text-base font-medium">
                  Choose your inspirational figure's voice
                </Label>
                <p className="text-sm text-gray-500 mb-4">
                  Select a voice that motivates and inspires you to start your day
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {voices.map((v) => (
                  <VoiceCard
                    key={v.id}
                    id={v.id}
                    name={v.name}
                    category={v.category}
                    imageUrl={v.imageUrl}
                    selected={voice === v.id}
                    onSelect={() => setVoice(v.id)}
                  />
                ))}
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg mt-2">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Voice Personality Guide</h4>
                <ul className="text-xs text-gray-600 space-y-1.5">
                  <li><span className="font-medium">Jocko Willink:</span> Direct, disciplined approach with no-excuses motivation</li>
                  <li><span className="font-medium">Liam:</span> Warm, encouraging tone with positive reinforcement</li>
                  <li><span className="font-medium">Lily:</span> Calm, nurturing guidance focused on balance and well-being</li>
                  <li><span className="font-medium">Bill:</span> Practical, goal-oriented approach with clear action steps</li>
                  <li><span className="font-medium">Todd Thomas:</span> Energetic, psychology-based motivation techniques</li>
                  <li><span className="font-medium">Radio Station:</span> Upbeat, entertaining style like a morning radio show</li>
                </ul>
              </div>



              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-1.5 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitPersonalizationMutation.isPending}
                >
                  {submitPersonalizationMutation.isPending
                    ? "Saving..."
                    : "Complete Setup"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
