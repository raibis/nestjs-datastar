import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatastarModule } from 'nestjs-datastar';

@Module({
  imports: [
    DatastarModule.forRoot({
      baseViewDir: 'views/**/*.pug',
      viewEngine: 'pug',
      isDevelopment: true,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
