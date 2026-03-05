-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    base_currency TEXT DEFAULT 'NGN',
    preferences JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create analysis_summaries table
CREATE TABLE IF NOT EXISTS public.analysis_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_income NUMERIC(20, 2) DEFAULT 0,
    total_expenses NUMERIC(20, 2) DEFAULT 0,
    category_breakdown JSONB DEFAULT '{}'::jsonb,
    top_merchants JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    limit_amount NUMERIC(20, 2) NOT NULL,
    period TEXT CHECK (period IN ('monthly', 'weekly')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create category_overrides table
CREATE TABLE IF NOT EXISTS public.category_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    narration_pattern TEXT NOT NULL,
    assigned_category TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_overrides ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies
-- user_profiles: only user can see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);

-- wallets: only user can see/edit their own wallets
CREATE POLICY "Users can view own wallets" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallets" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallets" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wallets" ON public.wallets FOR DELETE USING (auth.uid() = user_id);

-- analysis_summaries: only user can see/edit their own summaries
CREATE POLICY "Users can view own summaries" ON public.analysis_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summaries" ON public.analysis_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- budgets: only user can see/edit their own budgets
CREATE POLICY "Users can view own budgets" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budgets" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budgets" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- category_overrides: only user can see/edit their own overrides
CREATE POLICY "Users can view own overrides" ON public.category_overrides FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own overrides" ON public.category_overrides FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own overrides" ON public.category_overrides FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own overrides" ON public.category_overrides FOR DELETE USING (auth.uid() = user_id);

-- 8. Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_wallets BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_budgets BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_overrides BEFORE UPDATE ON public.category_overrides FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
