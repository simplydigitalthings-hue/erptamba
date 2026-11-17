-- ============================================================================
-- TAMBA ERP - ROLLBACK SCRIPT FOR SPECTROMETER MTC CERTIFICATE GENERATOR
-- ============================================================================
-- Running this script completely removes all Spectrometer MTC data structures
-- and restores database schema to the exact pre-spectro state.
-- All standard ERP tables (purchase, store, item, dcinv, daily_prod)
-- remain 100% untouched.
-- ============================================================================

DROP INDEX IF EXISTS idx_spectro_heat_lookup;
DROP TABLE IF EXISTS spectro_heat_analysis CASCADE;
