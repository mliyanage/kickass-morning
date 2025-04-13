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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import VoiceCard from "@/components/VoiceCard";
import { PersonalizationData, GoalType, StruggleType } from "@/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Settings } from "lucide-react";

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
    id: "elon-musk",
    name: "Elon Musk",
    category: "Entrepreneur & Innovator",
    imageUrl:
      "https://images.unsplash.com/photo-1566753323558-f4e0952af115?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: "oprah-winfrey",
    name: "Oprah Winfrey",
    category: "Media Executive & Philanthropist",
    imageUrl:
      "https://images.unsplash.com/photo-1579503841516-e0bd7fca5faa?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: "david-goggins",
    name: "David Goggins",
    category: "Ultramarathon Runner & Motivator",
    imageUrl:
      "https://images.unsplash.com/photo-1507398941214-572c25f4b1dc?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
  {
    id: "steve-jobs",
    name: "Steve Jobs",
    category: "Technology Visionary",
    imageUrl:
      "https://images.unsplash.com/photo-1556157382-97eda2d62296?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&h=120&q=80",
  },
];

export default function Personalization() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);

  const [goal, setGoal] = useState<GoalType | "">("");
  const [otherGoal, setOtherGoal] = useState("");
  const [goalDescription, setGoalDescription] = useState("");

  const [struggle, setStruggle] = useState<StruggleType | "">("");
  const [otherStruggle, setOtherStruggle] = useState("");

  const [voice, setVoice] = useState("");
  const [customVoice, setCustomVoice] = useState("");
  const [hasExistingData, setHasExistingData] = useState(false);

  // Fetch existing personalization data
  const { data: personalizationData, isLoading } =
    useQuery<PersonalizationData>({
      queryKey: ["/api/user/personalization"],
      retry: false,
    });

  // Set initial values from fetched data
  useEffect(() => {
    if (personalizationData) {
      setHasExistingData(true);
      setGoal(personalizationData.goal);
      setOtherGoal(personalizationData.otherGoal || "");
      setStruggle(personalizationData.struggle);
      setOtherStruggle(personalizationData.otherStruggle || "");
      setVoice(
        personalizationData.customVoice ? "" : personalizationData.voice,
      );
      setCustomVoice(personalizationData.customVoice || "");
      setStep(0); // Start with summary view when there's existing data
    }
  }, [personalizationData]);

  const submitPersonalizationMutation = useMutation({
    mutationFn: async (data: PersonalizationData) => {
      return await apiRequest("POST", "/api/user/personalization", data);
    },
    onSuccess: () => {
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
      setStep(2);
    } else if (step === 2) {
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
    if (!voice && !customVoice) {
      toast({
        variant: "destructive",
        title: "Please select a voice",
        description:
          "Choose an inspirational figure's voice or enter a custom one.",
      });
      return;
    }

    const personalData: PersonalizationData = {
      goal: goal as GoalType,
      otherGoal: goal === GoalType.OTHER ? otherGoal : undefined,
      goalDescription,
      struggle: struggle as StruggleType,
      otherStruggle:
        struggle === StruggleType.OTHER ? otherStruggle : undefined,
      voice: voice || customVoice,
      customVoice: customVoice || undefined,
    };

    submitPersonalizationMutation.mutate(personalData);
  };

  // Helper function to get the selected voice text
  const getVoiceText = (): string => {
    if (voice) {
      // Find voice from our list of sample voices
      const selectedVoice = voices.find((v) => v.id === voice);
      return selectedVoice ? selectedVoice.name : "Custom Voice";
    } else if (customVoice) {
      return customVoice;
    }
    return "Not Selected";
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
                  <p className="font-medium text-primary-700 text-lg">
                    {goal === GoalType.OTHER ? otherGoal : getGoalText(goal)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                  <div className="flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <h4 className="text-sm font-medium text-gray-700">Your Biggest Struggle</h4>
                  </div>
                  <p className="font-medium text-primary-700 text-lg">
                    {struggle === StruggleType.OTHER
                      ? otherStruggle
                      : getStruggleText(struggle)}
                  </p>
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
                  Your wake-up calls are uniquely crafted to help you with <span className="text-primary-600 font-medium">
                  {goal === GoalType.OTHER
                    ? otherGoal.toLowerCase()
                    : getGoalText(goal).toLowerCase()}</span>, 
                  specifically addressing your struggle with <span className="text-primary-600 font-medium">
                  {struggle === StruggleType.OTHER
                    ? otherStruggle.toLowerCase()
                    : getStruggleText(struggle).toLowerCase()}</span>, 
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
                  What's your primary goal for waking up early?
                </Label>
                <p className="text-sm text-gray-500 mt-1 mb-2">
                  Choose the main reason you want to get out of bed each morning
                </p>
                <Select
                  value={goal}
                  onValueChange={(value) => setGoal(value as GoalType)}
                >
                  <SelectTrigger id="personal-goal" className="w-full mt-1">
                    <SelectValue placeholder="Select your goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={GoalType.EXERCISE}>
                        Morning Exercise
                      </SelectItem>
                      <SelectItem value={GoalType.PRODUCTIVITY}>
                        Work Productivity
                      </SelectItem>
                      <SelectItem value={GoalType.STUDY}>
                        Study or Learning
                      </SelectItem>
                      <SelectItem value={GoalType.MEDITATION}>
                        Meditation & Mindfulness
                      </SelectItem>
                      <SelectItem value={GoalType.CREATIVE}>
                        Creative Projects
                      </SelectItem>
                      <SelectItem value={GoalType.OTHER}>Other</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {goal && goal !== GoalType.OTHER && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                    {goal === GoalType.EXERCISE && "Wake up early to prioritize fitness and physical wellbeing through morning workouts."}
                    {goal === GoalType.PRODUCTIVITY && "Start your day ahead of schedule to maximize work output and professional achievements."}
                    {goal === GoalType.STUDY && "Dedicate early morning hours to focused learning and educational advancement."}
                    {goal === GoalType.MEDITATION && "Begin each day with clarity through mindfulness practices and mental preparation."}
                    {goal === GoalType.CREATIVE && "Harness your morning creative energy for artistic projects and innovative thinking."}
                  </div>
                )}
              </div>

              {goal === GoalType.OTHER && (
                <div>
                  <Label htmlFor="other-goal" className="text-base font-medium">Please specify your goal</Label>
                  <p className="text-sm text-gray-500 mt-1 mb-2">
                    Tell us about your unique morning motivation
                  </p>
                  <Input
                    id="other-goal"
                    className="mt-1"
                    value={otherGoal}
                    onChange={(e) => setOtherGoal(e.target.value)}
                    placeholder="E.g., Family time, spiritual practice, etc."
                  />
                </div>
              )}

              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <Label htmlFor="goal-description" className="text-base font-medium">
                  Tell us more about your goals and challenges (optional)
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
                />
                <p className="mt-2 text-xs text-gray-500">
                  The more details you provide, the better we can tailor your morning motivation messages
                </p>
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
                  What's your biggest struggle with waking up early?
                </Label>
                <p className="text-sm text-gray-500 mb-4">
                  Select the main obstacle that keeps you from getting out of bed
                </p>
                
                <RadioGroup
                  value={struggle}
                  onValueChange={(value) => setStruggle(value as StruggleType)}
                >
                  <div className="grid gap-3">
                    <div className="flex items-start space-x-3 p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setStruggle(StruggleType.TIRED)}>
                      <RadioGroupItem
                        value={StruggleType.TIRED}
                        id="struggle-1"
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor="struggle-1" className="font-medium">
                          Feeling tired and groggy
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">
                          You wake up feeling exhausted and have difficulty becoming alert and energized
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setStruggle(StruggleType.LACK_OF_MOTIVATION)}>
                      <RadioGroupItem
                        value={StruggleType.LACK_OF_MOTIVATION}
                        id="struggle-2"
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor="struggle-2" className="font-medium">Lack of motivation</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          You know you should get up but can't find the willpower or a compelling reason to do so
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setStruggle(StruggleType.SNOOZE)}>
                      <RadioGroupItem
                        value={StruggleType.SNOOZE}
                        id="struggle-3"
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor="struggle-3" className="font-medium">
                          Hitting snooze multiple times
                        </Label>
                        <p className="text-xs text-gray-500 mt-1">
                          You constantly delay getting up by hitting the snooze button, losing valuable morning time
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setStruggle(StruggleType.STAY_UP_LATE)}>
                      <RadioGroupItem
                        value={StruggleType.STAY_UP_LATE}
                        id="struggle-4"
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor="struggle-4" className="font-medium">Staying up too late</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          Night-time habits make it difficult to get sufficient sleep, affecting your morning routine
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3 p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setStruggle(StruggleType.OTHER)}>
                      <RadioGroupItem
                        value={StruggleType.OTHER}
                        id="struggle-5"
                        className="mt-1"
                      />
                      <div>
                        <Label htmlFor="struggle-5" className="font-medium">Other</Label>
                        <p className="text-xs text-gray-500 mt-1">
                          You face a different challenge that isn't listed here
                        </p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {struggle === StruggleType.OTHER && (
                <div>
                  <Label htmlFor="other-struggle" className="text-base font-medium">
                    Please specify your struggle
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
                  />
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
                  <li><span className="font-medium">Elon Musk:</span> Future-focused, innovation-oriented, analytical motivation</li>
                  <li><span className="font-medium">Oprah Winfrey:</span> Compassionate, empowering, inspirational guidance</li>
                  <li><span className="font-medium">David Goggins:</span> Intense, challenge-oriented, mental toughness focus</li>
                  <li><span className="font-medium">Steve Jobs:</span> Visionary, perfection-seeking, passion-driven motivation</li>
                </ul>
              </div>

              <div>
                <Label htmlFor="custom-voice" className="text-base font-medium">Other person not listed?</Label>
                <p className="text-sm text-gray-500 mt-1 mb-2">
                  Enter the name of your preferred inspirational figure
                </p>
                <Input
                  id="custom-voice"
                  className="mt-1"
                  placeholder="Enter name (e.g., Tony Robbins, Brené Brown)"
                  value={customVoice}
                  onChange={(e) => setCustomVoice(e.target.value)}
                  onClick={() => setVoice("")}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Note: Custom personalities are subject to availability and may use similar voice models
                </p>
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
    </DashboardLayout>
  );
}
