interface LoaderProps {
    text?: string;
}

export function Loader({ text = "CARREGANDO..." }: LoaderProps) {
    return (
        <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative h-12 w-12">
                <div className="absolute inset-0 rounded-full border-4 border-muted opacity-20"></div>
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-accent border-r-transparent border-b-transparent border-l-transparent"></div>
            </div>
            <p className="animate-pulse text-sm font-medium text-accent">{text}</p>
        </div>
    );
}
