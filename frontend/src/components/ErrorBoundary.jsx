import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <p className="text-sm font-black text-white mb-1">页面加载出错</p>
          <p className="text-xs text-white/40 mb-4 max-w-xs">
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/60 hover:text-white transition-all"
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
