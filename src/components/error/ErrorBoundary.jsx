import React, { Component } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
    
    // Log to analytics/monitoring
    if (window.__analyticsTrack) {
      window.__analyticsTrack({
        eventName: 'error_boundary_caught',
        properties: {
          error: error.toString(),
          component: errorInfo.componentStack
        }
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-destructive/10 mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground text-center mb-2">
              Etwas ist schiefgelaufen
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-secondary/50 border border-border rounded p-3 mb-4">
                <p className="text-xs font-mono text-muted-foreground break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={this.handleReset}
                className="flex-1"
              >
                Erneut versuchen
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;