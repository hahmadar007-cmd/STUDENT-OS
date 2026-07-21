'use client';

import React from 'react';

export class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode, children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 m-4 font-mono text-xs overflow-auto">
          <p className="font-bold mb-2">Component Error:</p>
          <pre>{this.state.error?.message}</pre>
          <pre className="mt-2 text-[10px] opacity-70">{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
