import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { WalletProvider } from "@/components/WalletProvider";
import { ThemeProvider } from "next-themes";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class">
      <WalletProvider>
        <Component {...pageProps} />
      </WalletProvider>
    </ThemeProvider>
  );
}