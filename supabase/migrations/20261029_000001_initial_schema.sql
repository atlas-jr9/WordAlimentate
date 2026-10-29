CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE ingredient_unit AS ENUM ('uds', 'g', 'ml', 'approx');
CREATE TYPE plan_slot_name AS ENUM ('lunch', 'dinner');

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  food_type TEXT NOT NULL CHECK (food_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'other')),
  servings INTEGER NOT NULL CHECK (servings > 0),
  instructions TEXT NOT NULL CHECK (length(trim(instructions)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipes_food_type
  ON recipes (food_type);

CREATE INDEX IF NOT EXISTS idx_recipes_created_at
  ON recipes (created_at DESC);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit ingredient_unit NOT NULL,
  pantry BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (recipe_id, name, unit)
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id
  ON recipe_ingredients (recipe_id);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS recipe_tags (
  recipe_id UUID NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_tags_tag_id
  ON recipe_tags (tag_id);

CREATE TABLE IF NOT EXISTS plan_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot plan_slot_name NOT NULL,
  recipe_id UUID NULL REFERENCES recipes (id) ON DELETE SET NULL,
  UNIQUE (week_start, day_of_week, slot)
);

CREATE INDEX IF NOT EXISTS idx_plan_slots_week_start
  ON plan_slots (week_start);

CREATE INDEX IF NOT EXISTS idx_plan_slots_recipe_id
  ON plan_slots (recipe_id);

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL CHECK (EXTRACT(ISODOW FROM week_start) = 1),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  quantity NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit ingredient_unit NOT NULL,
  manual BOOLEAN NOT NULL DEFAULT FALSE,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (week_start, name, unit)
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_week_start
  ON shopping_list_items (week_start);

CREATE INDEX IF NOT EXISTS idx_shopping_list_items_checked
  ON shopping_list_items (checked, week_start);
