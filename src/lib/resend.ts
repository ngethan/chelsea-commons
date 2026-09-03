import { request } from "node:https";

/**
 * Hand-rolled instead of the `resend` SDK: the whole surface we need is two
 * POSTs, and this keeps the dependency list where it is.
 */
export function resendRequest<T = Record<string, unknown>>(
	apiKey: string,
	path: string,
	body: unknown,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const payload = JSON.stringify(body);
		const req = request(
			{
				hostname: "api.resend.com",
				path,
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(payload),
				},
			},
			(res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});
				res.on("end", () => {
					try {
						const parsed = JSON.parse(data);
						if (res.statusCode && res.statusCode >= 400) {
							reject(
								new Error(
									`Resend ${res.statusCode}: ${parsed.message || data}`,
								),
							);
						} else {
							resolve(parsed as T);
						}
					} catch {
						reject(
							new Error(`Resend: invalid response - ${data.substring(0, 200)}`),
						);
					}
				});
			},
		);
		req.on("error", reject);
		req.write(payload);
		req.end();
	});
}

export function resendApiKey() {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error("RESEND_API_KEY is not set");
	}
	return apiKey;
}
