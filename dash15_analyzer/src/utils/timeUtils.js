
// Parse time string to seconds
// Supports formats: "MM:SS", "HH:MM:SS", "D.HH:MM:SS"
// Also supports Turkish output format: "1g 5s 10dk", "12dk 34sn"
export const timeToSeconds = (t) => {
    if (!t) return 0;

    // Clean string (remove (Avg.), (Total), whitespace)
    const cleanT = t.toString().replace(/\s*\(.*?\)/g, '').trim();

    // Check for Turkish format: "1g 5s 10dk", "12dk 34sn", etc.
    if (cleanT.includes('dk') || cleanT.includes('sn') || cleanT.includes('g') || cleanT.includes('s ')) {
        let totalSeconds = 0;

        const daysMatch = cleanT.match(/(\d+)g/);
        if (daysMatch) totalSeconds += parseInt(daysMatch[1], 10) * 86400;

        const hoursMatch = cleanT.match(/(\d+)s\s/); // 's ' to distinguish from 'sn'
        if (hoursMatch) totalSeconds += parseInt(hoursMatch[1], 10) * 3600;

        const minutesMatch = cleanT.match(/(\d+)dk/);
        if (minutesMatch) totalSeconds += parseInt(minutesMatch[1], 10) * 60;

        const secondsMatch = cleanT.match(/(\d+)sn/);
        if (secondsMatch) totalSeconds += parseInt(secondsMatch[1], 10);

        return totalSeconds;
    }

    // Check for Day format: "7.07:45:01" (Days.Hours:Minutes:Seconds)
    if (cleanT.includes('.')) {
        const parts = cleanT.split('.');
        if (parts.length === 2) {
            const days = parseInt(parts[0], 10);
            const timePart = parts[1];
            const timeParts = timePart.split(':').map(Number);

            if (timeParts.length === 3) {
                return (days * 86400) + (timeParts[0] * 3600) + (timeParts[1] * 60) + timeParts[2];
            }
        }
    }

    // Standard formats: HH:MM:SS or MM:SS
    const p = cleanT.split(':').map(Number);
    if (p.length === 3) {
        return p[0] * 3600 + p[1] * 60 + p[2];
    } else if (p.length === 2) {
        return p[0] * 60 + p[1];
    }

    return 0;
};

// Format seconds to readable string
export const secondsToTime = (s) => {
    if (isNaN(s) || s === null) return '0dk 0sn';

    const days = Math.floor(s / 86400);
    s %= 86400;
    const hours = Math.floor(s / 3600);
    s %= 3600;
    const minutes = Math.floor(s / 60);
    const seconds = Math.floor(s % 60);

    if (days > 0) {
        return `${days}g ${hours}s ${minutes}dk`;
    }
    if (hours > 0) {
        return `${hours}s ${minutes}dk ${seconds}sn`;
    }
    return `${minutes}dk ${seconds}sn`;
};
