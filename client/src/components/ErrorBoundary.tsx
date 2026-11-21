import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[320px] p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-6 rounded-xl border border-border bg-card">
            <AlertTriangle
              size={40}
              className="text-amber-500 mb-4 flex-shrink-0"
            />

            <h3 className="text-lg font-semibold mb-2">
              {this.props.fallbackTitle || "This section had a temporary issue."}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Your other farm data is intact. You can try reloading this section.
            </p>

            <button
              onClick={this.handleReset}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={15} />
              Try Again
            </button>
          </div>
        </div>
      );
    }
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
