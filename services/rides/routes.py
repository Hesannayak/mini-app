"""
Ride service REST API routes.
"""

import uuid
from fastapi import APIRouter
from models import ScanRequest, ScanResponse, BookRequest, BookResponse, TrackResponse, CancelResponse, RideOption
from ondc.beckn_client import search_rides, book_ride, get_ride_status, cancel_ride
from tip_engine import recommend_tip, get_demand_level, get_tip_explanation

router = APIRouter()

# In-memory ride store (production: PostgreSQL)
_rides: dict = {}


@router.post("/scan", response_model=ScanResponse)
async def scan_rides(req: ScanRequest):
    """Scan available rides from all platforms (Namma Yatri via ONDC)."""
    result = await search_rides(req.origin_lat, req.origin_lng, req.destination_lat, req.destination_lng)

    demand = get_demand_level()
    tip = recommend_tip(demand)

    options = []
    for opt in result["options"]:
        if opt["driver_count"] > 0:
            options.append(RideOption(
                platform=opt["platform"],
                vehicle_type=opt["vehicle_type"],
                price=opt["price"],
                eta_minutes=opt["eta_minutes"],
                surge=opt["surge"],
                tip_recommended=tip if opt["platform"] == "namma_yatri" else 0,
                driver_count=opt["driver_count"],
            ))

    if not options:
        return ScanResponse(success=False, options=[], message="Abhi koi driver nahi hai nearby. 2 min mein dobara try karoon?")

    return ScanResponse(success=True, options=options)


@router.post("/book", response_model=BookResponse)
async def book_a_ride(req: BookRequest):
    """Book a specific ride."""
    result = await book_ride(
        txn_id=str(uuid.uuid4()),
        vehicle_type=req.vehicle_type,
        tip_amount=req.tip_amount,
        origin_lat=req.origin_lat,
        origin_lng=req.origin_lng,
        dest_lat=req.destination_lat,
        dest_lng=req.destination_lng,
    )

    ride_id = str(uuid.uuid4())
    _rides[ride_id] = {
        **result,
        "ride_id": ride_id,
        "vehicle_type": req.vehicle_type,
        "tip_amount": req.tip_amount,
        "destination_label": req.destination_label,
    }

    return BookResponse(
        success=True,
        ride_id=ride_id,
        booking_ref=result["booking_ref"],
        driver_name=result["driver_name"],
        driver_phone=result["driver_phone"],
        vehicle_number=result["vehicle_number"],
        eta_minutes=result["eta_minutes"],
        fare_estimate=0,
        status=result["status"],
        message=f"Book ho gaya — {result['driver_name']}, {result['vehicle_number']}, {result['eta_minutes']} min mein aa raha hai.",
    )


@router.get("/track/{ride_id}", response_model=TrackResponse)
async def track_ride(ride_id: str):
    """Get real-time ride tracking info."""
    ride = _rides.get(ride_id)
    if not ride:
        return TrackResponse(ride_id=ride_id, status="not_found")

    status = await get_ride_status(ride.get("booking_ref", ""))

    return TrackResponse(
        ride_id=ride_id,
        status=status["status"],
        driver_lat=status.get("driver_lat"),
        driver_lng=status.get("driver_lng"),
        eta_minutes=status.get("eta_minutes"),
        driver_name=ride.get("driver_name"),
        vehicle_number=ride.get("vehicle_number"),
    )


@router.post("/cancel/{ride_id}", response_model=CancelResponse)
async def cancel_a_ride(ride_id: str):
    """Cancel a ride with free window check."""
    ride = _rides.get(ride_id)
    if not ride:
        return CancelResponse(success=False, message="Ride not found")

    result = await cancel_ride(ride.get("booking_ref", ""), minutes_since_accept=1)

    if result["within_free_window"]:
        _rides.pop(ride_id, None)
        return CancelResponse(
            success=True,
            cancellation_fee=0,
            within_free_window=True,
            message="Ride cancel ho gayi — koi charge nahi laga.",
        )
    else:
        return CancelResponse(
            success=False,
            cancellation_fee=result["fee"],
            within_free_window=False,
            message=f"Cancel karne pe ₹{result['fee']} lagega. Phir bhi cancel karoon?",
        )


@router.get("/history")
async def ride_history():
    """Get user's ride history."""
    return {
        "success": True,
        "data": list(_rides.values()),
    }
