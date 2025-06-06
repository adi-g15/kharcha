#!/usr/bin/env python3

import os
import json
import requests  # node-fetch equivalent
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Set BAM URL and API key
BAM_CHAT_URL = os.getenv("BAM_CHAT_URL", "https://bam-api.res.ibm.com/v2/text/chat?version=2023-11-22")
BAM_API_KEY = os.getenv("BAM_API_KEY")

# Ask BAM API for response
# 'parameters' is a dictionary, optional
def ask_bam(message, model_id="ibm-meta/llama-2-70b-chat-q", parameters=None):
    if not BAM_API_KEY:
        print("ERROR: No BAM API key provided. Can't use AI to tag the data.", file=sys.stderr)
        return None

    if parameters is None:
        parameters = {}

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {BAM_API_KEY}",
    }

    body = {
        "model_id": model_id,
        "messages": [
            {
                "role": "user",
                "content": message,
            },
        ],
        "parameters": {
            "decoding_method": parameters.get("decoding_method", "greedy"),
            "max_new_tokens": parameters.get("max_new_tokens", 1024),
            "min_new_tokens": parameters.get("min_new_tokens", 1),
            "temperature": parameters.get("temperature", 0.7),
        },
    }

    try:
        res = requests.post(BAM_CHAT_URL, headers=headers, data=json.dumps(body))

        if res.status_code != 200:
            print(f"Error: Failed to send request to BAM: {res.text}", file=sys.stderr)
            return None

        res_data = res.json()
        response_text = ""

        for result in res_data.get("results", []):
            response_text += result.get("generated_text", "")

        return response_text
    except Exception as err:
        print(f"Error: {err}", file=sys.stderr)
        return None

