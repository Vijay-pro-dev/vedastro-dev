from typing import Optional

from pydantic import BaseModel


class RuleBase(BaseModel):
    rule_name: str
    rule_type: Optional[str] = None
    insight: Optional[str] = None
    why: Optional[str] = None

    action_energy_low: Optional[int] = None
    action_energy_high: Optional[int] = None
    clarity_energy_low: Optional[int] = None
    clarity_energy_high: Optional[int] = None
    emotional_energy_low: Optional[int] = None
    emotional_energy_high: Optional[int] = None
    opportunity_energy_low: Optional[int] = None
    opportunity_energy_high: Optional[int] = None

    fire_element_low: Optional[int] = None
    fire_element_high: Optional[int] = None
    earth_element_low: Optional[int] = None
    earth_element_high: Optional[int] = None
    air_element_low: Optional[int] = None
    air_element_high: Optional[int] = None
    water_element_low: Optional[int] = None
    water_element_high: Optional[int] = None
    space_element_low: Optional[int] = None
    space_element_high: Optional[int] = None

    section: Optional[int] = None
    next_move: Optional[str] = None
    alternative: Optional[str] = None
    risk: Optional[str] = None
    mistake: Optional[str] = None
    priority: Optional[str] = None
    customer_message: Optional[str] = None


class RuleCreate(RuleBase):
    pass


class RuleOut(RuleBase):
    id: int

    class Config:
        from_attributes = True
