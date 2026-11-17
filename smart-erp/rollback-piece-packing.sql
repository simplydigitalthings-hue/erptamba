-- ============================================================================
-- EMERGENCY ROLLBACK SCRIPT: Feature 4 - Piece-Count Weighing Scale & Box Packing
-- Target Environment: Neon PostgreSQL (branch beta, database bbi)
-- Scope: Drops only packing_cartons and packing_consignments tables.
-- Zero Impact: Does NOT alter purchase, dcinv, fund_trans, daily_prod, or any accounting table.
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS packing_cartons CASCADE;
DROP TABLE IF EXISTS packing_consignments CASCADE;

COMMIT;

-- Verification query: Both tables should return zero relations
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('packing_consignments', 'packing_cartons');
