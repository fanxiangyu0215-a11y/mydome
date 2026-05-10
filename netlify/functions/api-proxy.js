const http = require("http")
const https = require("https")

const hopByHopHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "x-imt-api-origin",
])

const requestTarget = (url, options, body) =>
  new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http
    const request = client.request(url, options, response => {
      const chunks = []
      response.on("data", chunk => chunks.push(chunk))
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode || 502,
          headers: response.headers,
          body: Buffer.concat(chunks),
        })
      })
    })

    request.setTimeout(25000, () => {
      request.destroy(new Error("Target request timed out"))
    })
    request.on("error", reject)
    if (body) request.write(body)
    request.end()
  })

exports.handler = async event => {
  const targetOrigin = event.headers["x-imt-api-origin"] || event.headers["X-Imt-Api-Origin"]
  const path = event.queryStringParameters && event.queryStringParameters.path

  if (!targetOrigin || !/^https?:\/\/[^?#]+$/i.test(targetOrigin)) {
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

  const targetBaseUrl = targetOrigin.endsWith("/") ? targetOrigin : `${targetOrigin}/`
  const targetPath = path.startsWith("/") ? path.slice(1) : path
  const targetUrl = new URL(targetPath, targetBaseUrl)
  const requestHeaders = {}
  for (const [key, value] of Object.entries(event.headers || {})) {
    const lowerKey = key.toLowerCase()
    if (!hopByHopHeaders.has(lowerKey) && value) requestHeaders[key] = value
  }
  requestHeaders.host = targetUrl.host
  requestHeaders["user-agent"] = "NetlifyApiProxy/1.0"

  const requestBody = ["GET", "HEAD"].includes(event.httpMethod)
    ? null
    : event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "")

  let response
  try {
    response = await requestTarget(
      targetUrl,
      {
        method: event.httpMethod,
        headers: requestHeaders,
      },
      requestBody
    )
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
  for (const [key, value] of Object.entries(response.headers || {})) {
    if (!hopByHopHeaders.has(key.toLowerCase()) && value) responseHeaders[key] = Array.isArray(value) ? value.join(", ") : value
  }

  return {
    statusCode: response.statusCode,
    headers: responseHeaders,
    body: response.body.toString("base64"),
    isBase64Encoded: true,
  }
}
