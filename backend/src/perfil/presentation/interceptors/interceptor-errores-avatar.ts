import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from "@nestjs/common";
import { MulterError } from "multer";
import type { Observable } from "rxjs";
import { catchError, throwError } from "rxjs";

/** Convierte errores técnicos de multipart en respuestas seguras y traducibles. */
@Injectable()
export class InterceptorErroresAvatar implements NestInterceptor {
  intercept(
    _contexto: ExecutionContext,
    siguiente: CallHandler,
  ): Observable<unknown> {
    return siguiente.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof MulterError) {
          return throwError(() =>
            error.code === "LIMIT_FILE_SIZE"
              ? new PayloadTooLargeException("profile.avatar.tooLarge")
              : new BadRequestException("profile.avatar.invalidFile"),
          );
        }
        return throwError(() => error);
      }),
    );
  }
}
