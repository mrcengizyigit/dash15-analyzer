import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-white p-10 flex flex-col items-center justify-center">
                    <h1 className="text-3xl font-bold text-red-500 mb-4">Bir Hata Oluştu</h1>
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 max-w-3xl w-full overflow-auto">
                        <p className="text-lg mb-4 font-semibold">{this.state.error && this.state.error.toString()}</p>
                        <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors"
                    >
                        Sayfayı Yenile
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
