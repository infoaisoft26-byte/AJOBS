import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'esnext',
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three') || id.includes('@react-three')) {
                return 'vendor-3d-engine';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('jspdf')) {
                return 'vendor-pdf';
              }
              if (id.includes('xlsx') || id.includes('papaparse') || id.includes('mammoth')) {
                return 'vendor-xlsx';
              }
              if (id.includes('motion') || id.includes('gsap')) {
                return 'vendor-animations';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
            }
            if (id.includes('/src/components/admin/') || id.includes('AdminDashboard') || id.includes('AdminLogin')) {
              return 'chunk-admin';
            }
            if (id.includes('/src/components/employer/') || id.includes('EmployerDashboard')) {
              return 'chunk-recruiter';
            }
            if (id.includes('/src/components/consultancy/') || id.includes('/src/components/crm/') || id.includes('ConsultancyDashboard')) {
              return 'chunk-consultancy';
            }
            if (id.includes('/src/components/candidate/') || id.includes('CandidateDashboard') || id.includes('CandidatePreLaunch')) {
              return 'chunk-candidate';
            }
            if (id.includes('GlobalChatbot')) {
              return 'chunk-chatbot';
            }
            if (id.includes('analytics') || id.includes('telemetry')) {
              return 'chunk-analytics';
            }
          }
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

