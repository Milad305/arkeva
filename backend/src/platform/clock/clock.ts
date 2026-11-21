import { Injectable } from '@nestjs/common';

/** زمان تزریقی (docs/backend/04 ۱) تا مهلت‌ها و تیک‌ها بی‌sleep تست شوند. */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}

/** ساعت ثابت برای تست؛ با `advance` جلو می‌رود. */
export class FixedClock extends Clock {
  constructor(private current: Date) {
    super();
  }

  override now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}
