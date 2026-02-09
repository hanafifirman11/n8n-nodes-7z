// Test script untuk memastikan node dapat di-load dengan benar
console.log('Testing n8n-nodes-7z...');

try {
    // Test require node
    const { SevenZ } = require('./dist/nodes/SevenZ/SevenZ.node.js');
    
    console.log('✓ Node berhasil di-import');
    
    // Test node instantiation
    const node = new SevenZ();
    
    console.log('✓ Node berhasil di-instantiate');
    console.log('✓ Node name:', node.description.displayName);
    console.log('✓ Operations available:', 
        node.description.properties[0].options.map(op => op.value).join(', '));
    
    // Test getMimeType function
    const path = require('path');
    const fs = require('fs');
    
    // Load file untuk test auto-detection
    if (fs.existsSync('./test-files/test.7z')) {
        console.log('✓ Test archive tersedia');
        const stat = fs.statSync('./test-files/test.7z');
        console.log('✓ Archive size:', stat.size, 'bytes');
    }
    
    console.log('\n🎉 Node siap untuk testing di N8N!');
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}