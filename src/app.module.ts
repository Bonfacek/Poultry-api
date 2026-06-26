// import { Module } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { RedisModule } from '@nestjs-modules/ioredis';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// import { DatabaseModule } from './database/database.module';
// import { StreamingModule } from './modules/streaming/streaming.module';
// import configuration from './config/configuration';
// import { validationSchema } from './config/env.validation';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//       load: [configuration],
//       validationSchema,
//       envFilePath: '.env',
//     }),
//     RedisModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => ({
//         type: 'single',
//         url: `redis://${configService.get('redis.host')}:${configService.get('redis.port')}`,
//       }),
//     }),
//     DatabaseModule,
//     StreamingModule,
//   ],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}