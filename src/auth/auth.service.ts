import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthRegisterDto } from './dto/auth-register.dto';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService, // importando o prisma service de dentro do prisma module importado no auth.module
    private readonly mailer: MailerService,
  ) {}

  async createToken(user: User) {
    const token = {
      accessToken: this.jwtService.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        {
          expiresIn: '7 days',
          issuer: 'login',
          audience: 'users',
        },
      ),
    };
    console.log(token);
    return token;
  }

  async checkToken(token: string) {
    try {
      const data = await this.jwtService.verify(token, {
        issuer: 'login',
        audience: 'users',
      });
      return data;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async isValidToken(token: string) {
    try {
      await this.checkToken(token);
      return true;
    } catch (error) {
      return false;
    }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorreto.');
    }

    // verificar se o hash bate com a senha
    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('E-mail ou senha incorreto.');
    }
    await this.createToken(user);
  }

  async forget(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail está incorreto.');
    }

    const token = this.jwtService.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      {
        expiresIn: '1 hour',
        issuer: 'forget',
        audience: 'users',
      },
    );

    await this.mailer.sendMail({
      subject: 'Recuperação de Senha',
      to: user.email,
      template: 'forget',
      context: {
        name: user.name,
        token: token,
      },
    });
    return { success: true };
  }

  async reset(password: string, token: string) {
    try {
      const data = await this.jwtService.verify(token, {
        issuer: 'forget',
        audience: 'users',
      });

      if (isNaN(Number(data.id))) {
        throw new BadRequestException('Token inválido');
      }

      const salt = await bcrypt.genSalt();

      const user = await this.prisma.user.update({
        where: { id: Number(data.id) },
        data: {
          password: await bcrypt.hash(password, salt),
        },
      });

      return this.createToken(user);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async register(data: AuthRegisterDto) {
    const user = await this.userService.create(data);
    return this.createToken(user);
  }
}
