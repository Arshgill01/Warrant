export type WorktreeBoundaryStatus = "placeholder" | "shared" | "reserved";

export interface WorktreeBoundary {
  key: string;
  label: string;
  path: string;
  purpose: string;
  futureWorktree: string;
  notes: string;
  status: WorktreeBoundaryStatus;
}
