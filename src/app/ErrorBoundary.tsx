import { Component, type ErrorInfo, type ReactNode } from 'react';
import { i18n } from '@/i18n';

interface State {
  failed: boolean;
}

/** Evita schermate bianche: mostra un messaggio comprensibile con possibilità di riprovare. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <h1 className="text-xl font-bold">{i18n.t('errors.boundaryTitle')}</h1>
        <p className="text-muted">{i18n.t('errors.boundaryBody')}</p>
        <button
          className="btn-primary"
          onClick={() => {
            window.location.hash = '#/';
            window.location.reload();
          }}
        >
          {i18n.t('common.retry')}
        </button>
      </div>
    );
  }
}
