-- One-off data cleanup: removes the automated connectivity-check rows
-- inserted while verifying RLS/grants during Phase 2 (docs/PHASE_1_STATUS.md
-- / docs/PHASE_0_DISCOVERY.md work). Not a schema change.

delete from public.enquiries where contact_name ilike 'Connectivity Test%';
