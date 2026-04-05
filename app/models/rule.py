from sqlalchemy import Column, Integer, String, Text

from app.core.database import Base


class MasterRule(Base):
    __tablename__ = "master_rule"

    id = Column(Integer, primary_key=True, index=True)
    rule_name = Column(Text)
    rule_type = Column(Text)
    insight = Column(Text)
    why = Column(Text)

    action_energy_low = Column(Integer)
    action_energy_high = Column(Integer)
    clarity_energy_low = Column(Integer)
    clarity_energy_high = Column(Integer)
    emotional_energy_low = Column(Integer)
    emotional_energy_high = Column(Integer)
    opportunity_energy_low = Column(Integer)
    opportunity_energy_high = Column(Integer)

    fire_element_low = Column(Integer)
    fire_element_high = Column(Integer)
    earth_element_low = Column(Integer)
    earth_element_high = Column(Integer)
    air_element_low = Column(Integer)
    air_element_high = Column(Integer)
    water_element_low = Column(Integer)
    water_element_high = Column(Integer)
    space_element_low = Column(Integer)
    space_element_high = Column(Integer)

    section = Column(Integer)
    next_move = Column(Text)
    alternative = Column(Text)
    risk = Column(Text)
    mistake = Column(Text)
    priority = Column(Text)
    customer_message = Column(Text)
