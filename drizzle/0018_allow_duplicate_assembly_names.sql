DROP INDEX IF EXISTS "assembly_constituencies_state_name_idx";
CREATE INDEX "assembly_constituencies_state_name_idx" ON "assembly_constituencies" USING btree ("state_id", "name");
