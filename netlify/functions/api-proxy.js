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
  if (event.rawQuery) {
    const passthroughQuery = event.rawQuery
      .split("&")
      .filter(part => part && !part.startsWith("path="))
      .join("&")
    if (passthroughQuery) targetUrl.search = passthroughQuery
  }

  const requestHeaders = new Headers()
  for (const [key, value] of Object.entries(event.headers || {})) {
    const lowerKey = key.toLowerCase()
    if (
      lowerKey === "host" ||
      lowerKey === "connection" ||
      lowerKey === "content-length" ||
      lowerKey === "x-imt-api-origin"
    ) {
      continue
    }
    requestHeaders.set(key, value)
  }

  const response = await fetch(targetUrl, {
    method: event.httpMethod,
    headers: requestHeaders,
    body: ["GET", "HEAD"].includes(event.httpMethod) ? undefined : event.body,
  })

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
