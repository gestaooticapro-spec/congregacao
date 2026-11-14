alter table public.territorios
add column if not exists mapa_config jsonb;

comment on column public.territorios.mapa_config is
'Limite e quadras desenhados sobre o Google Maps. O cartão original permanece em imagem_url.';
