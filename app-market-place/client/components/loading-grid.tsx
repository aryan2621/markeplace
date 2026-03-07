import { AppCardSkeleton } from "@/components/app-card-skeleton";

type LoadingGridProps = {
  count?: number;
};

export function LoadingGrid({ count = 6 }: LoadingGridProps) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <AppCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
