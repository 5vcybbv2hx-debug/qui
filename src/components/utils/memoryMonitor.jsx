// Memory Monitoring & Leak Detection
import { useEffect, useRef, useState } from 'react';

class MemoryMonitor {
  constructor(thresholdMB = 50) {
    this.thresholdMB = thresholdMB;
    this.snapshots = [];
    this.leakDetected = false;
    this.listeners = [];
  }

  // Erstelle Memory Snapshot
  createSnapshot() {
    if (!performance.memory) return null;

    return {
      timestamp: Date.now(),
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };
  }

  // Analysiere Memory-Trend für potenzielle Leaks
  analyzeMemoryTrend() {
    if (this.snapshots.length < 2) return null;

    const latest = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];

    const diff = (latest.usedJSHeapSize - previous.usedJSHeapSize) / 1024 / 1024; // Convert to MB

    return {
      diffMB: diff,
      isIncreasing: diff > 0,
      severity: Math.abs(diff) > this.thresholdMB ? 'high' : 'normal',
      usedMB: latest.usedJSHeapSize / 1024 / 1024,
      limitMB: latest.jsHeapSizeLimit / 1024 / 1024
    };
  }

  // Detektiere kontinuierliche Memory-Zunahme (möglicher Leak)
  detectMemoryLeak() {
    if (this.snapshots.length < 5) return false;

    const recentSnapshots = this.snapshots.slice(-5);
    let increasingCount = 0;

    for (let i = 1; i < recentSnapshots.length; i++) {
      if (recentSnapshots[i].usedJSHeapSize > recentSnapshots[i - 1].usedJSHeapSize) {
        increasingCount++;
      }
    }

    // Wenn 4 von 5 Messungen steigen = möglicher Leak
    const leak = increasingCount >= 4;
    if (leak && !this.leakDetected) {
      this.leakDetected = true;
      this.notifyListeners({ type: 'MEMORY_LEAK_DETECTED', data: this.analyzeMemoryTrend() });
    }

    return leak;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners(event) {
    this.listeners.forEach(callback => callback(event));
  }

  getStats() {
    if (this.snapshots.length === 0) return null;

    const latest = this.snapshots[this.snapshots.length - 1];
    const usedMB = latest.usedJSHeapSize / 1024 / 1024;
    const limitMB = latest.jsHeapSizeLimit / 1024 / 1024;
    const utilization = (usedMB / limitMB) * 100;

    return {
      usedMB: usedMB.toFixed(2),
      limitMB: limitMB.toFixed(2),
      utilizationPercent: utilization.toFixed(1),
      snapshotCount: this.snapshots.length,
      leakDetected: this.leakDetected,
      trend: this.analyzeMemoryTrend()
    };
  }

  clear() {
    this.snapshots = [];
    this.leakDetected = false;
  }
}

const memoryMonitor = new MemoryMonitor();

// React Hook für Memory Monitoring
export function useMemoryMonitor(interval = 30000) {
  const [stats, setStats] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const checkMemory = () => {
      const snapshot = memoryMonitor.createSnapshot();
      if (snapshot) {
        memoryMonitor.snapshots.push(snapshot);
        memoryMonitor.detectMemoryLeak();
        setStats(memoryMonitor.getStats());
      }
    };

    checkMemory(); // Initial check
    intervalRef.current = setInterval(checkMemory, interval);

    const unsubscribe = memoryMonitor.subscribe(event => {
      if (event.type === 'MEMORY_LEAK_DETECTED') {
        console.warn('⚠️ Potential memory leak detected:', event.data);
      }
    });

    return () => {
      clearInterval(intervalRef.current);
      unsubscribe();
    };
  }, [interval]);

  return stats;
}

// Force Garbage Collection (nur für Debugging)
export function forceGarbageCollection() {
  if (window.gc) {
    window.gc();
    console.log('✅ Garbage collection triggered');
  } else {
    console.warn('⚠️ Garbage collection not available. Run Chrome with --js-flags="--expose-gc"');
  }
}

export { MemoryMonitor, memoryMonitor };