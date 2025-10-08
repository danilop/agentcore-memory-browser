# AgentCore Memory Browser

A web interface for browsing and exploring Amazon Bedrock AgentCore Memory resources. This application provides a user-friendly way to interact with AgentCore Memory data through both control plane and data plane APIs.

[![Watch the video](https://img.youtube.com/vi/0tDpugivB4U/maxresdefault.jpg)](https://www.youtube.com/watch?v=0tDpugivB4U)

For more information on these implementaitons, see this blog post series:

[Visualizing AI Agent Memory: Building a Web Browser for Amazon Bedrock AgentCore Memory](https://dev.to/aws/visualizing-ai-agent-memory-building-a-web-browser-for-amazon-bedrock-agentcore-memory-3571)

![AgentCore Memory Browser Interface](https://img.shields.io/badge/Python-3.13+-blue.svg) ![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock-orange.svg) ![FastAPI](https://img.shields.io/badge/Framework-FastAPI-green.svg)

## Features

- **Memory Overview**: Browse all available AgentCore Memory resources with metadata
- **Strategy-Specific Operations**: Each memory strategy has its own dedicated operations interface
- **Smart Namespace Handling**: Automatically substitutes strategy IDs in namespace templates with editable paths
- **Event Listing**: List events for specific sessions and actors
- **Memory Records**: Browse memory records by namespace with persistent user edits
- **Memory Retrieval**: Search and retrieve memory records with queries
- **Copy Functionality**: Quick copy buttons for Memory IDs, ARNs, and namespace values
- **Interactive UI**: Modern FastAPI backend with responsive Bootstrap frontend
- **JSON Viewer**: Auto-expanding JSON viewer with tree view and syntax highlighting
- **Security**: HTML escaping for user content to prevent code injection

## Prerequisites

- Python 3.13+
- AWS CLI configured with proper credentials
- AWS permissions for:
  - `bedrock-agentcore-control:ListMemories`
  - `bedrock-agentcore-control:GetMemory`
  - `bedrock-agentcore:ListEvents`
  - `bedrock-agentcore:ListMemoryRecords`
  - `bedrock-agentcore:RetrieveMemoryRecords`

## Installation

### Option 1: Global Tool Installation (Recommended)

Install as a global command-line tool using uv:

**From GitHub repository:**
```bash
uv tool install git+https://github.com/danilop/agentcore-memory-browser.git
```

**From local directory (if you have the source):**
```bash
uv tool install .
```

Then run anywhere with:
```bash
agentcore-memory-browser
```

### Option 2: Local Development Setup
1. Clone the repository:
```bash
git clone https://github.com/danilop/agentcore-memory-browser.git
cd agentcore-memory-browser
```

2. Install dependencies using uv:
```bash
uv sync
```

## Usage

### Global Tool (if installed with uv tool install)
```bash
agentcore-memory-browser
```

### Local Development

**Option A: Direct Python execution**
```bash
uv run python main.py
```

**Option B: Using project script name**
```bash
uv run agentcore-memory-browser
```

The application will automatically open in your browser at `http://localhost:8000`

## Application Structure

### Main Interface
1. **Sidebar**: Memory selection dropdown showing all available memories
2. **Memory Overview**: Displays selected memory metadata and status with expandable details
3. **Memory Strategies**: Tabbed interface showing each strategy with:
   - Strategy details (status, type, description)
   - Available namespaces
   - Strategy-specific memory operations

### Strategy-Specific Memory Operations

Each strategy tab contains three operation sub-tabs:

#### 1. List Events
- **Purpose**: List events for specific sessions and actors
- **Requirements**: Session ID, Actor ID
- **Configuration**: Result limit (1-100)

#### 2. List Memory Records
- **Purpose**: Browse all memory records in a namespace
- **Requirements**: Namespace path (pre-filled with strategy ID, editable)
- **Configuration**: Result limit (1-100)
- **Note**: Replace `{actorId}` and `{sessionId}` placeholders with actual values

#### 3. Retrieve Memory Records
- **Purpose**: Search memory records using queries
- **Requirements**: Namespace path and search query
- **Configuration**: Result limit (1-50)
- **Note**: Replace `{actorId}` and `{sessionId}` placeholders with actual values

## API Structure

The application uses two main AWS service clients:

### Control Plane APIs (`bedrock-agentcore-control`)
- `list_memories()`: Get all memory resources
- `get_memory(memory_id)`: Get detailed memory information

### Data Plane APIs (`bedrock-agentcore`)
- `list_events()`: List events for a memory
- `list_memory_records()`: List memory records by namespace
- `retrieve_memory_records()`: Search memory records with queries

## Configuration

### AWS Credentials
Ensure your AWS credentials are configured via:
- AWS CLI: `aws configure`
- Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- IAM roles (if running on EC2)

### Region
The application uses your default AWS region. Set it with:
```bash
export AWS_DEFAULT_REGION=us-east-1
```

## Development

### Project Structure
```
agentcore-memory-browser/
├── backend.py                   # FastAPI backend application
├── main.py                      # Application runner
├── templates/
│   └── index.html              # Main web interface
├── static/
│   ├── css/
│   │   └── styles.css          # Custom styling
│   └── js/
│       └── app.js              # JavaScript application logic
├── pyproject.toml              # Dependencies and configuration
└── README.md                   # This file
```

### Dependencies
- `fastapi`: Modern web framework for building APIs
- `uvicorn`: ASGI server for FastAPI
- `jinja2`: Templating engine for HTML rendering
- `boto3`: AWS SDK for Python
- `python-multipart`: For handling form data

### API Endpoints
- `GET /`: Main web interface
- `GET /api/health`: Health check
- `GET /api/memories`: List all memories
- `GET /api/memories/{id}`: Get memory details
- `GET /api/memories/{id}/events`: List memory events
- `GET /api/memories/{id}/records`: List memory records
- `POST /api/memories/{id}/retrieve`: Retrieve memory records with query

## Troubleshooting

### Common Issues

1. **No memories found**: Verify AWS credentials and permissions for AgentCore services
2. **Region errors**: Ensure you're in the correct AWS region where AgentCore Memory is configured
3. **Permission denied**: Check IAM permissions for AgentCore services
4. **Validation errors**: Replace placeholder values (`{actorId}`, `{sessionId}`) with actual values in namespace fields
5. **Connection errors**: Verify network connectivity to AWS
6. **Port already in use**: Change the port in `main.py` if 8000 is occupied

### Debug Mode
View server logs in the terminal when running the application. FastAPI provides detailed error messages and request logging.

## License

This project is licensed under the MIT License.
