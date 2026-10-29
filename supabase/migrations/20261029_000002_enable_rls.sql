ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.recipes,
  public.recipe_ingredients,
  public.tags,
  public.recipe_tags,
  public.plan_slots,
  public.shopping_list_items
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.recipes,
  public.recipe_ingredients,
  public.tags,
  public.recipe_tags,
  public.plan_slots,
  public.shopping_list_items
TO authenticated;

CREATE POLICY "Authenticated users can manage recipes"
  ON public.recipes
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage recipe ingredients"
  ON public.recipe_ingredients
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage tags"
  ON public.tags
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage recipe tags"
  ON public.recipe_tags
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage plan slots"
  ON public.plan_slots
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage shopping list items"
  ON public.shopping_list_items
  FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
