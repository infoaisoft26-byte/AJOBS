import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'auth.aijobs1.in';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': JSON.stringify(firebaseAuthDomain),
    },
    resolve: {
      dedupe: ['react', 'react-dom', 'react-is'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
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
            // Keep Vite's dynamic-import bootstrap helper in a tiny, dependency-free
            // runtime chunk. If Rollup places it in a heavy vendor chunk (for example
            // jsPDF), that vendor executes before React and can blank the whole app.
            if (id.includes('vite/preload-helper')) {
              return 'vendor-runtime';
            }
            if (id.includes('node_modules')) {
              // React core MUST be grouped together first so sub-dependencies do not duplicate or isolate it
              if (
                id.includes('/node_modules/react/') ||
                id.includes('/node_modules/react-dom/') ||
                id.includes('/node_modules/react-is/') ||
                id.includes('/node_modules/scheduler/')
              ) {
                return 'vendor-react';
              }
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
