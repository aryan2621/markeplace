type EmptyStateProps = {
  message: string;
  secondary?: string;
};

export function EmptyState({ message, secondary }: EmptyStateProps) {
  return (
    <div className="w-full space-y-1 text-muted-foreground">
      <p>{message}</p>
      {secondary && <p className="text-sm">{secondary}</p>}
    </div>
  );
}
