import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

const TableSkeleton = ({ rows = 5, cols = 4 }: TableSkeletonProps) => (
  <div className="border border-border rounded-lg overflow-hidden">
    {/* Header */}
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-20" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-b-0">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className={`h-4 ${c === 0 ? 'w-24' : c === cols - 1 ? 'w-16' : 'w-32'}`} />
        ))}
      </div>
    ))}
  </div>
);

export default TableSkeleton;
