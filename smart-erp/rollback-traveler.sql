-- ============================================================================
-- TAMBA ERP - ROLLBACK SCRIPT FOR BATCH HEAT ROUTE CARD & DIGITAL QR TRAVELER
-- ============================================================================
-- Running this script completely removes all Route Traveler data structures
-- and restores database schema to the exact pre-traveler state.
-- All standard ERP tables (prodn_iwo_iss, store, item, purchase, daily_prod)
-- remain 100% untouched.
-- ============================================================================

DROP TABLE IF EXISTS prodn_traveler_stage CASCADE;
DROP TABLE IF EXISTS prodn_traveler CASCADE;
