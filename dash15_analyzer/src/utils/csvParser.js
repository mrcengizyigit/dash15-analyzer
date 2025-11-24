import Papa from 'papaparse';

export const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        let extractedDate = null;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            beforeFirstChunk: (chunk) => {
                // Extract date from 2nd line
                const lines = chunk.split('\n');
                if (lines.length > 1) {
                    const timeRangeLine = lines[1]; // "Time Range:11/04/2025~11/04/2025"
                    const match = timeRangeLine.match(/Time Range:(\d{2}\/\d{2}\/\d{4})/);
                    if (match) {
                        // Convert MM/DD/YYYY to YYYY-MM-DD
                        const [_, dateStr] = match;
                        const [month, day, year] = dateStr.split('/');
                        extractedDate = `${year}-${month}-${day}`;
                    }
                }
                // İlk iki satırı (başlık bilgilerini) atla
                return lines.slice(2).join('\n');
            },
            complete: (results) => {
                resolve({ data: results.data, date: extractedDate });
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};

const cleanValue = (val) => {
    if (!val) return '';
    // Remove (Avg.), (Total) and trim
    return val.toString().replace(/\s*\(.*?\)/g, '').trim();
};

export const mergeData = (performanceData, ratingData) => {
    const merged = {};

    const processRow = (row, type) => {
        const agentName = row['Agent'];
        // Filter out summary rows or rows with empty agent names
        if (!agentName || agentName.trim() === '' || agentName.includes('Total') || agentName.includes('Average')) return;

        if (!merged[agentName]) {
            merged[agentName] = {
                Agent: agentName,
                Chats: 0,
                AvgChatTime: '00:00:00',
                TotalChatTime: '00:00:00',
                AvgScore: 0,
                RatingTimes: 0,
                Score5: 0,
                Score4: 0,
                Score3: 0,
                Score2: 0,
                Score1: 0,
            };
        }

        if (type === 'performance' || type === 'both') {
            if (row['Chats']) merged[agentName].Chats = parseInt(cleanValue(row['Chats']) || '0', 10);
            if (row['Avg. Chat Time']) merged[agentName].AvgChatTime = cleanValue(row['Avg. Chat Time']) || '00:00:00';
            if (row['Total Chat Time']) merged[agentName].TotalChatTime = cleanValue(row['Total Chat Time']) || '00:00:00';
            if (row['Last Message Sent by Agent']) merged[agentName].LastMessage = cleanValue(row['Last Message Sent by Agent']) || '';
        }

        if (type === 'rating' || type === 'both') {
            if (row['Avg. Score']) merged[agentName].AvgScore = parseFloat(cleanValue(row['Avg. Score']) || '0');
            if (row['Rating Times']) merged[agentName].RatingTimes = parseInt(cleanValue(row['Rating Times']) || '0', 10);
            if (row['Score 5']) merged[agentName].Score5 = parseInt(cleanValue(row['Score 5']) || '0', 10);
            if (row['Score 4']) merged[agentName].Score4 = parseInt(cleanValue(row['Score 4']) || '0', 10);
            if (row['Score 3']) merged[agentName].Score3 = parseInt(cleanValue(row['Score 3']) || '0', 10);
            if (row['Score 2']) merged[agentName].Score2 = parseInt(cleanValue(row['Score 2']) || '0', 10);
            if (row['Score 1']) merged[agentName].Score1 = parseInt(cleanValue(row['Score 1']) || '0', 10);
        }
    };

    // Check if we are merging the same dataset (single file case)
    if (performanceData === ratingData) {
        performanceData.forEach(row => processRow(row, 'both'));
    } else {
        performanceData.forEach(row => processRow(row, 'performance'));
        ratingData.forEach(row => processRow(row, 'rating'));
    }

    return Object.values(merged).sort((a, b) => b.Chats - a.Chats);
};
