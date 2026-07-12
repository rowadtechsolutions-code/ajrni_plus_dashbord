-- ============================================================
-- Branch Office Triggers
-- ============================================================
-- 1. force_branch_office_crn_null
--    Prevents branch-linked Offices from ever having a non-null
--    commercial_registration_number. Handles the mobile app bug
--    where it accidentally sends the parent office CRN.
--
-- 2. sync_linked_office_to_branch
--    Syncs Office field changes to the linked OfficeBranches row
--    so data stays consistent even when the mobile app only
--    updates the Offices table.
-- ============================================================

-- ============================================================
-- TRIGGER 1: Force CRN to NULL for branch-linked offices
-- ============================================================
create or replace function public.force_branch_office_crn_null()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public."OfficeBranches" b
    where b.linked_office_id = new.id
  ) then
    new.commercial_registration_number := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_force_branch_office_crn_null
on public."Offices";

create trigger trigger_force_branch_office_crn_null
before update of commercial_registration_number
on public."Offices"
for each row
execute function public.force_branch_office_crn_null();

comment on function public.force_branch_office_crn_null()
  is 'Forces commercial_registration_number to NULL for any Office row linked as a branch via OfficeBranches.linked_office_id';

-- ============================================================
-- TRIGGER 2: Sync Offices → OfficeBranches for linked branches
-- ============================================================
create or replace function public.sync_linked_office_to_branch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public."OfficeBranches"
  set
    branch_name = new.office_name,
    email = new.email,
    phone_number = new.phone_number,
    country = new.country,
    city = new.city,
    bio = new.bio,
    image = new.image,
    cover = new.cover
  where linked_office_id = new.id;

  return new;
end;
$$;

drop trigger if exists trigger_sync_linked_office_to_branch
on public."Offices";

create trigger trigger_sync_linked_office_to_branch
after update of
  office_name,
  email,
  phone_number,
  country,
  city,
  bio,
  image,
  cover
on public."Offices"
for each row
execute function public.sync_linked_office_to_branch();

comment on function public.sync_linked_office_to_branch()
  is 'Syncs Office field changes to the linked OfficeBranches row so data stays consistent';
