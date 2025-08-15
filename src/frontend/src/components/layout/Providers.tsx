import { ActorProvider } from "@charm/contexts/Actor";
import { AuthProvider } from "@charm/contexts/Auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ActorProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ActorProvider>
    </AuthProvider>
  );
}
