import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { ModuloAplicacion } from "./app.module";

async function iniciarAplicacion() {
  const app =
    await NestFactory.create<NestExpressApplication>(ModuloAplicacion);
  const config = app.get(ConfigService);

  // Cabeceras seguras + parseo de cookies.
  app.use(helmet());
  app.use(cookieParser());

  // Nest siempre está detrás de exactamente un proxy directo: SvelteKit (que a su vez
  // puede estar tras nginx/cloudflare, pero eso ya lo resuelve SvelteKit y reenvía una
  // sola IP real en X-Forwarded-For). Por eso confiamos en 1 salto: Express toma la IP
  // del cliente desde esa cabecera. Sin la cabecera, req.ip quedaría undefined.
  app.set("trust proxy", 1);

  // Validación global de DTOs: rechaza campos no declarados.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS cerrado al frontend, con credenciales (cookies).
  app.enableCors({
    origin: config.getOrThrow<string>("FRONTEND_ORIGIN"),
    credentials: true,
  });

  await app.listen(config.getOrThrow<number>("PORT"));
}
void iniciarAplicacion();
