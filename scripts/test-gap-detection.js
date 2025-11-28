const fs = require('fs');
const path = require('path');

function convertWithGapDetection(jsonFile, gapThreshold) {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    let output = '';
    let phrases = [];
    let currentPhrase = [];

    data.notes.forEach((note, idx) => {
        if (note.isRest) {
            if (currentPhrase.length > 0) {
                phrases.push([...currentPhrase]);
                currentPhrase = [];
            }
        } else {
            // Check gap from previous note
            if (idx > 0) {
                const prevNote = data.notes[idx - 1];
                const prevEnd = prevNote.beat + prevNote.duration;
                const gap = note.beat - prevEnd;

                // If gap exceeds threshold, start new phrase
                if (gap >= gapThreshold && currentPhrase.length > 0) {
                    phrases.push([...currentPhrase]);
                    currentPhrase = [];
                }
            }

            // Format note
            let noteStr = note.sd;
            if (note.octave === 1) {
                noteStr += "'";
            } else if (note.octave === -1) {
                noteStr += ",";
            } else if (note.octave === -2) {
                noteStr += ",,";
            } else if (note.octave === 2) {
                noteStr += "''";
            }
            currentPhrase.push(noteStr);
        }
    });

    // Add final phrase
    if (currentPhrase.length > 0) {
        phrases.push(currentPhrase);
    }

    // Output phrases
    phrases.forEach((phrase, idx) => {
        output += phrase.join(' ');
        if (idx < phrases.length - 1) {
            output += ' (rest)';
        }
        output += '\n';
    });

    return output;
}

// Test different thresholds
const verseFile = path.join(__dirname, '../json/i-want-it-that-way/verse.json');
const thresholds = [0.5, 0.75, 1.0, 1.5, 2.0];

console.log('=== I WANT IT THAT WAY - VERSE ===\n');

thresholds.forEach(threshold => {
    console.log(`\n--- Gap Threshold: ${threshold} beats ---`);
    const result = convertWithGapDetection(verseFile, threshold);
    console.log(result);
    console.log(`Lines: ${result.split('\n').filter(l => l.trim()).length}`);
});
