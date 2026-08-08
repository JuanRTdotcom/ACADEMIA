import { HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ExecutionContext } from "@nestjs/common";
import { GuardiaLimiteRefresco } from "./guardia-limite-refresco";

function contextoConSid(sid?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: sid ? { sid } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe("GuardiaLimiteRefresco", () => {
  const crearGuardia = () =>
    new GuardiaLimiteRefresco(
      new ConfigService({
        REFRESH_SESSION_RATE_LIMIT: 2,
        REFRESH_SESSION_RATE_WINDOW_SECONDS: 60,
      }),
    );

  it("rechaza una petición sin sid previamente firmado", () => {
    expect(() => crearGuardia().canActivate(contextoConSid())).toThrow(
      HttpException,
    );
  });

  it("mantiene el límite por el sid estable de la sesión", () => {
    const guardia = crearGuardia();

    expect(guardia.canActivate(contextoConSid("sid-a"))).toBe(true);
    expect(guardia.canActivate(contextoConSid("sid-a"))).toBe(true);
    expect(() => guardia.canActivate(contextoConSid("sid-a"))).toThrow(
      HttpException,
    );
    expect(guardia.canActivate(contextoConSid("sid-b"))).toBe(true);
  });
});
