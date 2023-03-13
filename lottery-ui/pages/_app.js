import { MoralisProvider } from "react-moralis";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <MoralisProvider initializeOnMount={false}>
      <Component {...pageProps} />
    </MoralisProvider>
  );
}
