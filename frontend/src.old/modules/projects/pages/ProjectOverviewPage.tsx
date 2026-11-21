import { useParams } from 'react-router-dom';

import {
  useGetProjectOverviewKpisQuery,
  useGetProjectCriticalWbsQuery,
  useGetProjectTopCbsQuery,
  useGetProjectActivityFeedQuery,
  useGetProjectSCurveQuery,
} from '../api/projectsApi';
import { OverviewStatCards } from '../components/projectDetail/OverviewStatCards';
import { SCurveCard } from '../components/projectDetail/SCurveCard';
import { CriticalWbsAndTopCbs } from '../components/projectDetail/CriticalWbsAndTopCbs';
import { ActivityFeed } from '../components/projectDetail/ActivityFeed';

// صفحهٔ «نمای کلی» تب اول پروژه — بازنویسی وفادار بر اساس designs/Project.html.
// داده‌ها از RTK Query می‌آیند (فعلاً mock، بعداً واقعی).
// ساختار آمادهٔ اتصال به بک‌اند — وقتی API وصل شود، هیچ چیزی عوض نمی‌شود.

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = Number(projectId);

  const { data: kpis, isLoading: kpisLoading } = useGetProjectOverviewKpisQuery(id);
  const { data: criticalWbs = [], isLoading: wbsLoading } = useGetProjectCriticalWbsQuery(id);
  const { data: topCbs = [], isLoading: cbsLoading } = useGetProjectTopCbsQuery(id);
  const { data: feed = [], isLoading: feedLoading } = useGetProjectActivityFeedQuery(id);
  const { data: sCurve = [], isLoading: curveLoading } = useGetProjectSCurveQuery(id);

  // Loading state — skeleton ساده
  if (kpisLoading || !kpis) {
    return <OverviewSkeleton />;
  }

  return (
    <>
      {/* ۴ stat card بالای صفحه */}
      <OverviewStatCards kpis={kpis} />

      {/* منحنی پیشرفت S-Curve */}
      {!curveLoading && sCurve.length > 0 && <SCurveCard points={sCurve} />}

      {/* دو جدول پایین — Critical WBS + Top CBS */}
      {!wbsLoading && !cbsLoading && (
        <CriticalWbsAndTopCbs criticalWbs={criticalWbs} topCbs={topCbs} />
      )}

      {/* Activity feed */}
      {!feedLoading && <ActivityFeed items={feed} />}
    </>
  );
}

// skeleton صفحه — حین بارگذاری اولیه.
function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[160px] bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-[400px] bg-gray-100 rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-[300px] bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-[300px] bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <div className="h-[300px] bg-gray-100 rounded-lg animate-pulse" />
    </div>
  );
}
