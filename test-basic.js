// Basic test tanpa n8n dependencies
console.log('Testing basic node structure...');

// Mock n8n-workflow 
const mockWorkflow = {
    NodeOperationError: class NodeOperationError extends Error {
        constructor(node, message, options) {
            super(message);
            this.name = 'NodeOperationError';
        }
    }
};

// Mock require untuk n8n-workflow
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
    if (id === 'n8n-workflow') {
        return mockWorkflow;
    }
    return originalRequire.apply(this, arguments);
};

try {
    const { SevenZ } = require('./dist/nodes/SevenZ/SevenZ.node.js');
    
    console.log('✓ Node structure valid');
    
    const node = new SevenZ();
    console.log('✓ Node instantiation successful');
    console.log('✓ Display name:', node.description.displayName);
    console.log('✓ Node version:', node.description.version);
    console.log('✓ Available operations:', 
        node.description.properties[0].options.map(op => op.name).join(', '));
    
    // Test getMimeType function (yang ada di file)
    const fs = require('fs');
    const content = fs.readFileSync('./dist/nodes/SevenZ/SevenZ.node.js', 'utf8');
    
    if (content.includes('getMimeType')) {
        console.log('✓ getMimeType function included');
    }
    
    if (content.includes('path7za || sevenBin.path7z')) {
        console.log('✓ 7zip-bin fallback logic implemented');
    }
    
    console.log('\n🎉 Basic node structure is valid!');
    console.log('📦 Ready for N8N testing');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}