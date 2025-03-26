import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import svgr from "vite-plugin-svgr";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const iiUrl = (env: Record<string, string>) => {
  if (env.DFX_NETWORK === "local") {
    return `http://${env.CANISTER_ID_INTERNET_IDENTITY}.localhost:4943`;
  }
  if (env.DFX_NETWORK === "ic") {
    return `https://${env.CANISTER_ID_INTERNET_IDENTITY}.ic0.app`;
  }
};

const ledgerCanisterId = (env: Record<string, string>) => {
  if (env.DFX_NETWORK === "local") {
    console.log('env.CANISTER_ID_LEDGER', env.CANISTER_ID_LEDGER);
    return env.CANISTER_ID_LEDGER;
  }
  if (env.DFX_NETWORK === "ic") {
    return "ryjl3-tyaaa-aaaaa-aaaba-cai";
  }
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      global: "window",
      "process.env.VITE_DFX_NETWORK": JSON.stringify(env.DFX_NETWORK),
      "process.env.VITE_CANISTER_ID_FRONTEND": JSON.stringify(
        env.CANISTER_ID_FRONTEND,
      ),
      "process.env.VITE_CANISTER_ID_BACKEND": JSON.stringify(
        env.CANISTER_ID_BACKEND,
      ),
      "process.env.VITE_II_URL": JSON.stringify(iiUrl(env)),
      "process.env.VITE_CANISTER_ID_LEDGER": JSON.stringify(ledgerCanisterId(env)),
    },
    server: {
      fs: {
        allow: [
          __dirname,
          path.resolve(__dirname, "../declarations/"), // Allow serving files from an external directory
        ],
      },
    },
    plugins: [nodePolyfills(), react(), svgr()],
    resolve: {
      alias: {
        "@charm": path.resolve(__dirname, "./src"),
        "@ic": path.resolve(__dirname, "../declarations"),
      },
    },
    build: {
      outDir: "dist",
    },
  };
});
