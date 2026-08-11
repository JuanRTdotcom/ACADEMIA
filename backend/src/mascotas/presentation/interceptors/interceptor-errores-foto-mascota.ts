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

@Injectable()
export class InterceptorErroresFotoMascota implements NestInterceptor {
  intercept(
    _contexto: ExecutionContext,
    siguiente: CallHandler,
  ): Observable<unknown> {
    return siguiente.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof MulterError)
          return throwError(() =>
            error.code === "LIMIT_FILE_SIZE"
              ? new PayloadTooLargeException("pets.photoTooLarge")
              : new BadRequestException("pets.invalidPhoto"),
          );
        return throwError(() => error);
      }),
    );
  }
}
