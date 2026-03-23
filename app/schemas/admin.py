from pydantic import BaseModel


class SuspendUserPayload(BaseModel):
    suspended: bool


class UpdateUserRolePayload(BaseModel):
    role: str
