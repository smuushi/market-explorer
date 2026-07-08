import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-hover", className)} />;
}

export function PanelSkeleton() {
  return (
    <Card className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <Bar className="h-5 w-24" />
        <Bar className="h-5 w-14" />
      </div>
      <Bar className="h-5 w-5/6" />
      <Bar className="h-9 w-28" />
      <Bar className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-4 border-t border-edge pt-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Bar className="h-3 w-14" />
            <Bar className="h-4 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CompareSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Bar className="h-3 w-20" />
              <Bar className="h-6 w-16" />
            </div>
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
    </div>
  );
}
