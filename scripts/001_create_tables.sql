-- Create inscricoes table for internship registrations
create table if not exists public.inscricoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  telefone text not null,
  curso text not null,
  periodo text not null,
  disponibilidade text not null,
  conhecimentos text not null,
  experiencia text,
  motivacao text not null,
  linkedin text,
  portfolio text,
  arquivo_cv_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create admin_users table for authentication
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nome text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS on both tables
alter table public.inscricoes enable row level security;
alter table public.admin_users enable row level security;

-- Policies for inscricoes table
-- Allow public to insert (for registration form)
create policy "Anyone can submit internship applications"
  on public.inscricoes for insert
  with check (true);

-- Allow authenticated admin users to read all
create policy "Admins can view all applications"
  on public.inscricoes for select
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.id = auth.uid()
    )
  );

-- Allow authenticated admin users to update
create policy "Admins can update applications"
  on public.inscricoes for update
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.id = auth.uid()
    )
  );

-- Allow authenticated admin users to delete
create policy "Admins can delete applications"
  on public.inscricoes for delete
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.id = auth.uid()
    )
  );

-- Policies for admin_users table
create policy "Admins can view their own profile"
  on public.admin_users for select
  using (auth.uid() = id);

create policy "Admins can update their own profile"
  on public.admin_users for update
  using (auth.uid() = id);

-- Create indexes for better performance
create index if not exists inscricoes_email_idx on public.inscricoes(email);
create index if not exists inscricoes_created_at_idx on public.inscricoes(created_at desc);
create index if not exists admin_users_email_idx on public.admin_users(email);

-- Trigger to automatically create admin_users profile on signup
create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_users (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', 'Admin')
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_admin_user();
