CREATE TABLE IF NOT EXISTS "chocogo"."password_reset" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newtable_pk" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_unique" ON "chocogo"."password_reset"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_id_usuario_idx" ON "chocogo"."password_reset"("id_usuario");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'password_reset_usuario_fkey'
          AND conrelid = 'chocogo.password_reset'::regclass
    ) THEN
        ALTER TABLE "chocogo"."password_reset"
        ADD CONSTRAINT "password_reset_usuario_fkey"
        FOREIGN KEY ("id_usuario") REFERENCES "chocogo"."usuario"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;