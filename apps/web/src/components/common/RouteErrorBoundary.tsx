import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  resetKey: string;
  onNavigateHome?: () => void;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Aisla errores de renderizado por vista dentro del layout para evitar que bloqueen el router de la SPA,
 * reiniciando automáticamente al cambiar la ruta activa.
 */
export class RouteErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Error de renderizado en la vista:', error, info);
  }

  public componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  private handleGoHome = (): void => {
    this.setState({ hasError: false });
    this.props.onNavigateHome?.();
  };

  public render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section
        role="alert"
        className="m-4 sm:m-6 p-6 border border-red-500/40 bg-dark-card font-mono flex flex-col gap-4"
      >
        <div className="flex items-center gap-2.5 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <h2 className="text-base font-bold text-white">Ocurrió un error al mostrar esta vista.</h2>
        </div>
        <p className="text-sm text-dark-muted font-sans leading-[1.5]">
          Puedes volver a intentarlo o regresar al inicio para seguir navegando sin recargar la aplicación.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={this.handleRetry}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs uppercase tracking-wider pixel-button inline-flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
          {this.props.onNavigateHome && (
            <button
              type="button"
              onClick={this.handleGoHome}
              className="px-4 py-2 border border-dark-border hover:border-brand-500 text-dark-text hover:text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 transition-colors"
            >
              <Home className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ir al inicio</span>
            </button>
          )}
        </div>
      </section>
    );
  }
}
