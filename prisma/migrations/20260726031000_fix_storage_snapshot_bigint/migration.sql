-- Fixes an integer overflow: a tenant's total storage (or the CLINIC plan's
-- 20GB quota) in bytes already exceeds the ~2.1B ceiling of a 32-bit INTEGER.
-- Confirmed by a real ConversionError while testing the previous migration
-- against a live tenant. ALTER ... TYPE BIGINT is a safe widening change
-- (BIGINT's range is a superset of INTEGER's), no data loss.

ALTER TABLE "storage_usage_snapshots" ALTER COLUMN "totalBytes" TYPE BIGINT;
ALTER TABLE "storage_usage_snapshots" ALTER COLUMN "quotaBytes" TYPE BIGINT;
ALTER TABLE "storage_usage_by_purpose_snapshots" ALTER COLUMN "sizeBytes" TYPE BIGINT;
