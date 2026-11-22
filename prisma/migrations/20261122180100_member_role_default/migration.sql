-- Separate migration so the new enum value is committed before it is used as a default.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER';
