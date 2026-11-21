// اعداد نمایشی نمودارها برای لایهٔ خواندن (F17). جدا از reads.ts چون این سرویس‌ها projects و planning را وارد می‌کنند و
// projects خودش reads.ts را وارد می‌کند (چرخهٔ ESM).
export { PlanCurves } from './application/plan-curves.js';
export { type CurvePoint, OverviewFigures, type OverviewFiguresView } from './application/overview-figures.js';
export { PortfolioTrend } from './application/portfolio-trend.js';
export { type CurveRow, forecastSeries, sampleDates } from './domain/formulas/curve.js';
export { ChartSeries, type ProgressSeries } from './application/chart-series.js';
export { CHART_RANGES, type ChartRange, chartRange, type ChartRangePreset, monthEnds, percentile } from './domain/formulas/chart-range.js';
