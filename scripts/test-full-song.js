const fs = require('fs');
const path = require('path');

function convertWithGapDetection(jsonFiles, gapThreshold) {
    let output = '';

    jsonFiles.forEach(({file, sectionName}) => {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));

        output += `=== ${sectionName} ===\n`;

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

        output += '\n';
    });

    return output.trim();
}

// Test with i-want-it-that-way
const songDir = path.join(__dirname, '../json/i-want-it-that-way');
const files = [
    { file: path.join(songDir, 'verse.json'), sectionName: 'VERSE' },
    { file: path.join(songDir, 'chorus.json'), sectionName: 'CHORUS' }
];

const thresholds = [0.5, 0.75, 1.0, 1.5, 2.0];

thresholds.forEach(threshold => {
    const result = convertWithGapDetection(files, threshold);
    const outputFile = path.join(__dirname, `../melody/i-want-it-that-way-test-${threshold}.txt`);
    fs.writeFileSync(outputFile, result);
    console.log(`\n=== Created i-want-it-that-way-test-${threshold}.txt ===`);
    console.log(result);
    console.log('\n' + '='.repeat(60));
});
