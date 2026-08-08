-- AlterTable
ALTER TABLE "nucleo"."perfil_organizacion"
  ADD COLUMN "login_escudo_url" text,
  ADD COLUMN "login_escudo_oscuro_url" text,
  ADD COLUMN "login_escudo_misma_imagen" boolean NOT NULL DEFAULT true;
