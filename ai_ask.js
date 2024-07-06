import fetch from "node-fetch";
import "dotenv/config"

const BAM_CHAT_URL = process.env.BAM_CHAT_URL || "https://bam-api.res.ibm.com/v2/text/chat?version=2023-11-22";
const BAM_API_KEY = process.env.BAM_API_KEY;

export async function askBam(message, modelId = "ibm-meta/llama-2-70b-chat-q", parameters = {}) {
	if (!BAM_API_KEY) {
		console.error("ERROR: No BAM API key provided. Can't use AI to tag the data.");
		return null;
	}

	const headers = {
		"Content-Type": "application/json",
		"Authorization": `Bearer ${BAM_API_KEY}`,
	};

	const body = {
		"model_id": modelId,
		"messages": [
			{
				"role": "user",
				"content": message,
			},
		],
		"parameters": {
			"decoding_method": parameters["decoding_method"] || "greedy",
			"max_new_tokens": parameters["max_new_tokens"] || 1024,
			"min_new_tokens": parameters["min_new_tokens"] || 1,
			"temperature": parameters["temperature"] || 0.7,
		},
	};

	try {
		const res = await fetch(BAM_CHAT_URL, {
			method: "POST",
			headers,
			body: JSON.stringify(body)
		});
		if (res.status !== 200) {
			console.error(`Error: Failed to send request to Bam: ${await res.text()}`);
			return null;
		}

		const resData = await res.json();
		let responseText = "";

		for (const result of resData["results"]) {
			responseText += result["generated_text"];
		}

		return responseText;
	} catch (err) {
		console.error(`Error: ${err.message}`);
		return null;
	}
}
