import urllib.request
import urllib.error
import sys

try:
    url = "http://localhost:8080/api/refresh?symbol=601899&period=15"
    print(f"Fetching {url}")
    req = urllib.request.urlopen(url)
    print(req.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode('utf-8'))
except urllib.error.URLError as e:
    print(f"URL Error: {e.reason}")
