#!/usr/bin/env python3
"""
AgentCore Memory Browser - FastAPI Backend

A web application for browsing Amazon Bedrock AgentCore Memory resources.

Author: Danilo Poccia
Repository: https://github.com/danilop/agentcore-memory-browser
"""

import boto3
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Union

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Generate unique cache-busting UUID on app startup
CACHE_BUST_UUID = str(uuid.uuid4())
logger.info(f"Generated cache-busting UUID: {CACHE_BUST_UUID}")

# Initialize FastAPI app
app = FastAPI(
    title="AgentCore Memory Browser",
    description="Browse Amazon Bedrock AgentCore Memory resources",
    version="1.0.0"
)

# Configure CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup directories for static files and templates
static_dir = Path("static")
templates_dir = Path("templates")
static_dir.mkdir(exist_ok=True)
templates_dir.mkdir(exist_ok=True)

# Mount static files and templates
app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)

# AWS Bedrock clients
bedrock_control = boto3.client('bedrock-agentcore-control')
bedrock_data = boto3.client('bedrock-agentcore')


# --- Pydantic Models ---

class MemorySummary(BaseModel):
    """Summary information for a memory"""
    id: str
    arn: str
    status: str
    name: Optional[str] = None
    description: Optional[str] = None
    createdAt: Union[int, str, datetime]
    updatedAt: Union[int, str, datetime]


class Strategy(BaseModel):
    """Memory strategy configuration"""
    strategyId: str
    name: str
    type: str
    status: str
    namespaces: List[str]
    description: Optional[str] = None
    createdAt: Union[int, str, datetime]
    updatedAt: Union[int, str, datetime]


class Memory(BaseModel):
    """Complete memory details"""
    id: str
    arn: str
    name: str
    status: str
    strategies: List[Strategy]
    description: Optional[str] = None
    createdAt: Union[int, str, datetime]
    updatedAt: Union[int, str, datetime]
    encryptionKeyArn: Optional[str] = None
    memoryExecutionRoleArn: Optional[str] = None


class EventSummary(BaseModel):
    """Event information"""
    eventId: str
    sessionId: str
    actorId: str
    createdAt: Union[int, str, datetime]
    eventType: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class MemoryRecordSummary(BaseModel):
    """Memory record information"""
    recordId: str = Field(alias='memoryRecordId')
    memoryStrategyId: str
    namespace: Optional[str] = None
    createdAt: Union[int, str, datetime]
    updatedAt: Optional[Union[int, str, datetime]] = None
    content: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class RetrieveRequest(BaseModel):
    """Request for retrieving memory records"""
    query: str
    namespace: str
    maxResults: Optional[int] = 10
    nextToken: Optional[str] = None


# --- Helper Functions ---

def _process_api_response(response_data: Dict[str, Any], item_key: str, model_class: type) -> List[BaseModel]:
    """
    DRY helper for processing API responses with validation

    Args:
        response_data: Raw API response
        item_key: Key in response containing the items array
        model_class: Pydantic model class for validation

    Returns:
        List of validated model instances
    """
    items = []
    for item_data in response_data.get(item_key, []):
        try:
            item = model_class.model_validate(item_data)
            items.append(item)
        except Exception as e:
            logger.warning(f"Skipping invalid {model_class.__name__}: {e}")
            continue
    return items


def _build_paginated_response(items: List[BaseModel], response_data: Dict[str, Any], items_key: str) -> Dict[str, Any]:
    """
    DRY helper for building paginated API responses

    Args:
        items: Validated items list
        response_data: Original API response
        items_key: Key name for items in response

    Returns:
        Standardized paginated response
    """
    return {
        items_key: items,
        'nextToken': response_data.get('nextToken')
    }


# --- API Endpoints ---

@app.get("/", response_class=HTMLResponse)
async def home(request: Request, v: Optional[str] = None):
    """Serve the main web interface with cache-busting"""
    # If no version parameter or wrong version, redirect to current UUID
    if not v or v != CACHE_BUST_UUID:
        return RedirectResponse(
            url=f"/?v={CACHE_BUST_UUID}",
            status_code=302,
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
        )

    # Serve the page with cache-busting UUID
    return templates.TemplateResponse("index.html", {
        "request": request,
        "cache_bust_uuid": CACHE_BUST_UUID
    })


@app.get("/api/memories")
async def list_memories() -> List[MemorySummary]:
    """List all available memories"""
    try:
        response = bedrock_control.list_memories()
        memories = []

        for memory_data in response.get('memories', []):
            # Parse each memory safely, using Pydantic's validation
            try:
                memory = MemorySummary.model_validate(memory_data)
                memories.append(memory)
            except Exception as e:
                logger.warning(f"Skipping invalid memory data: {e}")
                continue

        return memories

    except Exception as e:
        logger.error(f"Error listing memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memories/{memory_id}")
async def get_memory(memory_id: str) -> Memory:
    """Get detailed information about a specific memory"""
    try:
        response = bedrock_control.get_memory(memoryId=memory_id)
        memory_data = response['memory']

        # Parse strategies with validation
        strategies = []
        for strategy_data in memory_data.get('strategies', []):
            try:
                strategy = Strategy.model_validate(strategy_data)
                strategies.append(strategy)
            except Exception as e:
                logger.warning(f"Skipping invalid strategy: {e}")
                continue

        # Build the complete memory object
        memory_data['strategies'] = strategies
        return Memory.model_validate(memory_data)

    except bedrock_control.exceptions.ResourceNotFoundException:
        raise HTTPException(status_code=404, detail="Memory not found")
    except Exception as e:
        logger.error(f"Error getting memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memories/{memory_id}/events")
async def list_events(
    memory_id: str,
    session_id: str,
    actor_id: str,
    max_results: int = 50,
    next_token: Optional[str] = None
) -> Dict[str, Any]:
    """List events for a memory session"""
    try:
        params = {
            'memoryId': memory_id,
            'sessionId': session_id,
            'actorId': actor_id,
            'maxResults': max_results
        }

        if next_token:
            params['nextToken'] = next_token

        response = bedrock_data.list_events(**params)
        events = _process_api_response(response, 'events', EventSummary)
        return _build_paginated_response(events, response, 'events')

    except Exception as e:
        logger.error(f"Error listing events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/memories/{memory_id}/records")
async def list_memory_records(
    memory_id: str,
    namespace: str,
    memory_strategy_id: Optional[str] = None,
    max_results: int = 50,
    next_token: Optional[str] = None
) -> Dict[str, Any]:
    """List memory records in a namespace"""
    try:
        params = {
            'memoryId': memory_id,
            'namespace': namespace,
            'maxResults': max_results
        }

        if memory_strategy_id:
            params['memoryStrategyId'] = memory_strategy_id

        if next_token:
            params['nextToken'] = next_token

        response = bedrock_data.list_memory_records(**params)
        records = _process_api_response(response, 'memoryRecordSummaries', MemoryRecordSummary)
        return _build_paginated_response(records, response, 'records')

    except Exception as e:
        logger.error(f"Error listing records: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/memories/{memory_id}/retrieve")
async def retrieve_memory_records(
    memory_id: str,
    request: RetrieveRequest
) -> Dict[str, Any]:
    """Search and retrieve memory records"""
    try:
        params = {
            'memoryId': memory_id,
            'namespace': request.namespace,
            'searchCriteria': {'searchQuery': request.query},
            'maxResults': request.maxResults
        }

        if request.nextToken:
            params['nextToken'] = request.nextToken

        response = bedrock_data.retrieve_memory_records(**params)
        records = _process_api_response(response, 'memoryRecordSummaries', MemoryRecordSummary)
        return _build_paginated_response(records, response, 'records')

    except Exception as e:
        logger.error(f"Error retrieving records: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)