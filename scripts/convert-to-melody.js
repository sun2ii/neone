const fs = require('fs');
const path = require('path');

function convertJsonToMelody(jsonFiles, gapThreshold = 0.5) {
    let output = '';

    jsonFiles.forEach(({file, sectionName}) => {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));

        output += `=== ${sectionName} ===\n`;

        // Group notes by phrases (separated by rests or gaps)
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
                if (idx > 0 && currentPhrase.length > 0) {
                    const prevNote = data.notes[idx - 1];
                    if (!prevNote.isRest) {
                        const prevEnd = prevNote.beat + prevNote.duration;
                        const gap = note.beat - prevEnd;

                        // If gap exceeds threshold, start new phrase
                        if (gap >= gapThreshold) {
                            phrases.push([...currentPhrase]);
                            currentPhrase = [];
                        }
                    }
                }

                // Format: sd with octave marker if needed
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

        // Don't forget last phrase if no trailing rest
        if (currentPhrase.length > 0) {
            phrases.push(currentPhrase);
        }

        // Output each phrase on its own line
        phrases.forEach((phrase, idx) => {
            output += phrase.join(' ');
            // Add (rest) marker except for last phrase
            if (idx < phrases.length - 1) {
                output += ' (rest)';
            }
            output += '\n';
        });

        output += '\n';
    });

    return output.trim();
}

// Auto-discover all songs in json/ directory
const jsonDir = path.join(__dirname, '../json');
const melodyDir = path.join(__dirname, '../melody');
const doneDir = path.join(__dirname, '../done');

// Ensure done directory exists
if (!fs.existsSync(doneDir)) {
    fs.mkdirSync(doneDir, { recursive: true });
}

const songs = fs.readdirSync(jsonDir)
    .filter(f => {
        const fullPath = path.join(jsonDir, f);
        return fs.statSync(fullPath).isDirectory() && f !== 'done';
    });

songs.forEach(songName => {
    const songDir = path.join(jsonDir, songName);

    // Define section order priority
    const sectionOrder = ['verse', 'chorus', 'lead-out', 'bridge'];

    const files = fs.readdirSync(songDir)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => {
            // Sort by section order priority
            const aBase = path.basename(a, '.json').toLowerCase();
            const bBase = path.basename(b, '.json').toLowerCase();

            const aIndex = sectionOrder.findIndex(s => aBase.includes(s));
            const bIndex = sectionOrder.findIndex(s => bBase.includes(s));

            // If both found in priority list, sort by priority
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            // If only one found, prioritize it
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            // Otherwise alphabetical
            return a.localeCompare(b);
        })
        .map(f => {
            // Convert filename to section name
            const basename = path.basename(f, '.json');
            const sectionName = basename
                .split('-')
                .map(word => word.toUpperCase())
                .join(' ');

            return {
                file: path.join(songDir, f),
                sectionName
            };
        });

    const result = convertJsonToMelody(files);
    const outputFile = path.join(melodyDir, `${songName}.txt`);
    fs.writeFileSync(outputFile, result);
    console.log(`Created ${songName}.txt`);

    // Move processed folder to done/
    const doneFolder = path.join(doneDir, songName);
    fs.renameSync(songDir, doneFolder);
    console.log(`Moved json/${songName} → done/${songName}`);
});
