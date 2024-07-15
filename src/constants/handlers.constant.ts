import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
export const mswServer = setupServer();

export const returnStatus = (status: number, url: string) => {
  return mswServer.use(
    http.post(url, () => {
      return HttpResponse.json({}, { status });
    }),
  );
};

export const returnError = (url: string) => {
  return mswServer.use(
    http.post(url, () => {
      return HttpResponse.error();
    }),
  );
};

export const returnAuctionSuccess = (url: string) => {
  return mswServer.use(
    http.post(url, () => {
      return HttpResponse.json({
        results: [
          {
            resultType: "listings",
            winners: [],
            error: false,
          },
          {
            resultType: "banners",
            winners: [],
            error: false,
          },
        ],
      });
    }),
  );
};
