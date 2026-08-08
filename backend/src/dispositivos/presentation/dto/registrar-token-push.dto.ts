import { IsNotEmpty, IsString, MaxLength } from "class-validator"; // class-validator: validan el body

export class DtoRegistrarTokenPush {
  /** Id estable del dispositivo (cookie web / id nativo móvil); creado en el login. */
  @IsString()
  @IsNotEmpty()
  uid_dispositivo!: string;

  /** Token FCM que emite Firebase en el cliente; es la dirección de entrega del push. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  firebase_token_fcm!: string;
}
