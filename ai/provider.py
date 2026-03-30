import os
from openai import OpenAI
from .config import BASE_URL, DEEPSEEK_API_KEY

def get_client():
    if not DEEPSEEK_API_KEY:
        raise ValueError("Missing DEEPSEEK_API_KEY in environment variables (.env)")
    return OpenAI(api_key=DEEPSEEK_API_KEY, base_url=BASE_URL)
