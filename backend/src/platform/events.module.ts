import { Global, Module } from '@nestjs/common';
import { STORAGE_ENTITIES } from './storage/storage.entities.js';
import { DiscoveryModule } from '@nestjs/core';
import { Audit } from './audit/audit.js';
import { AuditLog } from './audit/audit-log.entity.js';
import { Jobs } from './jobs/jobs.js';
import { DomainEvent } from './outbox/domain-event.entity.js';
import { EventDispatcher } from './outbox/event-dispatcher.js';
import { Outbox } from './outbox/outbox.js';
import { TickRunner } from './scheduler/tick-runner.js';

// زیرساخت رویداد F20 (docs/backend/08): صف، outbox و پخش، زمان‌بند، ممیزی. سراسری تا هر ماژول
// Outbox و Audit را بی‌واردکردن ماژول بگیرد.

/** Entityهای platform؛ ریشهٔ ترکیب (database/registry.ts) کنار Entityهای ماژول‌ها ثبتشان می‌کند. */
export const PLATFORM_ENTITIES = [DomainEvent, AuditLog, ...STORAGE_ENTITIES];
export const PLATFORM_TENANT_ENTITIES = [DomainEvent, AuditLog, ...STORAGE_ENTITIES];

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [Jobs, Outbox, EventDispatcher, TickRunner, Audit],
  exports: [Jobs, Outbox, Audit, TickRunner, EventDispatcher],
})
export class PlatformEventsModule {}
