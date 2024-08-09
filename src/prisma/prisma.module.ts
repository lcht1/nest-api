import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService], // ta dentro do module
  exports: [PrismaService], //tds arquivos que importarem prismamodule terao acesso
})
export class PrismaModule {}
