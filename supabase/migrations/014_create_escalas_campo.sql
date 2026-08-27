-- Create table for Field Service Leaders
CREATE TABLE IF NOT EXISTS escalas_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  dirigente_id UUID NOT NULL REFERENCES membros(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_data_dirigente UNIQUE (data, dirigente_id) -- Prevent duplicate assignments for same day? Or maybe just unique(data) if only one leader per day? 
  -- User asked for "fins de semana" (weekends). Usually there is one leader per group or one for the whole congregation?
  -- "Dirigentes de campo nos fins de semana" implies maybe one or more. 
  -- Let's assume one leader per day for the general meeting point for now, or maybe multiple.
  -- The prompt says "Quem poderá designar será o RQA".
  -- Let's stick to a simple structure: Date -> Leader. If they need multiple, they can add multiple rows or we change to array.
  -- Let's assume one main leader for the day/meeting. 
  -- Actually, usually there are separate groups. But "Dirigentes de campo nos fins de semana" often refers to the general arrangement.
  -- Let's assume one record per "event". If they need multiple, they can create multiple.
  -- I will NOT enforce unique(data) strictly yet, to allow flexibility (e.g. morning/afternoon or different locations), 
  -- but usually it's better to have a type or time. 
  -- For now, let's keep it simple: ID, Data, Dirigente.
);

-- Enable RLS
ALTER TABLE escalas_campo ENABLE ROW LEVEL SECURITY;

-- Policies

-- Read: All authenticated users
CREATE POLICY "Enable read access for all users"
ON escalas_campo
FOR SELECT
TO authenticated
USING (true);

-- Write: All authenticated users (for now, as requested)
CREATE POLICY "Enable write access for all users"
ON escalas_campo
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
