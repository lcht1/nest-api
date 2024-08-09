import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { authorization } = request.headers;
    console.log(request.headers, 'request.headers');
    try {
      const data = await this.authService.checkToken(
        authorization.split(' ')[1],
      );
      // adiciona dados na request

      request.tokenPayload = data;
      request.user = await this.userService.findOne(data.id);
      return true;
    } catch (error) {
      console.log(error, 'error');
      return false;
    }
  }
}
