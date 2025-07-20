// In-memory store for sync progress (in production, use Redis)
const syncProgress = new Map<string, {
  isRunning: boolean;
  progress: number;
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  currentStep: string;
  startTime: number;
  lastUpdate: number;
}>();

export function getSyncProgress(shopDomain: string) {
  const progress = syncProgress.get(shopDomain);
  
  if (!progress) {
    return {
      isRunning: false,
      progress: 0,
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      currentStep: 'idle',
      estimatedTimeRemaining: 0,
      progressPercentage: 0,
    };
  }
  
  // Calculate estimated time remaining
  const elapsed = Date.now() - progress.startTime;
  const rate = progress.processed / elapsed; // products per ms
  const remaining = progress.total - progress.processed;
  const estimatedTimeRemaining = rate > 0 ? Math.round(remaining / rate) : 0;
  
  return {
    ...progress,
    estimatedTimeRemaining,
    progressPercentage: progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0,
  };
}

export function startSyncProgress(shopDomain: string, total: number) {
  syncProgress.set(shopDomain, {
    isRunning: true,
    progress: 0,
    total,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    currentStep: 'fetching',
    startTime: Date.now(),
    lastUpdate: Date.now(),
  });
}

export function updateSyncProgress(shopDomain: string, updates: Partial<{
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  currentStep: string;
}>) {
  const current = syncProgress.get(shopDomain);
  if (current) {
    syncProgress.set(shopDomain, {
      ...current,
      ...updates,
      lastUpdate: Date.now(),
    });
  }
}

export function finishSyncProgress(shopDomain: string) {
  const current = syncProgress.get(shopDomain);
  if (current) {
    syncProgress.set(shopDomain, {
      ...current,
      isRunning: false,
      currentStep: 'completed',
      lastUpdate: Date.now(),
    });
    
    // Clean up after 5 minutes
    setTimeout(() => {
      syncProgress.delete(shopDomain);
    }, 5 * 60 * 1000);
  }
} 