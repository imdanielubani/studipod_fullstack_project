import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { readInt } from './config/config.helpers';

// Process entry point for the HTTP API. Security middleware (Helmet, CORS,
// validation, rate limiting) and OpenAPI are registered here when the API is
// implemented; docs/api/api-architecture.md defines the required order.
async function bootstrap(): Promise<void> {
  const trustedProxyHops = readInt('TRUST_PROXY_HOPS', 0);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // Trust exactly N proxy hops (Cloudflare + Traefik = 2) so a client-supplied
    // X-Forwarded-For cannot spoof req.ip. 0 trusts no proxy.
    new FastifyAdapter({ trustProxy: (_address, hop) => hop < trustedProxyHops }),
  );
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  await app.listen({
    port: config.getOrThrow<number>('app.port'),
    host: config.getOrThrow<string>('app.host'),
  });
}

void bootstrap();
