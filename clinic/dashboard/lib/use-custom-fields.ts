"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type FieldDef = {
  id: string;
  entity: string;
  key: string;
  label: string;
  field_type: "text" | "number" | "date" | "select" | "boolean";
  options: string[];
  position: number;
};

/** Load custom field definitions for an entity ('patient' | 'appointment' | 'lead'). */
export function useCustomFields(entity: string) {
  const [defs, setDefs] = useState<FieldDef[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("custom_field_defs")
        .select("id,entity,key,label,field_type,options,position")
        .eq("entity", entity)
        .order("position");
      setDefs((data as FieldDef[]) || []);
      setLoaded(true);
    })();
  }, [entity]);

  return { defs, loaded };
}
