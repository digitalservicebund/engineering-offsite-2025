import { Plugin, defineConfig } from "vite";
import fs from "fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import os from "os";

function getNetworkIp() {
  const networkInterfaces = os.networkInterfaces();
  for (const interfaceName in networkInterfaces) {
    const networkInterface = networkInterfaces[interfaceName];
    if (networkInterface) {
      for (const anInterface of networkInterface) {
        if (anInterface.family === "IPv4" && !anInterface.internal) {
          return anInterface.address;
        }
      }
    }
  }
  return "localhost";
}

const networkIp = getNetworkIp();
const __dirname = dirname(fileURLToPath(import.meta.url));

const ipPlugin: () => Plugin = () => ({
  name: "ip-plugin",
  configureServer: (server) => {
    const ipFile = resolve(__dirname, "src/ip.ts");
    const ipAddress =
      server.config.server.host === true ? networkIp : "localhost";
    fs.writeFileSync(ipFile, `export const ipAddress = '${ipAddress}'\n`);
  },
});

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  plugins: [ipPlugin()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        floorplan: resolve(__dirname, "pages/floorplan.html"),
        map: resolve(__dirname, "pages/map.html"),
        timeline: resolve(__dirname, "pages/timeline.html"),
      },
    },
  },
});
