from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RideOption(BaseModel):
    platform: str = "namma_yatri"
    vehicle_type: str  # auto, cab_mini, cab_sedan
    price: float
    eta_minutes: int
    surge: float = 1.0
    tip_recommended: int = 0
    driver_count: int = 0  # nearby drivers


class ScanRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    destination_label: Optional[str] = None


class ScanResponse(BaseModel):
    success: bool
    options: List[RideOption]
    message: Optional[str] = None


class BookRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    destination_label: Optional[str] = None
    vehicle_type: str
    tip_amount: float = 0


class BookResponse(BaseModel):
    success: bool
    ride_id: str
    booking_ref: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_number: Optional[str] = None
    eta_minutes: int = 0
    fare_estimate: float = 0
    status: str = "searching"
    message: Optional[str] = None


class TrackResponse(BaseModel):
    ride_id: str
    status: str  # searching, accepted, arriving, in_progress, completed, cancelled
    driver_lat: Optional[float] = None
    driver_lng: Optional[float] = None
    eta_minutes: Optional[int] = None
    driver_name: Optional[str] = None
    vehicle_number: Optional[str] = None
    fare_actual: Optional[float] = None


class CancelResponse(BaseModel):
    success: bool
    cancellation_fee: float = 0
    within_free_window: bool = True
    message: str
