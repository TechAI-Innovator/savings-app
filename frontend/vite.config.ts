import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const frontendPort = parseInt(process.env.VITE_PORT || '8080');
  
  return {
    server: {
      host: "::",
      port: frontendPort,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
