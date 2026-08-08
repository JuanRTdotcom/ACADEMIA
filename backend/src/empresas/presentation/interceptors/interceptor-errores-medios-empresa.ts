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

/** Convierte fallos técnicos multipart en respuestas estables y traducibles. */
@Injectable()
export class InterceptorErroresMediosEmpresa implements NestInterceptor {
  intercept(
    _contexto: ExecutionContext,
    siguiente: CallHandler,
  ): Observable<unknown> {
    return siguiente.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof MulterError) {
          return throwError(() =>
            error.code === "LIMIT_FILE_SIZE"
              ? new PayloadTooLargeException("companies.media.tooLarge")
              : new BadRequestException("companies.media.invalidFile"),
          );
        }
        return throwError(() => error);
      }),
    );
  }
}
