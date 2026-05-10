exports.handler = async event => {
  const targetOrigin = event.headers["x-imt-api-origin"] || event.headers["X-Imt-Api-Origin"]
  const path = event.queryStringParameters && event.queryStringParameters.path

  if (!targetOrigin || !/^https?:\/\/[^/]+$/i.test(targetOrigin)) {
    return {
      statusCode: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ message: "Missing or invalid API origin" }),
    }
  }

  if (!path || !path.startsWith("/api/")) {
    return {
      statusCode: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ message: "Missing or invalid API path" }),
    }
  }

  const targetUrl = new URL(path, targetOrigin)

  const requestHeaders = new Headers()
  const contentType = event.headers["content-type"] || event.headers["Content-Type"]
  const authorization = event.headers.authorization || event.headers.Authorization
  const cookie = event.headers.cookie || event.headers.Cookie
  if (contentType) requestHeaders.set("content-type", contentType)
  if (authorization) requestHeaders.set("authorization", authorization)
  if (cookie) requestHeaders.set("cookie", cookie)
  requestHeaders.set("accept", event.headers.accept || event.headers.Accept || "application/json, text/plain, */*")
  requestHeaders.set("user-agent", "NetlifyApiProxy/1.0")

  let response
  try {
    response = await fetch(targetUrl, {
      method: event.httpMethod,
      headers: requestHeaders,
      body: ["GET", "HEAD"].includes(event.httpMethod)
        ? undefined
        : event.isBase64Encoded
          ? Buffer.from(event.body || "", "base64")
          : event.body,
      redirect: "manual",
    })
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        message: "Netlify function could not reach target API",
        target: targetUrl.href,
        reason: error && error.message ? error.message : String(error),
      }),
    }
  }

  const responseHeaders = {}
  response.headers.forEach((value, key) => {
    if (!["content-encoding", "content-length", "transfer-encoding", "connection"].includes(key.toLowerCase())) {
      responseHeaders[key] = value
    }
  })

  const arrayBuffer = await response.arrayBuffer()
  const body = Buffer.from(arrayBuffer).toString("base64")

  return {
    statusCode: response.status,
    headers: responseHeaders,
    body,
    isBase64Encoded: true,
  }
}
