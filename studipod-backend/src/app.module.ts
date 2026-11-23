import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configurations } from './config/configuration';

const usesContainerEnvironment = ['staging', 'production'].includes(process.env.APP_ENV ?? '');

// Root module. Feature modules from src/modules are registered here as they are implemented.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: configurations,
      // In staging and production, configuration comes only from the container environment.
      ignoreEnvFile: usesContainerEnvironment,
    }),
  ],
})
export class AppModule {}
