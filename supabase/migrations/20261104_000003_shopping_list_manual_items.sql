ALTER TABLE public.shopping_list_items
  ALTER COLUMN quantity DROP NOT NULL,
  ALTER COLUMN unit DROP NOT NULL;

ALTER TABLE public.shopping_list_items
  DROP CONSTRAINT IF EXISTS shopping_list_items_week_start_name_unit_key,
  ADD CONSTRAINT shopping_list_items_manual_details
    CHECK (
      (quantity IS NULL) = (unit IS NULL)
      AND (manual OR (quantity IS NOT NULL AND unit IS NOT NULL))
    );

CREATE UNIQUE INDEX idx_shopping_list_items_week_name_unit
  ON public.shopping_list_items (week_start, name, unit) NULLS NOT DISTINCT;
