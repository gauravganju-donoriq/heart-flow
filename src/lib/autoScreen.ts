import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget: triggers AI screening for a donor after submission.
 * Errors are silently logged — screening is advisory and should not block submission.
 */
export const triggerAutoScreening = (donorId: string) => {
  supabase.functions.invoke("screen-donor", {
    body: { donor_id: donorId },
  }).then(({ error }) => {
    if (error) {
      console.warn("Auto-screening failed (non-blocking):", error.message);
    } else {
      console.log("Auto-screening triggered for donor:", donorId);
    }
  });
};
