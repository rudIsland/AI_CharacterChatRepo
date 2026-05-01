from app.modules.ai.ai_reply_result import AiTokenUsage


def build_ai_token_usage(
    usage_body: object,
    input_field_name_list: list[str],
    output_field_name_list: list[str],
    total_field_name_list: list[str],
) -> AiTokenUsage | None:
    # 제공자마다 토큰 필드 이름만 다르므로 읽는 방식은 한 곳에서 처리합니다.
    if not isinstance(usage_body, dict):
        return None

    input_token_count = read_ai_token_count(usage_body, input_field_name_list)
    output_token_count = read_ai_token_count(usage_body, output_field_name_list)
    total_token_count = read_ai_token_count(usage_body, total_field_name_list)
    return create_ai_token_usage(input_token_count=input_token_count, output_token_count=output_token_count, total_token_count=total_token_count)


def create_ai_token_usage(input_token_count: int | None, output_token_count: int | None, total_token_count: int | None) -> AiTokenUsage | None:
    if (
        input_token_count is None
        and output_token_count is None
        and total_token_count is None
    ):
        return None

    return AiTokenUsage(input_token_count=input_token_count, output_token_count=output_token_count, total_token_count=total_token_count)


def read_ai_token_count(response_body: dict[str, object], field_name_list: list[str]) -> int | None:
    for field_name in field_name_list:
        field_value = response_body.get(field_name)
        if isinstance(field_value, int):
            return field_value
    return None
