import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import VoiceCard from "@/components/VoiceCard";
import { PersonalizationData, GoalType, StruggleType } from "@/types";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const submitPersonalizationMutation = useMutation({
    mutationFn: async (data: PersonalizationData) => {
      return await apiRequest("POST", "/api/user/personalization", data);
    },
    onSuccess: () => {
      toast({
        title: "Preferences saved",
        description: "Your personalization settings have been saved.",
      });
      setLocation("/schedule-call");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to save preferences",
        description: error.message || "Please try again later.",
      });
    }
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
        description: "Choose an inspirational figure's voice or enter a custom one.",
      });
      return;
    }
    
    const personalData: PersonalizationData = {
      goal: goal as GoalType,
      otherGoal: goal === GoalType.OTHER ? otherGoal : undefined,
      goalDescription,
      struggle: struggle as StruggleType,
      otherStruggle: struggle === StruggleType.OTHER ? otherStruggle : undefined,
      voice: voice || customVoice,
      customVoice: customVoice || undefined
    };
    
    submitPersonalizationMutation.mutate(personalData);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4 sm:px-6">
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Personalize Your Wakeup Experience</h2>
          <p className="mt-1 text-sm text-gray-500">Customize your wakeup call for better motivation</p>
        </div>
        
        <CardContent className="p-6">
          {/* Progress indicator */}
          <div className="flex items-center mb-6">
            <div className="flex items-center text-sm">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>1</span>
              <span className={`ml-2 ${step >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Personal Goals</span>
            </div>
            <div className="ml-4 flex-1 border-t border-gray-300"></div>
            <div className="flex items-center text-sm">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>2</span>
              <span className={`ml-2 ${step >= 2 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Challenges</span>
            </div>
            <div className="ml-4 flex-1 border-t border-gray-300"></div>
            <div className="flex items-center text-sm">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}`}>3</span>
              <span className={`ml-2 ${step >= 3 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Voice Selection</span>
            </div>
          </div>
          
          {/* Personal goals section */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="personal-goal">What's your primary goal for waking up early?</Label>
                <Select 
                  value={goal} 
                  onValueChange={(value) => setGoal(value as GoalType)}
                >
                  <SelectTrigger id="personal-goal" className="w-full mt-1">
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
              </div>
              
              {goal === GoalType.OTHER && (
                <div>
                  <Label htmlFor="other-goal">Please specify your goal</Label>
                  <Input 
                    id="other-goal" 
                    className="mt-1"
                    value={otherGoal}
                    onChange={(e) => setOtherGoal(e.target.value)}
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="goal-description">Tell us more about your goal (optional)</Label>
                <Textarea 
                  id="goal-description" 
                  rows={3} 
                  className="mt-1"
                  placeholder="I want to wake up early to..."
                  value={goalDescription}
                  onChange={(e) => setGoalDescription(e.target.value)}
                />
              </div>
              
              <div className="flex justify-end">
                <Button onClick={handleNextStep}>
                  Continue
                  <svg xmlns="http://www.w3.org/2000/svg" className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
          
          {/* Challenges section */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="mb-3 block">What's your biggest struggle with waking up early?</Label>
                <RadioGroup value={struggle} onValueChange={(value) => setStruggle(value as StruggleType)}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={StruggleType.TIRED} id="struggle-1" />
                      <Label htmlFor="struggle-1">Feeling tired and groggy</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={StruggleType.LACK_OF_MOTIVATION} id="struggle-2" />
                      <Label htmlFor="struggle-2">Lack of motivation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={StruggleType.SNOOZE} id="struggle-3" />
                      <Label htmlFor="struggle-3">Hitting snooze multiple times</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={StruggleType.STAY_UP_LATE} id="struggle-4" />
                      <Label htmlFor="struggle-4">Staying up too late</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value={StruggleType.OTHER} id="struggle-5" />
                      <Label htmlFor="struggle-5">Other</Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              
              {struggle === StruggleType.OTHER && (
                <div>
                  <Label htmlFor="other-struggle">Please specify your struggle</Label>
                  <Input 
                    id="other-struggle" 
                    className="mt-1"
                    value={otherStruggle}
                    onChange={(e) => setOtherStruggle(e.target.value)}
                  />
                </div>
              )}
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
                <Button onClick={handleNextStep}>
                  Continue
                  <svg xmlns="http://www.w3.org/2000/svg" className="ml-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
          
          {/* Voice selection section */}
          {step === 3 && (
            <div className="space-y-6">
              <Label className="block mb-3">Choose your inspirational figure's voice</Label>
              
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
              
              <div>
                <Label htmlFor="custom-voice">Other person not listed?</Label>
                <Input 
                  id="custom-voice" 
                  className="mt-1"
                  placeholder="Enter name"
                  value={customVoice}
                  onChange={(e) => setCustomVoice(e.target.value)}
                  onClick={() => setVoice("")}
                />
                <p className="mt-1 text-xs text-gray-500">Note: Custom personalities are subject to availability</p>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={handlePreviousStep}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={submitPersonalizationMutation.isPending}
                >
                  {submitPersonalizationMutation.isPending ? "Saving..." : "Complete Setup"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
