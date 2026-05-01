import logging

import httpx

logger = logging.getLogger(__name__)


async def post_json_or_none(
    request_name: str,
    request_url: str,
    request_payload: dict[str, object],
    request_headers: dict[str, str] | None = None,
) -> dict[str, object] | None:
    # AI 제공자 호출은 실패해도 채팅 흐름을 끊지 않고 fallback으로 넘깁니다.
    try:
        async with httpx.AsyncClient(timeout=30) as http_client:
            response = await http_client.post(request_url, headers=request_headers, json=request_payload)
            response.raise_for_status()
            response_body = response.json()
    except Exception as error:
        logger.warning("%s request failed: %s", request_name, error)
        return None

    if not isinstance(response_body, dict):
        logger.warning("%s response is not a JSON object.", request_name)
        return None

    return response_body
