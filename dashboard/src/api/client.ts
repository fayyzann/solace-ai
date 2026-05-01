import axios from "axios";
import { supabase } from "../lib/supabase";

export const api = axios.create({ baseURL: "/api/v1" });

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) config.headers.Authorization = `Bearer ${session.access_token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      const { data: { session } } = await supabase.auth.refreshSession();
      if (session) {
        err.config.headers.Authorization = `Bearer ${session.access_token}`;
        return api(err.config);
      }
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
