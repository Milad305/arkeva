import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { DiscoveryModule } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokens } from './access-tokens.js';
import { AmountInterceptor } from './amounts.js';
import { AppVersionGuard } from './app-version.guard.js';
import { AccessCoverage } from './coverage.js';
import { AuthGuard, PermissionGuard } from './guards.js';

// گاردها سراسری‌اند: هر endpoint بی‌استثنا از آن‌ها می‌گذرد (07 ۱). پیاده‌سازی AccessResolver
// را ماژول team فراهم می‌کند.
@Global()
@Module({
  imports: [JwtModule.register({}), DiscoveryModule],
  providers: [
    AccessTokens,
    AccessCoverage,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    // پس از AuthGuard تا نشست android شناخته شود (F08 ۵.۳)
    { provide: APP_GUARD, useClass: AppVersionGuard },
    { provide: APP_INTERCEPTOR, useClass: AmountInterceptor },
  ],
  exports: [AccessTokens, AccessCoverage],
})
export class SecurityModule {}
