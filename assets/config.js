/* Runtime config. The publishable/anon key is a PUBLIC client key — safe to commit
   (row-level security protects the data). No secrets here. If supabaseUrl is unset,
   the app runs in local/in-memory mode. */
window.PIVOT_CONFIG = {
  supabaseUrl: "https://ueiewicneajiyfptbkyc.supabase.co",
  supabaseAnonKey: "sb_publishable_1dNp_NoA1jBclugYpKfFtw_IZEglUZt",
  users: {
    "analyst@example.com": { name: "Dana Whitmore", role: "analyst", initials: "DW" },
    "supervisor@example.com": { name: "Karen Boyd", role: "supervisor", initials: "KB" }
  }
};
