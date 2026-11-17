-- ============================================================================
-- SMART ERP - Rollback Script for Feature 6: Machine Setup & Tooling Recipe Hub
-- SAFE & IDEMPOTENT: Only drops feature 6 tables; NEVER touches accounting/sales.
-- ============================================================================

DROP TABLE IF EXISTS machine_setup_recipes CASCADE;
