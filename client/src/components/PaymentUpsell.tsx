import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Star, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface PaymentUpsellProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBundle?: (bundle: "20_calls" | "50_calls") => void;
  onSkip: () => void;
}

export default function PaymentUpsell({ isOpen, onClose, onSelectBundle, onSkip }: PaymentUpsellProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleBundleSelect = async (bundleType: "20_calls" | "50_calls") => {
    setIsLoading(bundleType);
    
    try {
      const response = await apiRequest("POST", "/api/stripe/create-checkout", {
        bundleType,
      });
      
      // Redirect to Stripe Checkout
      window.location.href = response.checkoutUrl;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: error.message || "Failed to create payment session. Please try again.",
      });
      setIsLoading(null);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Your free call is on the way! 📞
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Success message */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-gray-600">
              Calls after your free trial come from one of our bundles — simple, pay-as-you-go. 
              Pick the one that fits you best, and never miss a morning again.
            </p>
          </div>

          {/* Bundle options */}
          <div className="space-y-3">
            {/* 20 Calls Bundle */}
            <Card 
              className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => handleBundleSelect("20_calls")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">20 Calls</h3>
                      <p className="text-sm text-gray-600">Perfect for getting started</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">$9.99</div>
                    <div className="text-xs text-gray-500">$0.50 per call</div>
                    {isLoading === "20_calls" && (
                      <div className="text-xs text-primary">Processing...</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 50 Calls Bundle - Popular */}
            <Card 
              className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all relative"
              onClick={() => handleBundleSelect("50_calls")}
            >
              <div className="absolute -top-2 -right-2">
                <Badge className="bg-green-500 hover:bg-green-600">
                  <Star className="h-3 w-3 mr-1" />
                  Popular
                </Badge>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">50 Calls</h3>
                      <p className="text-sm text-gray-600">Best value for regular use</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">$19.99</div>
                    <div className="text-xs text-gray-500">$0.40 per call</div>
                    <div className="text-xs text-green-600 font-medium">Save 20%</div>
                    {isLoading === "50_calls" && (
                      <div className="text-xs text-primary">Processing...</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col space-y-2">
            <p className="text-xs text-center text-gray-500">
              Secure payment • Cancel anytime • No recurring charges
            </p>
            
            <Button 
              variant="outline" 
              onClick={() => {
                onSkip();
                onClose();
              }}
              className="w-full"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}