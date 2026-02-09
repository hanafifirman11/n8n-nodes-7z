# n8n-nodes-7z

N8N custom node for 7z file extraction and compression with in-memory processing.

## ⚠️ Important: Docker/Kubernetes Users

**If you're running n8n in Docker or Kubernetes, you MUST install p7zip in your container** or the node will fail with "No 7z binary found" error.

**Quick Fix:**
```dockerfile
FROM n8nio/n8n:latest
USER root
RUN apk add --no-cache p7zip
USER node
```

See [Docker/Kubernetes Installation](#dockerkubernetes-n8n) section below for detailed instructions.

## Features

- **Extract 7z archives** directly from binary data
- **Compress files to 7z format** with password protection support
- **In-memory processing** for better performance and security
- **Password protection** support for both extraction and compression
- **Auto file type detection** for 80+ file formats
- **Multiple file handling** in a single archive
- **Smart fallback system** - automatically uses available libraries

## Smart Fallback System (New!)

This node automatically detects and uses available libraries:

1. **First choice**: `compressing` library (if available)
2. **Second choice**: `node-7z-archive` library (if available) 
3. **Third choice**: `node-7z` library
4. **Last resort**: System `7z` command

## Requirements

**Minimal**: n8n version 1.118.x or higher, Node.js 16.10 or higher

**For best compatibility**, ensure one of these is available:
- `compressing` library ✅ (Already in your environment!)
- `node-7z-archive` library ✅ (Already in your environment!)
- System `7z` command
- `node-7z` library (included)

### Installing 7z Command

#### Local Installation
- **Linux**: `sudo apt install p7zip-full` 
- **macOS**: `brew install p7zip`
- **Windows**: Install 7-Zip and add to PATH

#### Docker/Kubernetes N8N
If running N8N in Docker/Kubernetes, you need to ensure p7zip is installed in the container.

**Option 1: Custom Docker Image**
```dockerfile
FROM n8nio/n8n:latest
USER root
RUN apk add --no-cache p7zip
USER node
```

**Option 2: Init Container (Kubernetes)**
```yaml
apiVersion: v1
kind: Pod
spec:
  initContainers:
  - name: install-7z
    image: alpine:latest
    command: ['sh', '-c', 'apk add --no-cache p7zip && cp /usr/bin/7z /shared/']
    volumeMounts:
    - name: shared-tools
      mountPath: /shared
  containers:
  - name: n8n
    image: n8nio/n8n:latest
    env:
    - name: PATH
      value: "/shared:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
    volumeMounts:
    - name: shared-tools
      mountPath: /shared
  volumes:
  - name: shared-tools
    emptyDir: {}
```

**Option 3: Sidecar Container**
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: n8n
        image: n8nio/n8n:latest
        volumeMounts:
        - name: shared-bin
          mountPath: /usr/local/bin/7z
          subPath: 7z
      - name: tools-provider
        image: alpine:latest
        command: ['sh', '-c', 'apk add --no-cache p7zip && cp /usr/bin/7z /shared/ && sleep infinity']
        volumeMounts:
        - name: shared-bin
          mountPath: /shared
      volumes:
      - name: shared-bin
        emptyDir: {}
```

## Installation

### Community Nodes (Recommended)
1. Go to **Settings > Community Nodes** in your n8n instance
2. Install `n8n-nodes-7z`

### Manual Installation
```bash
# In your n8n installation directory
npm install n8n-nodes-7z
```

## Usage

### Extract Operation
- **Input Data Property**: Name of the binary property containing 7z archive data
- **Output Property Name**: Property name for extracted files results
- **Password**: Optional password for encrypted archives

### Compress Operation
- **Files to Compress**: List of files with their property names
- **Archive Name**: Output 7z archive filename
- **Password**: Optional password for archive encryption

## Example Workflow

1. **HTTP Request** to download 7z file
2. **7z Archive** node with Extract operation
3. **Process extracted files** as needed

## Node Properties

### Extract Mode
- Reads binary data from specified property
- Extracts all files to memory
- Returns file contents as binary data with metadata

### Compress Mode
- Takes multiple files from input properties
- Creates 7z archive in memory
- Returns compressed archive as binary data

## Requirements

- n8n version 1.118.x or higher
- Node.js 16.10 or higher

## License

MIT