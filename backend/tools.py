import asyncio
import httpx

HEADERS = {
    "User-Agent": "NicheMiner/1.0 (research bot)"
}

_last_request_time = 0.0


async def _rate_limited_get(url: str) -> dict | list | None:
    """GET with 2s rate limiting to avoid Reddit 429s."""
    global _last_request_time
    now = asyncio.get_event_loop().time()
    wait = max(0, 0.5 - (now - _last_request_time))
    if wait > 0:
        await asyncio.sleep(wait)
    _last_request_time = asyncio.get_event_loop().time()

    async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
        resp = await client.get(url)
        if resp.status_code == 429:
            return {"error": "Rate limited by Reddit. Try again shortly."}
        resp.raise_for_status()
        return resp.json()


async def find_subreddits(query: str) -> dict:
    """Search for relevant subreddits. Filters out NSFW."""
    url = f"https://www.reddit.com/subreddits/search.json?q={query}&limit=15"
    data = await _rate_limited_get(url)
    if isinstance(data, dict) and "error" in data:
        return data

    results = []
    for child in data.get("data", {}).get("children", []):
        sub = child.get("data", {})
        if sub.get("over18", False):
            continue
        results.append({
            "name": sub.get("display_name", ""),
            "title": sub.get("title", ""),
            "subscribers": sub.get("subscribers", 0),
            "description": (sub.get("public_description", "") or "")[:200]
        })
    return {"subreddits": results}


async def scrape_posts(subreddit: str, search_query: str | None = None,
                       sort: str = "hot", limit: int = 10) -> dict:
    """Scrape posts from a subreddit. Skips NSFW posts."""
    limit = min(limit, 25)
    if search_query:
        url = f"https://www.reddit.com/r/{subreddit}/search.json?q={search_query}&restrict_sr=on&sort={sort}&limit={limit}"
    else:
        url = f"https://www.reddit.com/r/{subreddit}/{sort}.json?limit={limit}"

    data = await _rate_limited_get(url)
    if isinstance(data, dict) and "error" in data:
        return data

    posts = []
    for child in data.get("data", {}).get("children", []):
        p = child.get("data", {})
        if p.get("over_18", False):
            continue
        posts.append({
            "title": p.get("title", ""),
            "score": p.get("score", 0),
            "num_comments": p.get("num_comments", 0),
            "selftext": (p.get("selftext", "") or "")[:500],
            "permalink": p.get("permalink", ""),
            "url": p.get("url", ""),
        })
    return {"subreddit": subreddit, "posts": posts, "count": len(posts)}


async def scrape_comments(post_url: str, limit: int = 15) -> dict:
    """Scrape comments from a post."""
    limit = min(limit, 30)
    if post_url.startswith("/"):
        post_url = f"https://www.reddit.com{post_url}"
    if not post_url.endswith("/"):
        post_url += "/"
    url = f"{post_url}.json?limit={limit}&sort=top"

    data = await _rate_limited_get(url)
    if isinstance(data, dict) and "error" in data:
        return data

    comments = []
    if isinstance(data, list) and len(data) > 1:
        for child in data[1].get("data", {}).get("children", []):
            c = child.get("data", {})
            if c.get("body"):
                comments.append({
                    "body": c["body"][:500],
                    "score": c.get("score", 0),
                })
    return {"comments": comments[:limit], "count": len(comments)}


# Tool dispatch map
TOOL_HANDLERS = {
    "find_subreddits": lambda args: find_subreddits(args["query"]),
    "scrape_posts": lambda args: scrape_posts(
        args["subreddit"],
        args.get("search_query"),
        args.get("sort", "hot"),
        args.get("limit", 10)
    ),
    "scrape_comments": lambda args: scrape_comments(
        args["post_url"],
        args.get("limit", 15)
    ),
}
