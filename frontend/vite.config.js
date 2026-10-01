import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Don't crash when binary/large static files are added to public
      ignored: ["**/public/**"],
    },
  },
});
