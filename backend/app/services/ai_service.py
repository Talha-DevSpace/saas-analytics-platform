from google import genai
import json
import os
from dotenv import load_dotenv

load_dotenv()

def generate_insight(analytics_data: dict) -> dict:

    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    prompt = f"""
You are a product analytics expert. Analyze the following SaaS product usage data
and provide actionable insights.

Analytics Data:
- Total Users: {analytics_data.get('total_users', 0)}
- Total Events: {analytics_data.get('total_events', 0)}
- Active Users Today: {analytics_data.get('active_users_today', 0)}
- Top Pages: {json.dumps(analytics_data.get('top_pages', []))}
- Funnel Data: {json.dumps(analytics_data.get('funnel_data', []))}

Based on this data, provide:
1. The most important user behavior insight
2. The most likely reason for user drop-off
3. One specific, actionable suggestion to improve conversion

Respond ONLY with a JSON object in this exact format, no extra text:
{{
    "insight": "your insight here",
    "suggestion": "your suggestion here",
    "confidence": 0.85
}}
"""

    response = client.models.generate_content(
        model="gemini-3-flash-preview", contents=prompt)

# Extract the text response
    response_text = response.text.strip() # type: ignore

# Parse JSON response
# The AI might sometimes add markdown code fences, so we clean those
    response_text = response_text.replace(
        "```json", "").replace("```", "").strip()

    return json.loads(response_text)
