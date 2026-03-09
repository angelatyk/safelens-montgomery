-- Migration 016: Proper many-to-many linkage between narratives and their data sources

-- Narrative ↔ Incidents junction table
CREATE TABLE IF NOT EXISTS public.narrative_incidents (
    narrative_id uuid NOT NULL REFERENCES public.narratives(id) ON DELETE CASCADE,
    incident_id  uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    PRIMARY KEY (narrative_id, incident_id)
);

-- Narrative ↔ News Articles junction table
CREATE TABLE IF NOT EXISTS public.narrative_news_articles (
    narrative_id     uuid NOT NULL REFERENCES public.narratives(id) ON DELETE CASCADE,
    news_article_id  uuid NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
    PRIMARY KEY (narrative_id, news_article_id)
);

-- Drop the now-redundant static count columns (counts will be derived dynamically via COUNT(*))
-- Keeping them as nullable for backward compat so existing rows don't break
ALTER TABLE public.narratives
    ALTER COLUMN incident_count DROP NOT NULL,
    ALTER COLUMN news_count    DROP NOT NULL;

-- RLS: allow authenticated reads
ALTER TABLE public.narrative_incidents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_news_articles   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON public.narrative_incidents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read for authenticated" ON public.narrative_news_articles
    FOR SELECT USING (auth.role() = 'authenticated');
