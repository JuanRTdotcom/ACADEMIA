import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MulterError } from "multer";
import type { Observable } from "rxjs";
import { catchError, throwError } from "rxjs";

@Injectable()
export class InterceptorErroresAdjuntosAtencion implements NestInterceptor {
  constructor(private config: ConfigService) {}

  intercept(
    _contexto: ExecutionContext,
    siguiente: CallHandler,
  ): Observable<unknown> {
    return siguiente.handle().pipe(
      catchError((error: unknown) => {
        if (error instanceof MulterError)
          return throwError(() =>
            error.code === "LIMIT_FILE_SIZE"
              ? new PayloadTooLargeException("attentions.attachmentTooLarge")
              : error.code === "LIMIT_FILE_COUNT"
                ? new BadRequestException({
                    message: "attentions.attachmentLimit",
                    args: {
                      max: this.config.getOrThrow<number>(
                        "ATTENTION_ATTACHMENT_MAX_FILES",
                      ),
                    },
                  })
                : new BadRequestException("attentions.invalidAttachment"),
          );
        return throwError(() => error);
      }),
    );
  }
}
