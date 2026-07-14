"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Resolve the signed-in staff member's clinic_id (RLS limits clinics to theirs). */
export function useClinicId() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("clinics").select("id").limit(1).maybeSingle();
      setClinicId(data?.id ?? null);
    })();
  }, []);
  return clinicId;
}
