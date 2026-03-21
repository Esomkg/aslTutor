"""
Quick test for an OpenRouter API key.
Run: python test_openrouter.py
"""
from openai import OpenAI

API_KEY = "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"

client = OpenAI(
    api_key=API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

try:
    response = client.chat.completions.create(
        model="meta-llama/llama-3.3-70b-instruct",
        messages=[{"role": "user", "content": "Say hello in one sentence."}],
        max_tokens=50,
    )
    print("✅ Key works!")
    print("Response:", response.choices[0].message.content)
except Exception as e:
    print("❌ Key failed:", e)
