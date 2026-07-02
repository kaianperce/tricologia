WITH ranked AS (
  SELECT
    id,
    patient_id,
    row_number() OVER (
      PARTITION BY patient_id
      ORDER BY
        jsonb_array_length(jsonb_path_query_array(coalesce(data, '{}'::jsonb), '$.keyvalue()')) DESC,
        completed DESC,
        updated_at DESC,
        created_at DESC
    ) AS rn
  FROM public.anamneses
)
DELETE FROM public.anamneses a
USING ranked r
WHERE a.id = r.id
  AND r.rn > 1
  AND coalesce(a.data, '{}'::jsonb) = '{}'::jsonb
  AND a.ai_analysis IS NULL
  AND a.completed = false;

CREATE UNIQUE INDEX IF NOT EXISTS anamneses_one_active_per_patient_idx
ON public.anamneses (patient_id);