-- Correct snack/drink cuisine tags on sit-down venue ratings.
-- Google often adds secondary `bakery` / `cafe` types on casual and fine
-- dining places; older inference prioritized those over meal cuisines.
UPDATE public.ratings
SET cuisine = 'other'
WHERE cuisine IN ('dessert', 'cafe', 'bar')
  AND venue_type IN ('casual', 'fine');
