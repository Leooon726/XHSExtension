function toggleDebugElements() {
    const debugElements = document.getElementById('debugElements');
    // Toggle the display property between 'none' and 'block'
    if (debugElements.style.display === 'none' || debugElements.style.display === '') {
        debugElements.style.display = 'block';
    } else {
        debugElements.style.display = 'none';
    }
    console.log('Toggled debug elements display property');
}