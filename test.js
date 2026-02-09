// Simple test to verify basic functionality
console.log('Testing 7z node creation...');

// Test that the node structure is valid
try {
    const fs = require('fs');
    const path = require('path');
    
    console.log('✓ Node.js modules available');
    
    // Check if node file exists
    const nodeFile = path.join(__dirname, 'nodes', 'SevenZ', 'SevenZ.node.ts');
    if (fs.existsSync(nodeFile)) {
        console.log('✓ Node TypeScript file exists');
    } else {
        console.log('✗ Node TypeScript file missing');
    }
    
    // Check if package.json is valid
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
    if (packageJson.n8n && packageJson.n8n.nodes) {
        console.log('✓ Package.json has valid n8n configuration');
    } else {
        console.log('✗ Package.json missing n8n configuration');
    }
    
    console.log('\nNode structure verification complete!');
    
} catch (error) {
    console.error('Error during test:', error.message);
}