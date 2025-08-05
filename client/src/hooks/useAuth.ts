import { useQuery } from "@tanstack/react-query";

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}