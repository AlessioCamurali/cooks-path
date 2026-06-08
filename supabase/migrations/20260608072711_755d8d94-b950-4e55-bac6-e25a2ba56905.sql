
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles (with chef stats)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  skill_level TEXT NOT NULL DEFAULT 'novice' CHECK (skill_level IN ('novice','home_cook','enthusiast','advanced')),
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  recipes_completed INTEGER NOT NULL DEFAULT 0,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by anyone" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Recipes
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  cuisine TEXT,
  difficulty TEXT NOT NULL DEFAULT 'apprentice' CHECK (difficulty IN ('apprentice','line_cook','sous_chef','head_chef','legendary')),
  required_level INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  prep_minutes INTEGER,
  cook_minutes INTEGER,
  servings INTEGER,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recipes_level_idx ON public.recipes(required_level);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT SELECT ON public.recipes TO anon;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public recipes visible to all" ON public.recipes FOR SELECT USING (is_public = TRUE OR auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users create recipes" ON public.recipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "authors update own recipes" ON public.recipes FOR UPDATE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "authors delete own recipes" ON public.recipes FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));

-- Recipe progress / completions
CREATE TABLE public.recipe_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  xp_earned INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  UNIQUE(user_id, recipe_id)
);
GRANT SELECT, INSERT, DELETE ON public.recipe_completions TO authenticated;
GRANT ALL ON public.recipe_completions TO service_role;
ALTER TABLE public.recipe_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own completions" ON public.recipe_completions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Inventory scans (fridge / cutlery photos)
CREATE TABLE public.inventory_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('ingredients','tools')),
  image_path TEXT NOT NULL,
  detected_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_scans TO authenticated;
GRANT ALL ON public.inventory_scans TO service_role;
ALTER TABLE public.inventory_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own scans" ON public.inventory_scans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER recipes_touch BEFORE UPDATE ON public.recipes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Award XP + level + recipes_completed on completion insert
CREATE OR REPLACE FUNCTION public.award_xp_on_completion() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r_xp INTEGER;
BEGIN
  SELECT xp_reward INTO r_xp FROM public.recipes WHERE id = NEW.recipe_id;
  IF r_xp IS NULL THEN r_xp := 50; END IF;
  NEW.xp_earned := r_xp;
  UPDATE public.profiles
    SET xp = xp + r_xp,
        recipes_completed = recipes_completed + 1,
        level = GREATEST(1, 1 + ((xp + r_xp) / 100))
    WHERE id = NEW.user_id;
  RETURN NEW;
END $$;
CREATE TRIGGER recipe_completions_award BEFORE INSERT ON public.recipe_completions FOR EACH ROW EXECUTE FUNCTION public.award_xp_on_completion();

-- Auto-create profile + 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uname TEXT;
BEGIN
  uname := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1));
  -- ensure unique username
  WHILE EXISTS(SELECT 1 FROM public.profiles WHERE username = uname) LOOP
    uname := uname || floor(random()*1000)::text;
  END LOOP;
  INSERT INTO public.profiles(id, username, email) VALUES (NEW.id, uname, NEW.email);
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
