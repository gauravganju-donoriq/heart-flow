import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const SkeletonCard = ({ rows = 3, cols = 3 }: { rows?: number; cols?: number }) => (
  <Card>
    <CardHeader>
      <Skeleton className="h-4 w-32" />
    </CardHeader>
    <CardContent>
      <div className={`grid gap-4 md:grid-cols-${cols}`}>
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const DonorDetailSkeleton = () => (
  <div className="space-y-5 max-w-4xl">
    {/* Header skeleton */}
    <div className="flex items-center gap-4">
      <Skeleton className="h-9 w-9 rounded-md" />
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-3.5 w-28" />
      </div>
    </div>

    {/* Tabs skeleton */}
    <div className="flex gap-1 border-b border-border pb-px">
      {['Overview', 'Clinical', 'Logistics', 'Documents'].map((t) => (
        <Skeleton key={t} className="h-9 w-20 rounded-sm" />
      ))}
    </div>

    {/* Card skeletons */}
    <SkeletonCard rows={1} cols={3} />
    <SkeletonCard rows={1} cols={3} />
    <SkeletonCard rows={2} cols={3} />
    <SkeletonCard rows={1} cols={3} />
  </div>
);

export default DonorDetailSkeleton;
