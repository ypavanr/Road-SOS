from pydantic import BaseModel, Field
from typing import List, Literal

class ClassifyRequest(BaseModel):
    text: str

class ClassifyResponse(BaseModel):
    is_emergency: bool = Field(description="Whether the prompt describes an emergency situation.")
    broad_categories: List[Literal["medical", "police", "roadside"]] = Field(
        description="The broad categories of the emergency."
    )
    specific_facilities: List[Literal[
        "hospital", "trauma_center", "clinic", "ambulance", "police", "fire_station",
        "towing", "roadside_assistance", "tyre_shop", "car_repair", "fuel_station", "showroom"
    ]] = Field(description="The specific facilities required to handle the emergency.")
    explanation: str = Field(description="Reasoning behind the classification.")
    confidence_score: float = Field(description="Confidence score between 0.0 and 1.0.")
    engine_used: str = Field(description="The engine used to classify (e.g. 'llm' or 'rules').")
    user_role: str = Field(default="unknown", description="Role of the user: 'victim', 'bystander', or 'unknown'.")
    patient_gender: str = Field(default="unknown", description="Gender of the patient: 'male', 'female', or 'unknown'.")
    patient_demographic: str = Field(default="adult", description="Demographic of the patient: 'pregnant', 'child', 'elderly', or 'adult'.")
    injury_type: str = Field(default="general", description="Specific injury type if mentioned: 'eye', 'head', 'burn', 'cardiac', or 'general'.")
