import { RouterProvider, type RouterProviderProps } from "react-router-dom";
import Providers from "./components/layout/Providers";
import { Toaster } from "react-hot-toast";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

type AppProps = { router: RouterProviderProps["router"] };

function App({ router }: AppProps) {
  return (
    <div className="bg-other-bg-0">
      <Providers>
        <RouterProvider
          router={router}
          future={{
            v7_startTransition: true,
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </Providers>
      <Toaster />
    </div>
  );
}

export default App;
