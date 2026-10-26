import { NextRequest } from "next/server";

type RouteHandler<Params> = (
  request: NextRequest,
  context: { params: Promise<Params> },
) => Response | Promise<Response>;

export async function callRoute<Params extends Record<string, string>>(
  handler: RouteHandler<Params>,
  init: {
    method?: string;
    url?: string;
    json?: unknown;
    formData?: FormData;
    params?: Params;
  } = {},
): Promise<Response> {
  const request = new NextRequest(init.url ?? "http://localhost/api/test", {
    method: init.method ?? "GET",
    body: init.formData ?? (init.json === undefined ? undefined : JSON.stringify(init.json)),
    headers: init.json === undefined ? undefined : { "Content-Type": "application/json" },
  });
  return handler(request, { params: Promise.resolve(init.params ?? ({} as Params)) });
}
