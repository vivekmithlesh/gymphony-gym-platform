import { supabase } from '@/supabase';
import { toast } from 'sonner';

/**
 * MOCK Payment Gateway Logic (100% Success Mode)
 * No keys or validation required.
 */

export const initiatePhonePePayment = async (
  amount: number,
  userId: string,
  onSuccess: () => Promise<void>,
  setIsProcessing: (loading: boolean) => void
) => {
  setIsProcessing(true);
  console.log('MOCK PAYMENT STARTED - No keys required');
  
  toast.info("Simulating PhonePe Payment...", {
    description: "Please wait while we verify your transaction.",
    duration: 1500
  });

  try {
    // Wait for 1.5 seconds loading state
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('SIMULATION COMPLETE - Calling success logic for User:', userId);

    // DIRECTLY call the success handler
    await onSuccess();
    
    // SUCCESS UI: Big green success toast
    toast.success("Payment Successful! Welcome to Pro", {
      description: "All premium features have been unlocked. Enjoy!",
      duration: 6000,
      className: "bg-green-50 border-green-200 text-green-800"
    });

  } catch (error: any) {
    console.error("MOCK PAYMENT CRASHED:", error);
    toast.error(`Mock Payment Failed: ${error.message || 'Unknown error'}`);
  } finally {
    setIsProcessing(false);
  }
};

export const finalizeUpgrade = async (userId: string | null) => {
  if (!userId) {
    console.error('Finalize Error: userId is null');
    throw new Error("User session not found");
  }

  console.log('Updating Supabase plan_type to Pro for owner:', userId);

  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data, error } = await supabase
      .from("gym_settings")
      .update({
        plan_type: "Pro"
      })
      .eq("gym_owner_id", userId)
      .select();

    if (error) {
      console.error('Supabase Update Error:', error);
      if (error.message.includes('plan_type')) {
        toast.error("Database Schema Mismatch", {
          description: "Please run this SQL in Supabase: ALTER TABLE gym_settings ADD COLUMN plan_type TEXT DEFAULT 'Free';",
          duration: 10000
        });
      }
      throw error;
    }

    console.log('Supabase Update Successful:', data);
    return true;
  } catch (err: any) {
    console.error('Finalize Upgrade Exception:', err);
    throw err;
  }
};
