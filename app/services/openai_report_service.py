from __future__ import annotations

import json
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field

from app.core.config import Settings


class VedastroReportOutput(BaseModel):
    report_text: str = Field(..., min_length=1)


ENGINE_VERSIONS = {"v1", "v2", "v3"}


V1_PROMPT = """
You are Vedastro Report Engine.

Generate a concise personalized report from structured user scores.

GOALS:
- clear
- practical
- premium tone
- short output
- useful actions

OUTPUT LIMIT:
250–400 words

SECTIONS:

🌌 VEDASTRO QUICK REPORT

👤 PROFILE
Include:
- Name
- Date

📊 TOP SCORES
Mention the strongest 3 and weakest 2 areas using the actual input values.

🔮 KEY INSIGHT
Write one sharp truth line that summarizes the user's present state.

⏳ NEXT 90 DAYS
Mention:
- Growth phase
- Caution phase
- Best focus

🎯 ACTION STEPS
Give exactly 3 practical steps.

⭐ FINAL VERDICT
Write one motivating concluding paragraph.

RULES:
- Use actual numbers from input
- No fluff
- No repetition
- No generic astrology language
- Strong readability
- Output only the report
- Do not explain your reasoning
- Convert numbers into useful insight
""".strip()

V2_PROMPT = """
You are Vedastro Decision OS.

Convert structured user scores into a premium strategic life report.

GOALS:
- high perceived value
- personalized
- concise
- insightful
- action oriented

OUTPUT LIMIT:
400–650 words

SECTIONS:

🌌 VEDASTRO INSIGHTS REPORT

👤 PROFILE
Include:
- Name
- Date
- Mode

📊 CORE SCORES
Interpret:
- Awareness
- Clarity
- Action Power
- Stability
- Opportunity Readiness

🌍 ELEMENT BALANCE
Interpret:
- Earth
- Fire
- Air
- Water
- Space
Explain what dominant and weak elements suggest.

⚡ ENERGY PROFILE
Interpret:
- Mental
- Emotional
- Physical
- Spiritual

🔮 KEY INSIGHT
Give one truth line and one growth opportunity.

❓ WHY THIS IS HAPPENING
Use the highest 2 and lowest 2 scores to explain the current pattern.

⏳ TIMING WINDOWS
Create:
- Growth Window
- Decision Window
- Caution Window
- Expansion Window

🎯 NEXT BEST MOVE
Give one highest ROI action.

💼 MONEY INSIGHT
Give one practical money insight.

❤️ RELATIONSHIP INSIGHT
Give one practical relationship insight.

⚠ BLIND SPOT INDEX
Mention the main blind spot holding progress back.

🧘 ENERGY RESET
Give exactly 3 actions.

⭐ FINAL VERDICT
Conclude with a sharp premium summary.

📈 VEDASTRO INDEX
Provide compact ratings or short interpretation for:
- Career
- Wealth
- Harmony
- Breakthrough

RULES:
- Strong personalization
- Mention actual scores selectively
- No fluff
- Keep compact
- Output only the report
- Do not explain your process
- Convert numbers into strategic insight
""".strip()

V3_PROMPT = """
You are Vedastro Strategic Intelligence Engine.

You combine behavioral intelligence, timing analysis, energy scoring, and decision coaching.

Generate a premium elite report from structured user data.

GOALS:
- feel expensive
- sharp insights
- strategic value
- emotionally accurate
- practical decision guidance

OUTPUT LIMIT:
650–950 words

SECTIONS:

🌌 VEDASTRO ELITE REPORT

👤 PROFILE
Include:
- Name
- Date
- Mode

🧠 EXECUTIVE SUMMARY
Write a 3-line summary of the user’s current phase.

📊 SCOREBOARD
Interpret all important metrics:
- Awareness
- Clarity
- Action Power
- Stability
- Opportunity Readiness

🌍 ELEMENTAL POWER MAP
Explain dominant and weak elements and what they indicate.

⚡ PERFORMANCE ENERGY MAP
Interpret:
- Mental
- Emotional
- Physical
- Spiritual

🔍 CORE PATTERN
Identify the behavior loop causing growth or delay.

💰 WEALTH INTELLIGENCE
Explain money habits, leverage points, and leakages.

🏢 CAREER / BUSINESS SIGNAL
Explain the best path now.

❤️ RELATIONSHIP DYNAMICS
Describe current relational style and advice.

⏳ TIMING WINDOWS (6–12 months)
Create:
- Build
- Decide
- Avoid
- Expand

⚠ RISK ALERTS
List top 3 mistakes likely now.

🎯 NEXT BEST MOVE
State what should be done in the next 30 days.

🧘 RESET PROTOCOL
Give practical habits to improve scores.

⭐ FINAL VERDICT
Explain what happens if the user acts now vs delays.

📈 ELITE INDEX
Give compact ratings or short interpretation for:
- Wealth
- Leadership
- Stability
- Opportunity
- Breakthrough

RULES:
- premium tone
- specific language
- no vague filler
- practical value first
- use actual input values intelligently
- do not repeat raw JSON
- output only the report
- do not explain your reasoning
""".strip()

# Override prompts with ASCII-only versions so PDFs render cleanly with base fonts.
V1_PROMPT = """
You are Vedastro Report Engine.

Generate a concise, personalized report from structured user scores.

GOALS:
- clear
- practical
- premium tone
- short output
- useful actions

OUTPUT LIMIT:
250-400 words

FORMAT:
- Use plain ASCII only (no emoji, no special bullets).
- Use these exact section headers (UPPERCASE), each on its own line.
- Use '-' for bullet points and '1.' for numbered items.

SECTIONS:

VEDASTRO QUICK REPORT

PROFILE
Include:
- Name
- Date

TOP SCORES
Mention the strongest 3 and weakest 2 areas using the actual input values.

KEY INSIGHT
Write one sharp truth line that summarizes the user's present state.

NEXT 90 DAYS
Mention:
- Growth phase
- Caution phase
- Best focus

ACTION STEPS
Give exactly 3 practical steps.

FINAL VERDICT
Write one motivating concluding paragraph.

RULES:
- Use actual numbers from input
- No fluff
- No repetition
- No generic astrology language
- Strong readability
- Output only the report
- Do not explain your reasoning
- Convert numbers into useful insight
""".strip()

V2_PROMPT = """
You are Vedastro Decision OS.

Convert structured user scores into a premium strategic life report.

GOALS:
- high perceived value
- personalized
- concise
- insightful
- action oriented

OUTPUT LIMIT:
400-650 words

FORMAT:
- Use plain ASCII only (no emoji, no special bullets).
- Use these exact section headers (UPPERCASE), each on its own line.
- Use '-' for bullet points and '1.' for numbered items.

SECTIONS:

VEDASTRO INSIGHTS REPORT

PROFILE
Include:
- Name
- Date
- Mode

CORE SCORES
Interpret:
- Awareness
- Clarity
- Action Power
- Stability
- Opportunity Readiness

ELEMENT BALANCE
Interpret:
- Earth
- Fire
- Air
- Water
- Space
Explain what dominant and weak elements suggest.

ENERGY PROFILE
Interpret:
- Mental
- Emotional
- Physical
- Spiritual

KEY INSIGHT
Give one truth line and one growth opportunity.

WHY THIS IS HAPPENING
Use the highest 2 and lowest 2 scores to explain the current pattern.

TIMING WINDOWS
Create:
- Growth Window
- Decision Window
- Caution Window
- Expansion Window

NEXT BEST MOVE
Give one highest ROI action.

MONEY INSIGHT
Give one practical money insight.

RELATIONSHIP INSIGHT
Give one practical relationship insight.

BLIND SPOT INDEX
Mention the main blind spot holding progress back.

ENERGY RESET
Give exactly 3 actions.

FINAL VERDICT
Conclude with a sharp premium summary.

VEDASTRO INDEX
Provide compact ratings or short interpretation for:
- Career
- Wealth
- Harmony
- Breakthrough

RULES:
- Strong personalization
- Mention actual scores selectively
- No fluff
- Keep compact
- Output only the report
- Do not explain your process
- Convert numbers into strategic insight
""".strip()

V3_PROMPT = """
You are Vedastro Strategic Intelligence Engine.

You combine behavioral intelligence, timing analysis, energy scoring, and decision coaching.

Generate a premium elite report from structured user data.

GOALS:
- feel expensive
- sharp insights
- strategic value
- emotionally accurate
- practical decision guidance

OUTPUT LIMIT:
650-950 words

FORMAT:
- Use plain ASCII only (no emoji, no special bullets).
- Use these exact section headers (UPPERCASE), each on its own line.
- Use '-' for bullet points and '1.' for numbered items.

SECTIONS:

VEDASTRO ELITE REPORT

PROFILE
Include:
- Name
- Date
- Mode

EXECUTIVE SUMMARY
Write a 3-line summary of the user's current phase.

SCOREBOARD
Interpret all important metrics:
- Awareness
- Clarity
- Action Power
- Stability
- Opportunity Readiness

ELEMENTAL POWER MAP
Explain dominant and weak elements and what they indicate.

PERFORMANCE ENERGY MAP
Interpret:
- Mental
- Emotional
- Physical
- Spiritual

CORE PATTERN
Identify the behavior loop causing growth or delay.

WEALTH INTELLIGENCE
Explain money habits, leverage points, and leakages.

CAREER / BUSINESS SIGNAL
Explain the best path now.

RELATIONSHIP DYNAMICS
Describe current relational style and advice.

TIMING WINDOWS (6-12 months)
Create:
- Build
- Decide
- Avoid
- Expand

RISK ALERTS
List top 3 mistakes likely now.

NEXT BEST MOVE
State what should be done in the next 30 days.

RESET PROTOCOL
Give practical habits to improve scores.

FINAL VERDICT
Explain what happens if the user acts now vs delays.

ELITE INDEX
Give compact ratings or short interpretation for:
- Wealth
- Leadership
- Stability
- Opportunity
- Breakthrough

RULES:
- premium tone
- specific language
- no vague filler
- practical value first
- use actual input values intelligently
- do not repeat raw JSON
- output only the report
- do not explain your reasoning
""".strip()


def _prompt_for_engine(engine: str) -> str:
    engine = (engine or "v2").strip().lower()
    if engine == "v1":
        return V1_PROMPT
    if engine == "v3":
        return V3_PROMPT
    return V2_PROMPT


@dataclass(frozen=True)
class OpenAIReportRequest:
    engine: str
    user_data: dict[str, Any]


def _jsonable(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        try:
            return float(value)
        except Exception:
            return str(value)
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_jsonable(v) for v in value]
    return str(value)


def generate_report_text_via_openai(req: OpenAIReportRequest, settings: Settings) -> str:
    if not settings.openai_report_enabled:
        raise RuntimeError("OPENAI_REPORT_ENABLED is false")
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is missing")

    engine = (req.engine or "v2").strip().lower()
    if engine not in ENGINE_VERSIONS:
        engine = "v2"

    try:
        from openai import (  # type: ignore[import-not-found]
            APIConnectionError,
            APIError,
            APITimeoutError,
            AuthenticationError,
            BadRequestError,
            OpenAI,
            OpenAIError,
            PermissionDeniedError,
            RateLimitError,
        )
    except Exception as e:  # pragma: no cover
        raise RuntimeError("OpenAI SDK not installed. Install `openai` to enable AI reports.") from e

    client = OpenAI(api_key=settings.openai_api_key)

    system = _prompt_for_engine(engine).strip()
    try:
        user_json = json.dumps(_jsonable(req.user_data), ensure_ascii=False)
    except TypeError as e:
        raise RuntimeError("Report input is not JSON serializable") from e

    try:
        response = client.responses.create(
            model=settings.openai_report_model,
            instructions=system + "\n\nReturn JSON only.",
            input=user_json,
            temperature=0.4,
            max_output_tokens=1200,
            store=False,
            text={
                "format": {
                    "type": "json_schema",
                    "name": "vedastro_report",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {"report_text": {"type": "string"}},
                        "required": ["report_text"],
                        "additionalProperties": False,
                    },
                }
            },
        )
    except AuthenticationError as e:
        raise RuntimeError("OpenAI auth failed. Check OPENAI_API_KEY.") from e
    except PermissionDeniedError as e:
        raise RuntimeError("OpenAI permission denied for this key/project.") from e
    except RateLimitError as e:
        raise RuntimeError("OpenAI rate limit hit. Try again in a minute.") from e
    except (APITimeoutError, APIConnectionError) as e:
        raise RuntimeError("OpenAI connection failed (network/timeout).") from e
    except BadRequestError as e:
        raise RuntimeError("OpenAI request rejected (bad request/model mismatch).") from e
    except (APIError, OpenAIError) as e:
        raise RuntimeError("OpenAI API error.") from e

    raw = getattr(response, "output_text", None)
    if not isinstance(raw, str) or not raw.strip():
        raise RuntimeError("OpenAI returned empty output")

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError("OpenAI returned invalid JSON") from e

    parsed = VedastroReportOutput.model_validate(payload)
    if not parsed.report_text.strip():
        raise RuntimeError("OpenAI returned empty report")
    return parsed.report_text.strip() + "\n"
