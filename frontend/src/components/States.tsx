import { AlertCircle, LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Finding your next place…" }: { label?: string }) {
  return <div className="state-box"><LoaderCircle className="animate-spin text-brand" size={26} /><p>{label}</p></div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="state-box state-error"><AlertCircle size={25} /><p>{message}</p>{onRetry && <button className="button button-outline mt-3" onClick={onRetry}>Try again</button>}</div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">⌂</span><h3>{title}</h3><p>{body}</p>{action}</div>;
} 
