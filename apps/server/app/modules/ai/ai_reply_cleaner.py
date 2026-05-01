import re


class AiReplyCleaner:
    def clean_reply_text(self, reply_text: str) -> str | None:
        # AI가 내부 추론이나 빈 답변을 내보내면 사용자에게 보여주지 않습니다.
        cleaned_text = reply_text.strip()
        if not cleaned_text:
            return None

        cleaned_text = re.sub(
            pattern=r"<think>.*?</think>",
            repl="",
            string=cleaned_text,
            flags=re.IGNORECASE | re.DOTALL,
        ).strip()
        if not cleaned_text:
            return None

        line_list = [
            line.strip()
            for line in cleaned_text.replace("\r\n", "\n").split("\n")
            if line.strip()
        ]
        visible_line_list = [
            line_text
            for line_text in line_list
            if not self._has_reasoning_marker(line_text)
        ]
        cleaned_text = "\n".join(visible_line_list).strip()
        if not cleaned_text:
            return None

        if self._has_reasoning_marker(cleaned_text):
            return None

        return cleaned_text

    def is_same_as_user_message(self, reply_text: str, last_user_message: str) -> bool:
        if not last_user_message:
            return False

        normalized_reply = self._normalize_for_compare(reply_text)
        normalized_user_message = self._normalize_for_compare(last_user_message)
        if not normalized_reply or not normalized_user_message:
            return False

        return normalized_reply == normalized_user_message

    def _normalize_for_compare(self, text_value: str) -> str:
        return re.sub(r"[^0-9a-z\uAC00-\uD7A3]+", "", text_value.casefold())

    def _has_reasoning_marker(self, text_value: str) -> bool:
        lower_text_value = text_value.lower()
        reasoning_marker_list = [
            "/no_think",
            "<think>",
            "wait, the assistant",
            "the assistant's last message",
            "previous assistant",
            "since i'm supposed",
            "since i am supposed",
            "as an assistant",
            "okay, the user",
            "the user said",
            "the user asked",
            "the user greeted",
            "the user is asking",
            "the user wants",
            "which translates to",
            "let me think",
            "i need to",
            "i should",
            "i will respond",
            "i'll respond",
            "my role is",
            "first, i'll",
            "first i will",
            "i'll answer",
            "internal reasoning",
            "analysis:",
            "answer should",
            "local ai 응답에 실패",
            "local_ai_model_name",
            "사용자가",
            "번역하면",
        ]
        return any(marker in lower_text_value for marker in reasoning_marker_list)
