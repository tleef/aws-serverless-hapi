import qs from "querystring";
import { Server } from "@hapi/hapi";
import { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy";

export async function proxy(server: Server, event: APIGatewayProxyEvent) {
  const querystring = qs.stringify(
    event.multiValueQueryStringParameters || undefined
  );

  const { statusCode, payload, rawPayload, headers } = await server.inject({
    method: event.httpMethod,
    url: `${event.path}?${querystring}`,
    payload:
      event.isBase64Encoded && event.body
        ? Buffer.from(event.body, "base64")
        : event.body || undefined,
    headers: Object.entries(event.multiValueHeaders || {}).reduce(
      (collect, [name, value]) => ({
        ...collect,
        [name]: value.length === 1 ? value[0] : value,
      }),
      {}
    ),
  });

  const { "content-type": type, "content-encoding": encoding } = headers;
  const isBase64Encoded =
    Boolean(typeof type === "string" && !type.match(/; *charset=/)) ||
    Boolean(encoding && encoding !== "identity");

  return {
    statusCode,
    isBase64Encoded,
    body: isBase64Encoded ? rawPayload.toString("base64") : payload,
    multiValueHeaders: Object.entries(headers).reduce(
      (collect, [name, value]) => ({
        ...collect,
        [name]: Array.isArray(value) ? value : [value],
      }),
      {}
    ),
  };
}
