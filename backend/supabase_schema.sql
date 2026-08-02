# Supabase DDL Migration Script for AI Marketing OS (v4.0)
# Copy and execute this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Living Brand Memory (Hybrid Relational + JSONB)
CREATE TABLE IF NOT EXISTS public.brand_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    industry TEXT,
    brand_voice TEXT,
    tone TEXT,
    brand_memory JSONB NOT NULL DEFAULT '{
        "mission": "",
        "vision": "",
        "audience": {},
        "buyer_personas": [],
        "competitors": [],
        "writing_style": "",
        "personality": [],
        "taboo_topics": [],
        "hashtags": [],
        "seo_keywords": [],
        "pain_points": [],
        "goals": [],
        "cta_style": "",
        "examples": []
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Campaigns Table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_profile_id UUID NOT NULL REFERENCES public.brand_profiles(id) ON DELETE RESTRICT,
    title TEXT,
    objective TEXT,
    content_type TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalised')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Content Pieces
CREATE TABLE IF NOT EXISTS public.content_pieces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'x')),
    variation_no INT NOT NULL,
    content_text TEXT NOT NULL,
    cta TEXT,
    is_selected BOOLEAN DEFAULT FALSE,
    scores JSONB DEFAULT '{
        "overall": 0,
        "grammar": 0,
        "brand_voice": 0,
        "readability": 0,
        "cta_quality": 0
    }'::jsonb,
    review_notes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    preferred_styles TEXT[],
    rejected_patterns TEXT[],
    preferred_ctas TEXT[],
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Operational Telemetry & Step Logs
CREATE TABLE IF NOT EXISTS public.agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trace_id UUID NOT NULL,
    session_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    workflow_step TEXT NOT NULL,
    agent_version TEXT NOT NULL DEFAULT 'v1.0',
    prompt_version TEXT NOT NULL DEFAULT 'v1.0',
    provider_name TEXT NOT NULL,
    provider_model TEXT NOT NULL,
    execution_time_ms INT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'retry', 'error')),
    input_payload JSONB,
    output_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Video Requests (Phase 2 Stub)
CREATE TABLE IF NOT EXISTS public.video_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    provider_model TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    storyboard JSONB,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_profiles_user ON public.brand_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON public.campaigns(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_pieces_campaign_sel ON public.content_pieces(campaign_id, is_selected);
CREATE INDEX IF NOT EXISTS idx_agent_logs_step ON public.agent_logs(trace_id, workflow_step);

-- Row Level Security (RLS)
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own brand memory" ON public.brand_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own content" ON public.content_pieces FOR ALL USING (
    EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = content_pieces.campaign_id AND campaigns.user_id = auth.uid())
);
CREATE POLICY "Users access own logs" ON public.agent_logs FOR ALL USING (auth.uid() = user_id);
