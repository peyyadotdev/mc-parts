import { QueryCache, QueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../server/src/routers';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

// Create vanilla tRPC client for direct API calls
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_SERVER_URL}/trpc`,
    }),
  ],
});

// React hooks wrapper using React Query

export const trpc = {
  healthCheck: {
    useQuery: () => {
      return useQuery({
        queryKey: ['healthCheck'],
        queryFn: () => trpcClient.healthCheck.query(),
      });
    }
  },
  getProducts: {
    useQuery: (input: any) => {
      return useQuery({
        queryKey: ['getProducts', input],
        queryFn: () => trpcClient.getProducts.query(input),
      });
    }
  },
  getVariantsWithAttributes: {
    useQuery: (input: any) => {
      return useQuery({
        queryKey: ['getVariantsWithAttributes', input],
        queryFn: () => trpcClient.getVariantsWithAttributes.query(input),
      });
    }
  },
  updateVariantAttributes: {
    useMutation: (options?: any) => {
      return useMutation({
        mutationFn: (input: any) => trpcClient.updateVariantAttributes.mutate(input),
        ...options,
      });
    }
  }
};

