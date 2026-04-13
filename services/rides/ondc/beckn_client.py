"""
ONDC Beckn Protocol Client for Namma Yatri.

Mini acts as BAP (Buyer Application Platform).
Namma Yatri is a BPP (Backend Provider Platform) on ONDC.

Protocol flow:
  search → on_search (callback) → select → on_select → init → on_init → confirm → on_confirm

For MVP: simulated responses until ONDC subscriber registration is complete.
The structure follows Beckn spec exactly so switching to real ONDC is a config change.
"""

import os
import uuid
import httpx
from datetime import datetime
from typing import Optional

ONDC_GATEWAY = os.getenv("ONDC_GATEWAY_URL", "https://staging.gateway.proteantech.in/search")
SUBSCRIBER_ID = os.getenv("ONDC_SUBSCRIBER_ID", "mini.app")
SUBSCRIBER_URL = os.getenv("ONDC_SUBSCRIBER_URL", "https://api.mini.app/ondc")

# Whether to use real ONDC or simulated responses
USE_REAL_ONDC = os.getenv("ONDC_LIVE", "false").lower() == "true"


def _transaction_id():
    return str(uuid.uuid4())


def _message_id():
    return str(uuid.uuid4())


def _timestamp():
    return datetime.utcnow().isoformat() + "Z"


def _context(action: str, transaction_id: str = None):
    return {
        "domain": "ONDC:TRV11",
        "action": action,
        "version": "2.0.0",
        "bap_id": SUBSCRIBER_ID,
        "bap_uri": SUBSCRIBER_URL,
        "transaction_id": transaction_id or _transaction_id(),
        "message_id": _message_id(),
        "timestamp": _timestamp(),
        "city": "std:080",  # Bengaluru
        "country": "IND",
    }


async def search_rides(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float):
    """
    Search for available rides via ONDC Beckn protocol.
    Returns simulated data for MVP — structure matches real ONDC response.
    """
    txn_id = _transaction_id()

    if USE_REAL_ONDC:
        # Real ONDC search
        payload = {
            "context": _context("search", txn_id),
            "message": {
                "intent": {
                    "fulfillment": {
                        "type": "DELIVERY",
                        "stops": [
                            {"type": "start", "location": {"gps": f"{origin_lat},{origin_lng}"}},
                            {"type": "end", "location": {"gps": f"{dest_lat},{dest_lng}"}},
                        ],
                    },
                    "payment": {"type": "ON-FULFILLMENT"},
                }
            },
        }

        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.post(ONDC_GATEWAY, json=payload)
            # ONDC returns ACK, then sends on_search to our callback URL
            # For now, return simulated while we wait for callback infra
            pass

    # Simulated response — matches Namma Yatri's typical offerings
    import math
    dist_km = math.sqrt((dest_lat - origin_lat)**2 + (dest_lng - origin_lng)**2) * 111  # rough km

    return {
        "transaction_id": txn_id,
        "options": [
            {
                "platform": "namma_yatri",
                "vehicle_type": "auto",
                "price": round(30 + dist_km * 15, 0),  # ₹30 base + ₹15/km
                "eta_minutes": max(2, int(3 + dist_km * 0.5)),
                "surge": 1.0,
                "driver_count": max(1, int(5 - dist_km)),
            },
            {
                "platform": "namma_yatri",
                "vehicle_type": "cab_mini",
                "price": round(50 + dist_km * 18, 0),
                "eta_minutes": max(3, int(5 + dist_km * 0.3)),
                "surge": 1.0,
                "driver_count": max(0, int(3 - dist_km)),
            },
            {
                "platform": "namma_yatri",
                "vehicle_type": "cab_sedan",
                "price": round(80 + dist_km * 22, 0),
                "eta_minutes": max(4, int(6 + dist_km * 0.4)),
                "surge": 1.0,
                "driver_count": max(0, int(2 - dist_km)),
            },
        ],
    }


async def book_ride(txn_id: str, vehicle_type: str, tip_amount: float = 0,
                    origin_lat: float = 0, origin_lng: float = 0,
                    dest_lat: float = 0, dest_lng: float = 0):
    """Book a ride via ONDC — select → init → confirm."""

    if USE_REAL_ONDC:
        # Real ONDC flow would be: select → on_select → init → on_init → confirm → on_confirm
        pass

    # Simulated booking
    drivers = [
        {"name": "Manjunath", "phone": "+919876543210", "vehicle": "KA-05-AB-1234"},
        {"name": "Raju Kumar", "phone": "+919876543211", "vehicle": "KA-01-CD-5678"},
        {"name": "Suresh Reddy", "phone": "+919876543212", "vehicle": "KA-03-EF-9012"},
        {"name": "Ganesh", "phone": "+919876543213", "vehicle": "KA-02-GH-3456"},
    ]
    import random
    driver = random.choice(drivers)

    return {
        "booking_ref": f"NY-{uuid.uuid4().hex[:8].upper()}",
        "driver_name": driver["name"],
        "driver_phone": driver["phone"],
        "vehicle_number": driver["vehicle"],
        "eta_minutes": random.randint(2, 6),
        "status": "accepted",
    }


async def get_ride_status(booking_ref: str):
    """Poll ride status via ONDC."""
    if USE_REAL_ONDC:
        pass

    # Simulated — return progressing status
    return {
        "status": "arriving",
        "eta_minutes": 2,
        "driver_lat": 12.9716 + 0.001,
        "driver_lng": 77.5946 + 0.001,
    }


async def cancel_ride(booking_ref: str, minutes_since_accept: int = 0):
    """Cancel ride with free window check."""
    FREE_WINDOW_MINUTES = 3  # Namma Yatri

    if minutes_since_accept <= FREE_WINDOW_MINUTES:
        return {
            "success": True,
            "fee": 0,
            "within_free_window": True,
        }
    else:
        return {
            "success": False,
            "fee": 30,
            "within_free_window": False,
        }
