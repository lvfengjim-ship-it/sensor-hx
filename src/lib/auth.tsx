import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { trpc } from "@/providers/trpc";

type Member = {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string | null;
  focusArea: string | null;
  createdAt: Date;
};

type AuthContextValue = {
  member: Member | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, member: Member) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  member: null,
  token: null,
  loading: true,
  setSession: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("hx_token"),
  );
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(!!token);

  const meQuery = trpc.member.me.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  });
  const logoutMutation = trpc.member.logout.useMutation();

  useEffect(() => {
    if (!token) {
      setMember(null);
      setLoading(false);
      return;
    }
    if (meQuery.data) {
      setMember(meQuery.data);
      setLoading(false);
    } else if (meQuery.isError) {
      localStorage.removeItem("hx_token");
      setToken(null);
      setMember(null);
      setLoading(false);
    }
  }, [token, meQuery.data, meQuery.isError]);

  const setSession = (newToken: string, newMember: Member) => {
    localStorage.setItem("hx_token", newToken);
    setToken(newToken);
    setMember(newMember);
    setLoading(false);
  };

  const logout = () => {
    logoutMutation.mutate();
    localStorage.removeItem("hx_token");
    setToken(null);
    setMember(null);
  };

  return (
    <AuthContext.Provider value={{ member, token, loading, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
