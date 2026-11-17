-- ROLLBACK SCRIPT: Feature 5 (Thread Go/No-Go Gauge Calibration & Wear Life Register)
-- Jamnagar Brass Components Quality & Metrology Subsystem
-- Safe, isolated teardown of Feature 5 tables without affecting core accounting or production tables.

DROP TABLE IF EXISTS gauge_calibration_logs CASCADE;
DROP TABLE IF EXISTS thread_gauges CASCADE;
