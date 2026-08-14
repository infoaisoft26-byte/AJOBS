import app, { startExpiredJobsScheduler } from "./appServer.js";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";

const PORT = 3000;

// Boot background scheduler on non-serverless server instance
startExpiredJobsScheduler();

if (process.env.NODE_ENV !== "production") {
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Full-Stack dev server running on http://localhost:${PORT}`);
    });
  };
  startVite();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath, {
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filepath) => {
      if (filepath.endsWith(".html")) {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      } else {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  }));

  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-Stack production server running on port ${PORT}`);
  });
}
