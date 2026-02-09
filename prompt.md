N8N Support 7z exctraction dan compression menggunakan nodejs

1. buat code dari node js untuk membuat function extract file 7z
   - Ekstraksi langsung dari binary/buffer tanpa write to disk
   - Gunakan library seperti `node-stream-zip`, `yauzl`, atau `7zip-wasm`
   - Input: Buffer/Stream dari 7z file
   - Output: Object berisi file contents dalam memory
2. buat code dari node js untuk membuat function compress file ke 7z
   - Implementasi function compress dengan parameter kustomisasi
3. buat agar bisa running di n8n, n8n gunakan version stable atau 1.118.x
   - Setup package.json dengan dependencies yang kompatibel n8n
4. Upload package ke community 
   - Build dan publish ke npm registry
5. jalankan n8n di local docker
   - Setup container untuk testing
6. lakukan instalation package n8n-nodes-7z di n8n local docker
   - Install custom node di environment n8n

## CLI Commands/Reference

### Node.js/NPM Commands
```bash
# Initialize package
npm init -y

# Install dependencies (in-memory processing)
npm install 7zip-wasm yauzl node-stream-zip

# Build package
npm run build

# Publish to npm
npm publish
```

### N8N Commands & Installation
```bash
# Install custom node di n8n (version 1.118.x)
npm install n8n-nodes-7z

# atau via n8n community nodes
# Gunakan GUI n8n untuk install community node
```

### Docker Commands (N8N Local)
```bash
# Run n8n dengan docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n:1.118.x

# Access n8n di http://localhost:5678
```

### 7z CLI (untuk testing/reference)
```bash
# Extract 7z file
7z x archive.7z

# Create 7z archive
7z a archive.7z file1.txt file2.txt

# List contents
7z l archive.7z
```