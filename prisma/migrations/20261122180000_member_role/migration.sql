-- New Google sign-ins use MEMBER. Existing ADMIN and STAFF rows stay as they are.
ALTER TYPE "Role" ADD VALUE 'MEMBER';
